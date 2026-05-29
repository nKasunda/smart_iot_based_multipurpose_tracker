require("dotenv").config();
const express = require("express");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const http = require("http");
const { sequelize, Tracker, Location } = require("./models");
const { ensureSchema } = require("./services/schema");
const authRoutes = require("./routes/auth.routes");
const trackerRoutes = require("./routes/tracker.routes");
const v1Routes = require("./routes/v1.routes");
const adminRoutes = require("./routes/admin.routes");
const userRoutes = require("./routes/user.routes");
const cors = require("cors");
const app = express();
const TRACKER_ONLINE_WINDOW_MS = Number(process.env.TRACKER_ONLINE_WINDOW_MS || 2 * 60 * 1000);

const isTrackerOnline = (lastSeen, now = Date.now()) => {
  if (!lastSeen) return false;
  const time = new Date(lastSeen).getTime();
  return Number.isFinite(time) && now - time < TRACKER_ONLINE_WINDOW_MS;
};

const isValidGpsCoordinate = (lat, lng) => {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  return !(Math.abs(lat) < 0.000001 && Math.abs(lng) < 0.000001);
};

const isHosted = process.env.RENDER || process.env.NODE_ENV === "production";
const hasDatabaseConfig =
  !!process.env.DATABASE_URL ||
  ["DB_HOST", "DB_NAME", "DB_USER", "DB_PASS"].every((key) => !!process.env[key]);

if (isHosted && !hasDatabaseConfig) {
  throw new Error(
    "Database configuration missing. Set DATABASE_URL to your Neon connection string, or set DB_HOST, DB_NAME, DB_USER, and DB_PASS."
  );
}

// Running behind ngrok / reverse proxies sends `X-Forwarded-For`.
// Express must trust the proxy so rate limiting and `req.ip` work correctly.
app.set("trust proxy", 1);

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 min
  max: 100, // 100 req/min per IP
  message: "Too many GPS pings, slow down!",
  standardHeaders: true,
  legacyHeaders: false,
});

// Socket.io setup
const server = http.createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: process.env.SOCKET_CORS_ORIGIN || process.env.FRONTEND_URL || "*",
    credentials: !!process.env.SOCKET_CORS_CREDENTIALS,
  },
});
app.set("io", io); // make io accessible in controllers

// Socket auth: clients should pass { auth: { token } } or Authorization header.
const jwt = require("jsonwebtoken");
const DEVELOPER_API_AUDIENCE = "tda-v1";
io.use((socket, next) => {
  try {
    const header = socket.handshake.headers?.authorization || "";
    const bearerToken = header.startsWith("Bearer ") ? header.slice(7) : null;
    const token = socket.handshake.auth?.token || bearerToken;
    if (!token) return next(new Error("unauthorized"));

    const secret = process.env.JWT_SECRET;
    if (!secret) return next(new Error("JWT_SECRET not set"));
    let payload;
    try {
      payload = jwt.verify(token, secret, { audience: DEVELOPER_API_AUDIENCE });
    } catch {
      payload = jwt.verify(token, secret);
    }
    socket.user = payload;

    const tokenType = payload.t || payload.type;
    const tokenDeviceId = payload.did || payload.device_id;
    const tokenScopes = Array.isArray(payload.scp)
      ? payload.scp
      : Array.isArray(payload.scopes)
        ? payload.scopes
        : [];

    if (["dev", "developer-api"].includes(tokenType) && tokenDeviceId) {
      if (!tokenScopes.includes("live") && !tokenScopes.includes("tracker:live:read")) {
        console.warn("Socket auth failure: missing live scope", { device_id: tokenDeviceId });
        return next(new Error("unauthorized"));
      }
      socket.data.developerDeviceId = String(tokenDeviceId);
      socket.join(String(tokenDeviceId));
      console.log("Developer socket connected", { device_id: tokenDeviceId, socket_id: socket.id });
      return next();
    }

    socket.join(`user:${payload.id}`);
    if (payload.role === "admin") socket.join("admin");
    return next();
  } catch (err) {
    return next(new Error("unauthorized"));
  }
});

io.on("connection", async (socket) => {
  const deviceId = socket.data?.developerDeviceId;
  if (!deviceId) return;

  try {
    const tracker = await Tracker.findOne({ where: { device_uid: deviceId } });
    const rows = tracker
      ? await Location.findAll({
          where: { device_id: tracker.device_uid },
          attributes: ["device_id", "lat", "lng", "speed", "battery", "timestamp"],
          order: [["timestamp", "DESC"]],
          limit: 50,
        })
      : [];
    const loc = rows.find((row) => isValidGpsCoordinate(Number(row.lat), Number(row.lng))) || null;

    if (!tracker || !loc) return;
    const online = isTrackerOnline(tracker.lastSeen);

    socket.emit("location:update", {
      event: "location:update",
      v: 1,
      replay: true,
      device_id: tracker.device_uid,
      imei: tracker.imei ?? null,
      name: tracker.name ?? null,
      lat: loc.lat,
      lng: loc.lng,
      battery: online ? loc.battery ?? tracker.battery ?? null : null,
      signal: online ? tracker.signalStrength ?? null : null,
      signalStrength: online ? tracker.signalStrength ?? null : null,
      speed: loc.speed ?? 0,
      timestamp: loc.timestamp ? new Date(loc.timestamp).toISOString() : null,
      lastSeen: tracker.lastSeen ? new Date(tracker.lastSeen).toISOString() : null,
      online,
    });
  } catch (err) {
    console.error("Socket replay failed", { device_id: deviceId, error: err.message });
  }
});

app.use(helmet());

const corsOptions = {
  origin: process.env.CORS_ORIGIN || process.env.FRONTEND_URL || "*",
  credentials: !!process.env.CORS_CREDENTIALS,
};
app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
// Some SMS forwarder apps send `application/x-www-form-urlencoded` bodies.
// Accept both JSON and urlencoded to avoid `req.body` being undefined.
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/user", userRoutes);
app.use("/api/v1", v1Routes);
app.use("/api/tracker/ingest", limiter);
app.use("/api/tracker", trackerRoutes);

app.get("/health", async (req, res) => {
  const payload = {
    status: "OK",
    timestamp: new Date(),
    database: "unknown",
  };

  try {
    await sequelize.authenticate();
    payload.database = "connected";
    return res.status(200).json(payload);
  } catch (err) {
    payload.status = "DEGRADED";
    payload.database = "error";
    payload.error = process.env.HEALTH_VERBOSE === "true" ? err.message : "Database connection failed";
    return res.status(503).json(payload);
  }
});

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || "0.0.0.0";

server.listen(PORT, HOST, async () => {
  console.log(`Server running on port ${PORT}`);
  try {
    await sequelize.authenticate();
    console.log("Database connected!");
    await ensureSchema(sequelize);
  } catch (err) {
    console.error("DB connection error:", err);
  }
});
