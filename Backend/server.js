require("dotenv").config();
const express = require("express");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const http = require("http");
const { sequelize } = require("./models");
const { ensureSchema } = require("./services/schema");
const authRoutes = require("./routes/auth.routes");
const trackerRoutes = require("./routes/tracker.routes");
const adminRoutes = require("./routes/admin.routes");
const userRoutes = require("./routes/user.routes");
const cors = require("cors");
const app = express();

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
io.use((socket, next) => {
  try {
    const header = socket.handshake.headers?.authorization || "";
    const bearerToken = header.startsWith("Bearer ") ? header.slice(7) : null;
    const token = socket.handshake.auth?.token || bearerToken;
    if (!token) return next(new Error("unauthorized"));

    const secret = process.env.JWT_SECRET;
    if (!secret) return next(new Error("JWT_SECRET not set"));
    const payload = jwt.verify(token, secret);
    socket.user = payload;
    socket.join(`user:${payload.id}`);
    if (payload.role === "admin") socket.join("admin");
    return next();
  } catch (err) {
    return next(new Error("unauthorized"));
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
app.use("/api/tracker/ingest", limiter);
app.use("/api/tracker", trackerRoutes);

app.get("/health", (req, res) =>
  res.status(200).json({ status: "OK", timestamp: new Date() })
);

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
