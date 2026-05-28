const { Tracker, Location, User } = require("../models");
const { Op } = require("sequelize");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const DEVELOPER_API_AUDIENCE = "tracka-developer-api";

const apiError = (res, status, error, message) => res.status(status).json({ error, message, status });

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return secret;
}

const buildAccessWhere = (user) => {
  if (!user || user.role === "admin") return {};
  return {
    userId: user.id,
  };
};

/**
 * Normalize tracker identifiers
 */
const normalizeTrackerKey = (value) => {
  if (!value) return null;

  let text = String(value).trim();
  if (!text) return null;

  text = text.toUpperCase();
  text = text.replace(/^ID[:=]?/i, "").trim();

  return text.startsWith("TRK-") ? text : `TRK-${text}`;
};

const resolveTrackerByAnyId = async (rawId) => {
  if (!rawId) return null;
  const id = String(rawId).trim();
  if (!id) return null;

  const byUid = await Tracker.findOne({ where: { device_uid: id } });
  if (byUid) return byUid;

  const byImei = await Tracker.findOne({ where: { imei: id } });
  if (byImei) return byImei;

  const normalized = normalizeTrackerKey(id);
  if (normalized) {
    const byNorm = await Tracker.findOne({
      where: {
        device_uid: {
          [Op.in]: [normalized, normalized.replace(/^TRK-/, "")],
        },
      },
    });
    if (byNorm) return byNorm;
  }

  return null;
};

const buildBaseUrl = (req) => `${req.protocol}://${req.get("host")}`;

const signDeveloperToken = ({ userId, deviceId }) => jwt.sign(
  {
    type: "developer-api",
    aud: DEVELOPER_API_AUDIENCE,
    sub: String(userId),
    device_id: deviceId,
    scopes: ["tracker:telemetry:write", "tracker:latest:read", "tracker:history:read", "tracker:live:read"],
  },
  getJwtSecret(),
  { expiresIn: process.env.DEVELOPER_API_TOKEN_EXPIRES_IN || "365d" }
);

const getDeveloperAccess = async (req, options = {}) => {
  const expectedDeviceId = options.deviceId ? String(options.deviceId).trim() : "";
  const requiredScope = options.scope;
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    console.warn("Developer API auth failure: missing bearer token", { device_id: expectedDeviceId || null });
    return { error: "UNAUTHORIZED", message: "Missing developer API key.", status: 401 };
  }

  let payload;
  try {
    payload = jwt.verify(token, getJwtSecret(), { audience: DEVELOPER_API_AUDIENCE });
  } catch {
    console.warn("Developer API auth failure: invalid token", { device_id: expectedDeviceId || null });
    return { error: "UNAUTHORIZED", message: "Developer API key is invalid or expired.", status: 401 };
  }

  if (payload.type !== "developer-api" || !payload.device_id) {
    return { error: "FORBIDDEN", message: "This API key cannot access tracker developer endpoints.", status: 403 };
  }

  if (expectedDeviceId && String(payload.device_id) !== expectedDeviceId) {
    console.warn("Developer API device mismatch", {
      token_device_id: payload.device_id,
      requested_device_id: expectedDeviceId,
    });
    return { error: "DEVICE_SCOPE_MISMATCH", message: "API key device_id does not match the requested device.", status: 403 };
  }

  if (requiredScope && (!Array.isArray(payload.scopes) || !payload.scopes.includes(requiredScope))) {
    return { error: "INSUFFICIENT_SCOPE", message: `API key requires ${requiredScope} scope.`, status: 403 };
  }

  const tracker = await resolveTrackerByAnyId(payload.device_id);
  if (!tracker) return { error: "NOT_FOUND", message: "Tracker linked to this API key was not found.", status: 404 };

  const userId = Number(payload.sub);
  if (tracker.userId !== userId) {
    return { error: "FORBIDDEN", message: "This API key no longer has access to this tracker.", status: 403 };
  }

  return { tracker, payload };
};

const sendAccessError = (res, access) => apiError(res, access.status, access.error, access.message);

const parseRequiredTimestamp = (value) => {
  if (!value) return null;
  const date = new Date(String(value));
  if (!Number.isFinite(date.getTime())) return null;
  return date;
};

const telemetryResponse = ({ tracker, loc }) => ({
  device_id: tracker.device_uid,
  imei: tracker.imei ?? null,
  name: tracker.name ?? null,
  lat: loc?.lat ?? null,
  lng: loc?.lng ?? null,
  battery: loc?.battery ?? tracker.battery ?? null,
  signal: tracker.signalStrength ?? null,
  speed: loc?.speed ?? 0,
  timestamp: loc?.timestamp ? new Date(loc.timestamp).toISOString() : null,
});

const cleanImei = (value) => {
  if (value === undefined || value === null) return null;

  const text = String(value)
    .trim()
    .replace(/^IMEI[:=]?/i, "")
    .trim();

  return text || null;
};

const makeSecretKey = (value) => {
  if (!value) return null;
  const text = String(value).trim();
  if (!text) return null;

  for (const encoding of ["base64", "hex"]) {
    try {
      const decoded = Buffer.from(text, encoding);
      if (decoded.length === 32) return decoded;
    } catch {
      // try next format
    }
  }

  return crypto.createHash("sha256").update(text, "utf8").digest();
};

const decryptAesGcmPayload = (envelope, secret) => {
  const key = makeSecretKey(secret);
  if (!key) return null;

  const iv = Buffer.from(envelope.iv || envelope.nonce || "", "base64");
  const tag = Buffer.from(envelope.tag || envelope.authTag || "", "base64");
  const cipherText = Buffer.from(envelope.payload || envelope.ciphertext || envelope.data || "", "base64");

  if (!iv.length || !tag.length || !cipherText.length) return null;

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(cipherText), decipher.final()]);
  return decrypted.toString(envelope.encoding || "utf8");
};

const maybeDecryptPayload = async (body) => {
  const envelope = typeof body === "string" ? normalizePayload(body) : body;
  if (!envelope || typeof envelope !== "object") return body;

  const encryption = String(envelope.encryption || envelope.alg || "").toLowerCase();
  const isEncrypted =
    encryption === "aes-256-gcm" ||
    encryption === "a256gcm" ||
    envelope.encrypted === true;

  if (!isEncrypted) return body;

  const keyCandidates = [];
  const kid = envelope.kid || envelope.device_id || envelope.device_uid || envelope.imei;
  const tracker = kid ? await resolveTrackerByAnyId(kid) : null;
  if (tracker?.ingestToken) keyCandidates.push(tracker.ingestToken);
  if (process.env.TRACKER_INGEST_ENCRYPTION_KEY) {
    keyCandidates.push(process.env.TRACKER_INGEST_ENCRYPTION_KEY);
  }

  for (const secret of keyCandidates) {
    try {
      const decrypted = decryptAesGcmPayload(envelope, secret);
      const parsed = normalizePayload(decrypted);
      if (parsed) return parsed;
    } catch {
      // keep trying supported keys
    }
  }

  return null;
};

const extractImeiFromPayload = (payload) => {
  const direct = cleanImei(payload?.imei || payload?.IMEI);
  if (direct) return direct;

  const message = payload?.message || payload?.sms || payload?.text;
  if (typeof message !== "string") return null;

  const match = message.match(/\bIMEI\s*[:=]\s*([A-Za-z0-9-]+)/i);
  return cleanImei(match?.[1]);
};

const extractPayloadValue = (payload, keys, pattern) => {
  for (const key of keys) {
    const value = payload?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }

  const message = payload?.message || payload?.sms || payload?.text;
  if (typeof message !== "string") return undefined;

  return message.match(pattern)?.[1];
};

const extractNumber = (payload, keys, pattern) => {
  const value = extractPayloadValue(payload, keys, pattern);
  if (value === undefined || value === null || value === "") return null;

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

/**
 * Build possible tracker key matches
 */
const buildTrackerCandidateKeys = (payload) => {
  const set = new Set();

  const add = (value) => {
    const normalized = normalizeTrackerKey(value);
    if (!normalized) return;

    set.add(normalized);

    const raw = normalized.replace(/^TRK-/, "");
    if (raw) set.add(raw);

    if (/^\d+$/.test(raw)) {
      set.add(`TRK-${raw.padStart(3, "0")}`);
    }
  };

  add(payload.sender);
  add(payload.trackerId);
  add(payload.tracker_id);
  add(payload.imei);
  add(payload.device_id);

  if (payload.message) {
    const regex =
      /(?:ID[:=]?|TRACKERID[:=]?|TRACKER[:=]?|DEV[:=]?)[\s]*([A-Za-z0-9-]+)/gi;

    let match;
    while ((match = regex.exec(String(payload.message)))) {
      add(match[1]);
    }
  }

  return Array.from(set);
};

/**
 * Find tracker from payload
 */
const findTrackerForPayload = async (payload) => {
  const keys = buildTrackerCandidateKeys(payload);

  if (!keys.length) return null;

  return Tracker.findOne({
    where: {
      [Op.or]: [
        {
          device_uid: {
            [Op.in]: keys,
          },
        },
        {
          imei: {
            [Op.in]: keys,
          },
        },
      ],
    },
  });
};

/**
 * Normalize and unwrap nested payloads (A9G / ESP32 / forwarders)
 */
const normalizePayload = (reqBody) => {
  let parsed = reqBody;

  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return null;
    }
  }

  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const unwrapKeys = ["key", "payload", "data", "body"];

  for (const k of unwrapKeys) {
    if (!Object.prototype.hasOwnProperty.call(parsed, k)) continue;

    const v = parsed[k];

    if (v && typeof v === "object") {
      parsed = v;
      break;
    }

    if (typeof v === "string") {
      const t = v.trim();

      if (t.startsWith("{") || t.startsWith("[")) {
        try {
          parsed = JSON.parse(t);
          break;
        } catch {
          // ignore
        }
      }
    }
  }

  // final safety extraction
  if (typeof parsed === "string") {
    const start = parsed.indexOf("{");
    const end = parsed.lastIndexOf("}");

    if (start !== -1 && end !== -1 && end > start) {
      try {
        parsed = JSON.parse(parsed.slice(start, end + 1));
      } catch {
        return null;
      }
    }
  }

  return parsed;
};

/**
 * INGEST PAYLOAD
 */
exports.ingestSMS = async (req, res) => {
  try {
    console.log("Incoming payload:", req.body);

    const decryptedOrRaw = await maybeDecryptPayload(req.body);
    const parsed = normalizePayload(decryptedOrRaw);

    if (!parsed) {
      return res.status(400).json({ error: "Invalid payload format or encryption key" });
    }

    console.log("Normalized payload:", parsed);

    const imei = extractImeiFromPayload(parsed);

    if (!imei) {
      return res.status(400).json({ error: "IMEI is required" });
    }

    const tracker = await Tracker.findOne({ where: { imei } });

    if (!tracker) {
      console.warn("Rejected ingest for unregistered IMEI:", imei);
      return res.status(403).json({ error: "Invalid IMEI" });
    }

    const lat = extractNumber(parsed, ["lat", "latitude"], /\bLAT(?:ITUDE)?\s*[:=]\s*(-?\d+(?:\.\d+)?)/i);
    const lng = extractNumber(parsed, ["lng", "lon", "longitude"], /\b(?:LNG|LON|LONGITUDE)\s*[:=]\s*(-?\d+(?:\.\d+)?)/i);

    if (lat === null || lng === null) {
      return res.sendStatus(200);
    }

    const ts = new Date();

    // Update device metadata (best-effort)
    if (parsed.name !== undefined && parsed.name !== null) tracker.name = String(parsed.name);
    if (parsed.type !== undefined && parsed.type !== null) tracker.type = String(parsed.type);
    const batteryValue = extractNumber(parsed, ["battery", "bat"], /\b(?:BAT|BATTERY)\s*[:=]\s*(\d+(?:\.\d+)?)/i);
    if (batteryValue !== null) {
      tracker.battery = Math.round(batteryValue);
    }
    const signalValue = extractNumber(parsed, ["signal", "signalStrength", "signal_strength"], /\b(?:SIGNAL|SIG|RSSI)\s*[:=]\s*(-?\d+(?:\.\d+)?)/i);
    if (signalValue !== null) {
      tracker.signalStrength = Math.round(signalValue);
    }
    const speed = extractNumber(parsed, ["speed"], /\b(?:SPEED|SPD)\s*[:=]\s*(-?\d+(?:\.\d+)?)/i);

    // FIXED: correct column mapping (IMPORTANT FIX)
    await Location.create({
      device_id: tracker.device_uid,
      lat,
      lng,
      speed: speed ?? 0,
      timestamp: ts,
      battery: tracker.battery ?? null,
    });

    tracker.lastSeen = ts;
    await tracker.save();

    // Socket update
    const io = req.app.get("io");

    if (io) {
      const location = {
        device_id: tracker.device_uid,
        device_uid: tracker.device_uid,
        imei: tracker.imei ?? null,
        name: tracker.name ?? null,
        lat,
        lng,
        speed: speed ?? 0,
        timestamp: ts,
        battery: tracker.battery ?? null,
        signal: tracker.signalStrength ?? null,
        signalStrength: tracker.signalStrength ?? null,
      };

      // Frontend dashboard listens for this event. Admins receive all devices;
      // users receive only devices assigned to them.
      io.to("admin").emit("location:update", { location });
      if (tracker.userId) {
        io.to(`user:${tracker.userId}`).emit("location:update", { location });
      }
      io.to(tracker.device_uid).emit("location:update", {
        event: "location:update",
        v: 1,
        ...telemetryResponse({ tracker, loc: location }),
      });

      // Backward-compat for older clients
      const legacyPayload = {
        trackerId: tracker.device_uid,
        lat,
        lng,
        timestamp: ts,
        battery: tracker.battery ?? null,
        signal: tracker.signalStrength ?? null,
        location,
      };
      io.to("admin").emit("tracker-update", legacyPayload);
      if (tracker.userId) {
        io.to(`user:${tracker.userId}`).emit("tracker-update", legacyPayload);
      }
    }

    return res.sendStatus(200);
  } catch (err) {
    console.error("ingestSMS error:", err);
    return res.sendStatus(500);
  }
};

/**
 * Latest locations
 */
exports.latest = async (req, res) => {
  try {
    const accessWhere = buildAccessWhere(req.user);
    const trackers = await Tracker.findAll({
      attributes: ["device_uid", "name", "imei", "type", "battery", "signalStrength", "lastSeen"],
      where: accessWhere,
      order: [["device_uid", "ASC"]],
    });

    const trackerIds = trackers.map((t) => t.device_uid);

    const locations = trackerIds.length
      ? await Location.findAll({
          where: {
            device_id: {
              [Op.in]: trackerIds,
            },
          },
          attributes: ["device_id", "lat", "lng", "timestamp"],
          order: [["timestamp", "DESC"]],
        })
      : [];

    const latestByTracker = new Map();

    for (const loc of locations) {
      if (!latestByTracker.has(loc.device_id)) {
        latestByTracker.set(loc.device_id, loc);
      }
    }

    const response = trackers.map((tracker) => {
      const loc = latestByTracker.get(tracker.device_uid);

      return {
        device_id: tracker.device_uid,
        device_uid: tracker.device_uid,
        trackerId: tracker.device_uid,
        imei: tracker.imei ?? null,
        name: tracker.name ?? null,
        type: tracker.type ?? null,
        battery: tracker.battery ?? null,
        signalStrength: tracker.signalStrength ?? null,
        lat: loc ? loc.lat : null,
        lng: loc ? loc.lng : null,
        timestamp: loc ? loc.timestamp : tracker.lastSeen,
      };
    });

    res.json(response);
  } catch (err) {
    console.error("latest error:", err);
    res.sendStatus(500);
  }
};

/**
 * Stats
 */
exports.stats = async (req, res) => {
  try {
    const now = new Date();

    const activeThreshold = new Date(now.getTime() - 5 * 60 * 1000);
    const warningThreshold = new Date(now.getTime() - 15 * 60 * 1000);

    const accessWhere = buildAccessWhere(req.user);
    const trackerIds = await Tracker.findAll({
      attributes: ["device_uid"],
      where: accessWhere,
      raw: true,
    }).then((rows) => rows.map((row) => row.device_uid));

    const totalDevices = trackerIds.length;
    const totalLocations = trackerIds.length
      ? await Location.count({
          where: {
            device_id: {
              [Op.in]: trackerIds,
            },
          },
        })
      : 0;

    const activeNow = await Tracker.count({
      where: {
        ...accessWhere,
        lastSeen: { [Op.gte]: activeThreshold },
      },
    });

    const warnings = await Tracker.count({
      where: {
        ...accessWhere,
        lastSeen: {
          [Op.lt]: warningThreshold,
        },
      },
    });

    res.json({
      totalDevices,
      totalLocations,
      // Backward-compat fields (older code used "assets")
      totalAssets: totalDevices,
      activeNow,
      warnings,
      inTransit: activeNow,
    });
  } catch (err) {
    console.error("stats error:", err);
    res.sendStatus(500);
  }
};

/**
 * Alerts
 */
exports.alerts = async (req, res) => {
  try {
    const accessWhere = buildAccessWhere(req.user);
    const warningThreshold = new Date(Date.now() - 15 * 60 * 1000);
    const lowBatteryThreshold = 20;

    const inactiveDevices = await Tracker.findAll({
      where: {
        ...accessWhere,
        lastSeen: {
          [Op.lt]: warningThreshold,
        },
      },
      order: [["lastSeen", "ASC"]],
      limit: 50,
    });

    const lowBatteryDevices = await Tracker.findAll({
      where: {
        ...accessWhere,
        battery: {
          [Op.ne]: null,
          [Op.lte]: lowBatteryThreshold,
        },
      },
      order: [
        ["battery", "ASC"],
        ["lastSeen", "ASC"],
      ],
      limit: 50,
    });

    const poorSignalDevices = await Tracker.findAll({
      where: {
        ...accessWhere,
        signalStrength: {
          [Op.ne]: null,
          [Op.lt]: 15,
        },
      },
      order: [
        ["signalStrength", "ASC"],
        ["lastSeen", "ASC"],
      ],
      limit: 50,
    });

    const items = [
      ...(lowBatteryDevices || []).map((d) => ({
        type: "low_battery",
        severity: "warning",
        device_uid: d.device_uid,
        imei: d.imei ?? null,
        battery: d.battery ?? null,
        lastSeen: d.lastSeen ?? null,
        message: `Battery is low${d.battery !== null && d.battery !== undefined ? ` (${d.battery}%)` : ""}`,
      })),
      ...(inactiveDevices || []).map((d) => ({
        type: "inactive",
        severity: "critical",
        device_uid: d.device_uid,
        imei: d.imei ?? null,
        battery: d.battery ?? null,
        lastSeen: d.lastSeen ?? null,
        message: "Device has not reported recently",
      })),
      ...(poorSignalDevices || []).map((d) => ({
        type: "poor_signal",
        severity: "warning",
        device_uid: d.device_uid,
        imei: d.imei ?? null,
        signalStrength: d.signalStrength ?? null,
        battery: d.battery ?? null,
        lastSeen: d.lastSeen ?? null,
        message: `Signal is weak${d.signalStrength !== null && d.signalStrength !== undefined ? ` (${d.signalStrength})` : ""}`,
      })),
    ];

    res.json({
      lowBatteryDevices,
      inactiveDevices,
      poorSignalDevices,
      items,
    });
  } catch (err) {
    console.error("alerts error:", err);
    res.sendStatus(500);
  }
};

/**
 * Devices list (role-aware)
 */
exports.devices = async (req, res) => {
  try {
    const accessWhere = buildAccessWhere(req.user);
    const include =
      req.user?.role === "admin"
        ? [{ model: User, as: "user", attributes: ["id", "name", "email"] }]
        : [];

    const devices = await Tracker.findAll({
      where: accessWhere,
      include,
      order: [["device_uid", "ASC"]],
    });

    return res.json(devices);
  } catch (err) {
    console.error("devices error:", err);
    return res.sendStatus(500);
  }
};

exports.serverTime = (req, res) => {
  const now = new Date();
  return res.json({
    iso: now.toISOString(),
    epochMs: now.getTime(),
    timezone: "UTC",
  });
};

exports.deviceIntegration = async (req, res) => {
  try {
    const tracker = await resolveTrackerByAnyId(req.params.device_id);
    if (!tracker) return res.status(404).json({ error: "Device not found" });

    if (req.user?.role !== "admin") {
      const allowed = tracker.userId === req.user?.id;
      if (!allowed) return res.status(403).json({ error: "Forbidden" });
    }

    if (!tracker.userId) {
      return res.status(409).json({ error: "Assign this tracker to a user before generating a developer API key." });
    }

    const baseUrl = buildBaseUrl(req);
    const apiKey = signDeveloperToken({ userId: tracker.userId, deviceId: tracker.device_uid });

    return res.json({
      apiVersion: "v1",
      device_id: tracker.device_uid,
      imei: tracker.imei,
      name: tracker.name ?? null,
      purpose: "Provider-issued JWT access for integrating this tracker with an external system.",
      standards: [
        "All developer endpoints are versioned under /api/v1.",
        "The JWT is issued by TrackA and is scoped to this device_id only.",
        "Requests are rejected when the device_id in the URL does not match the device_id in the JWT.",
        "Telemetry ingestion uses a telemetry array; every entry must include lat, lng, battery, signal, and an ISO-8601 UTC timestamp.",
        "Responses use consistent field names: lat, lng, battery, signal, timestamp.",
        "Errors use { error, message, status }.",
        "Realtime updates are isolated per device room and emit location:update with v: 1.",
        "Rate limits are applied per device/API key.",
      ],
      auth: {
        type: "Bearer",
        apiKey,
        expiresIn: process.env.DEVELOPER_API_TOKEN_EXPIRES_IN || "365d",
        scopes: ["tracker:telemetry:write", "tracker:latest:read", "tracker:history:read", "tracker:live:read"],
      },
      endpoints: {
        telemetryIngest: {
          method: "POST",
          url: `${baseUrl}/api/v1/devices/${encodeURIComponent(tracker.device_uid)}/telemetry`,
          description: "Stores one or more telemetry records. device_id is in the URL and must match the JWT.",
        },
        latest: {
          method: "GET",
          url: `${baseUrl}/api/v1/devices/${encodeURIComponent(tracker.device_uid)}/latest`,
          description: "Returns the latest coordinate, battery, signal, and timestamp for this tracker.",
        },
        history: {
          method: "GET",
          url: `${baseUrl}/api/v1/devices/${encodeURIComponent(tracker.device_uid)}/history?from=2026-01-01T00:00:00.000Z&to=2026-01-02T00:00:00.000Z&limit=500`,
          description: "Returns a historical path for this tracker. from, to, and limit are optional.",
        },
        liveSocket: {
          url: baseUrl,
          auth: { token: "use the apiKey above in socket.io auth.token" },
          event: "location:update",
          description: "Connect with Socket.IO and listen for real-time location:update events for this tracker.",
        },
      },
      examples: {
        telemetryBody: {
          device_id: tracker.device_uid,
          telemetry: [
            {
              lat: -15.3876,
              lng: 35.3367,
              battery: 87,
              signal: 22,
              timestamp: "2026-05-28T10:00:00Z",
            },
          ],
        },
        telemetryCurl: `curl -X POST -H "Authorization: Bearer ${apiKey}" -H "Content-Type: application/json" -d '{"device_id":"${tracker.device_uid}","telemetry":[{"lat":-15.3876,"lng":35.3367,"battery":87,"signal":22,"timestamp":"2026-05-28T10:00:00Z"}]}' "${baseUrl}/api/v1/devices/${encodeURIComponent(tracker.device_uid)}/telemetry"`,
        latestCurl: `curl -H "Authorization: Bearer ${apiKey}" "${baseUrl}/api/v1/devices/${encodeURIComponent(tracker.device_uid)}/latest"`,
        historyCurl: `curl -H "Authorization: Bearer ${apiKey}" "${baseUrl}/api/v1/devices/${encodeURIComponent(tracker.device_uid)}/history?limit=100"`,
        errorResponse: {
          error: "INVALID_TIMESTAMP",
          message: "telemetry[0] must include a valid ISO-8601 timestamp.",
          status: 400,
        },
        latestResponse: {
          event: "location:update",
          v: 1,
          device_id: tracker.device_uid,
          imei: tracker.imei,
          name: tracker.name ?? null,
          lat: -15.3876,
          lng: 35.3367,
          battery: 87,
          signal: 22,
          timestamp: new Date().toISOString(),
        },
      },
    });
  } catch (err) {
    console.error("deviceIntegration error:", err);
    return res.status(500).json({ error: err.message });
  }
};

exports.developerLatest = async (req, res) => {
  try {
    const access = await getDeveloperAccess(req, {
      deviceId: req.params.device_id,
      scope: "tracker:latest:read",
    });
    if (access.error) return sendAccessError(res, access);

    const tracker = access.tracker;
    const loc = await Location.findOne({
      where: { device_id: tracker.device_uid },
      attributes: ["device_id", "lat", "lng", "speed", "battery", "timestamp"],
      order: [["timestamp", "DESC"]],
    });

    return res.json({
      v: 1,
      ...telemetryResponse({ tracker, loc }),
      lastSeen: tracker.lastSeen ? new Date(tracker.lastSeen).toISOString() : null,
    });
  } catch (err) {
    console.error("developerLatest error:", err);
    return res.status(500).json({ error: "Could not load the latest tracker location. Please try again." });
  }
};

exports.developerHistory = async (req, res) => {
  try {
    const access = await getDeveloperAccess(req, {
      deviceId: req.params.device_id,
      scope: "tracker:history:read",
    });
    if (access.error) return sendAccessError(res, access);

    const tracker = access.tracker;
    const where = { device_id: tracker.device_uid };
    const from = req.query?.from ? new Date(String(req.query.from)) : null;
    const to = req.query?.to ? new Date(String(req.query.to)) : null;

    if (from && Number.isFinite(from.getTime())) where.timestamp = { ...(where.timestamp || {}), [Op.gte]: from };
    if (to && Number.isFinite(to.getTime())) where.timestamp = { ...(where.timestamp || {}), [Op.lte]: to };

    let limit = req.query?.limit ? Number(req.query.limit) : 500;
    if (!Number.isFinite(limit) || limit <= 0) limit = 500;
    limit = Math.min(limit, 5000);

    const rows = await Location.findAll({
      where,
      attributes: ["device_id", "lat", "lng", "speed", "battery", "timestamp"],
      order: [["timestamp", "DESC"]],
      limit,
    });

    return res.json({
      v: 1,
      device_id: tracker.device_uid,
      imei: tracker.imei ?? null,
      count: rows.length,
      telemetry: rows.map((loc) => telemetryResponse({ tracker, loc })),
    });
  } catch (err) {
    console.error("developerHistory error:", err);
    return res.status(500).json({ error: "Could not load tracker history. Please try again." });
  }
};

exports.ingestTelemetryV1 = async (req, res) => {
  const startedAt = Date.now();
  const deviceId = String(req.params.device_id || "").trim();

  try {
    const access = await getDeveloperAccess(req, {
      deviceId,
      scope: "tracker:telemetry:write",
    });
    if (access.error) return sendAccessError(res, access);

    const tracker = access.tracker;
    const payload = req.body || {};
    const telemetry = Array.isArray(payload.telemetry) ? payload.telemetry : null;

    if (payload.device_id !== deviceId) {
      return apiError(res, 400, "DEVICE_ID_MISMATCH", "Payload device_id must match the device_id in the URL.");
    }

    if (!telemetry || telemetry.length === 0) {
      return apiError(res, 400, "INVALID_TELEMETRY", "telemetry must be a non-empty array.");
    }

    const rows = [];
    let latestBattery = null;
    let latestSignal = null;
    let latestTimestamp = null;

    for (const [index, entry] of telemetry.entries()) {
      const lat = Number(entry?.lat);
      const lng = Number(entry?.lng);
      const battery = Number(entry?.battery);
      const signal = Number(entry?.signal);
      const timestamp = parseRequiredTimestamp(entry?.timestamp);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return apiError(res, 400, "INVALID_COORDINATES", `telemetry[${index}] must include numeric lat and lng.`);
      }

      if (!Number.isFinite(battery)) {
        return apiError(res, 400, "INVALID_BATTERY", `telemetry[${index}] must include numeric battery.`);
      }

      if (!Number.isFinite(signal)) {
        return apiError(res, 400, "INVALID_SIGNAL", `telemetry[${index}] must include numeric signal.`);
      }

      if (!timestamp) {
        return apiError(res, 400, "INVALID_TIMESTAMP", `telemetry[${index}] must include a valid ISO-8601 timestamp.`);
      }

      rows.push({
        device_id: tracker.device_uid,
        lat,
        lng,
        speed: Number.isFinite(Number(entry?.speed)) ? Number(entry.speed) : 0,
        battery: Math.round(battery),
        timestamp,
      });

      latestBattery = Math.round(battery);
      latestSignal = Math.round(signal);
      if (!latestTimestamp || timestamp > latestTimestamp) latestTimestamp = timestamp;
    }

    await Location.bulkCreate(rows);
    tracker.battery = latestBattery;
    tracker.signalStrength = latestSignal;
    tracker.lastSeen = latestTimestamp;
    await tracker.save();

    const io = req.app.get("io");
    if (io) {
      const location = {
        event: "location:update",
        v: 1,
        ...telemetryResponse({ tracker, loc: rows[rows.length - 1] }),
      };
      io.to(tracker.device_uid).emit("location:update", location);
      io.to("admin").emit("location:update", { location });
      if (tracker.userId) io.to(`user:${tracker.userId}`).emit("location:update", { location });
    }

    console.log("Telemetry ingest v1", {
      device_id: tracker.device_uid,
      count: rows.length,
      latency_ms: Date.now() - startedAt,
    });

    return res.status(201).json({
      v: 1,
      device_id: tracker.device_uid,
      accepted: rows.length,
      storedTimestamps: rows.map((row) => row.timestamp.toISOString()),
    });
  } catch (err) {
    console.error("ingestTelemetryV1 error:", { device_id: deviceId, error: err.message });
    return apiError(res, 500, "SERVER_ERROR", "Could not store telemetry right now. Please try again.");
  }
};

/**
 * Register a device (admin only)
 */
exports.registerDevice = async (req, res) => {
  try {
    const device_uid = String(req.body?.device_id || req.body?.device_uid || "").trim();
    if (!device_uid) return res.status(400).json({ error: "device_id is required" });

    const type = req.body?.type ? String(req.body.type) : "unknown";
    const userId = req.body?.userId !== undefined && req.body?.userId !== null ? Number(req.body.userId) : null;

    const [device, created] = await Tracker.findOrCreate({
      where: { device_uid },
      defaults: {
        device_uid,
        type,
        userId: Number.isFinite(userId) ? userId : null,
        status: Number.isFinite(userId) ? "assigned" : "available",
      },
    });

    if (!created) {
      if (req.body?.type !== undefined) device.type = type;
      if (Number.isFinite(userId)) {
        device.userId = userId;
        device.status = "assigned";
      }
      await device.save();
    }

    return res.json(device);
  } catch (err) {
    console.error("registerDevice error:", err);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * Location history for a device (role-aware)
 * Supports:
 *  - GET /api/tracker/history?device_id=...&from=...&to=...&limit=...
 *  - GET /api/tracker/:device_id/history
 */
exports.history = async (req, res) => {
  try {
    const rawDeviceId = String(req.query?.device_id || req.params?.device_id || "").trim();
    if (!rawDeviceId) return res.status(400).json({ error: "device_id is required" });

    const tracker = await resolveTrackerByAnyId(rawDeviceId);
    if (!tracker) return res.status(404).json({ error: "Device not found" });

    if (req.user?.role !== "admin") {
      const allowed = tracker.userId === null || tracker.userId === req.user?.id;
      if (!allowed) return res.status(403).json({ error: "Forbidden" });
    }

    const where = { device_id: tracker.device_uid };
    const from = req.query?.from ? new Date(String(req.query.from)) : null;
    const to = req.query?.to ? new Date(String(req.query.to)) : null;

    if (from && Number.isFinite(from.getTime())) where.timestamp = { ...(where.timestamp || {}), [Op.gte]: from };
    if (to && Number.isFinite(to.getTime())) where.timestamp = { ...(where.timestamp || {}), [Op.lte]: to };

    let limit = req.query?.limit ? Number(req.query.limit) : 2000;
    if (!Number.isFinite(limit) || limit <= 0) limit = 2000;
    limit = Math.min(limit, 5000);

    const rows = await Location.findAll({
      where,
      attributes: ["device_id", "lat", "lng", "speed", "battery", "timestamp"],
      order: [["timestamp", "DESC"]],
      limit,
    });

    return res.json(rows);
  } catch (err) {
    console.error("history error:", err);
    return res.sendStatus(500);
  }
};
