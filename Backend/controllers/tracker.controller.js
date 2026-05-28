const { Alert, Tracker, Location, User } = require("../models");
const { Op } = require("sequelize");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const DEVELOPER_API_AUDIENCE = "tda-v1";

const apiError = (res, status, error, message) => res.status(status).json({ error, message, status });
const TRACKER_ONLINE_WINDOW_MS = Number(process.env.TRACKER_ONLINE_WINDOW_MS || 2 * 60 * 1000);

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
    t: "dev",
    aud: DEVELOPER_API_AUDIENCE,
    sub: String(userId),
    did: deviceId,
    scp: ["latest", "history", "live"],
  },
  getJwtSecret(),
  { expiresIn: process.env.DEVELOPER_API_TOKEN_EXPIRES_IN || "30d" }
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

  const tokenType = payload.t || payload.type;
  const tokenDeviceId = payload.did || payload.device_id;
  const tokenScopes = Array.isArray(payload.scp)
    ? payload.scp
    : Array.isArray(payload.scopes)
      ? payload.scopes
      : [];

  const scopeAliases = {
    "tracker:latest:read": "latest",
    "tracker:history:read": "history",
    "tracker:live:read": "live",
  };
  const expectedScope = scopeAliases[requiredScope] || requiredScope;

  if (!["dev", "developer-api"].includes(tokenType) || !tokenDeviceId) {
    return { error: "FORBIDDEN", message: "This API key cannot access tracker developer endpoints.", status: 403 };
  }

  if (expectedDeviceId && String(tokenDeviceId) !== expectedDeviceId) {
    console.warn("Developer API device mismatch", {
      token_device_id: tokenDeviceId,
      requested_device_id: expectedDeviceId,
    });
    return { error: "DEVICE_SCOPE_MISMATCH", message: "API key device_id does not match the requested device.", status: 403 };
  }

  if (expectedScope && !tokenScopes.includes(expectedScope) && !tokenScopes.includes(requiredScope)) {
    return { error: "INSUFFICIENT_SCOPE", message: `API key requires ${requiredScope} scope.`, status: 403 };
  }

  const tracker = await resolveTrackerByAnyId(tokenDeviceId);
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

const isTrackerOnline = (lastSeen, now = Date.now()) => {
  if (!lastSeen) return false;
  const time = new Date(lastSeen).getTime();
  return Number.isFinite(time) && now - time < TRACKER_ONLINE_WINDOW_MS;
};

const liveMetrics = (tracker, now = Date.now()) => {
  const online = isTrackerOnline(tracker?.lastSeen, now);
  return {
    online,
    battery: online ? tracker?.battery ?? null : null,
    signalStrength: online ? tracker?.signalStrength ?? null : null,
  };
};

const serializeTracker = (tracker, now = Date.now()) => {
  const data = typeof tracker.toJSON === "function" ? tracker.toJSON() : { ...tracker };
  const metrics = liveMetrics(data, now);
  return {
    ...data,
    battery: metrics.battery,
    signalStrength: metrics.signalStrength,
    online: metrics.online,
  };
};

const telemetryResponse = ({ tracker, loc }) => ({
  ...(() => {
    const metrics = liveMetrics(tracker);
    return {
      device_id: tracker.device_uid,
      imei: tracker.imei ?? null,
      name: tracker.name ?? null,
      lat: loc?.lat ?? null,
      lng: loc?.lng ?? null,
      battery: metrics.online ? loc?.battery ?? metrics.battery : null,
      signal: metrics.signalStrength,
      speed: loc?.speed ?? 0,
      timestamp: loc?.timestamp ? new Date(loc.timestamp).toISOString() : null,
      online: metrics.online,
    };
  })(),
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

    const now = Date.now();
    const response = trackers.map((tracker) => {
      const loc = latestByTracker.get(tracker.device_uid);
      const metrics = liveMetrics(tracker, now);

      return {
        device_id: tracker.device_uid,
        device_uid: tracker.device_uid,
        trackerId: tracker.device_uid,
        imei: tracker.imei ?? null,
        name: tracker.name ?? null,
        type: tracker.type ?? null,
        battery: metrics.battery,
        signalStrength: metrics.signalStrength,
        signal: metrics.signalStrength,
        online: metrics.online,
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
    const accessibleTrackers = await Tracker.findAll({
      attributes: ["id", "device_uid"],
      where: accessWhere,
      raw: true,
    });
    const accessibleTrackerIds = accessibleTrackers.map((row) => row.id);

    const storedAlertWhere = req.user?.role === "admin"
      ? {}
      : { tracker_id: { [Op.in]: accessibleTrackerIds } };

    const storedAlerts = accessibleTrackerIds.length || req.user?.role === "admin"
      ? await Alert.findAll({
          where: storedAlertWhere,
          include: [
            {
              model: Tracker,
              attributes: ["id", "device_uid", "imei", "battery", "signalStrength", "lastSeen"],
              required: false,
            },
          ],
          order: [["createdAt", "DESC"]],
          limit: 100,
        })
      : [];

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

    const activeThreshold = new Date(Date.now() - TRACKER_ONLINE_WINDOW_MS);

    const lowBatteryDevices = await Tracker.findAll({
      where: {
        ...accessWhere,
        lastSeen: { [Op.gte]: activeThreshold },
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
        lastSeen: { [Op.gte]: activeThreshold },
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

    const generatedItems = [
      ...(lowBatteryDevices || []).map((d) => ({
        type: "low_battery",
        severity: "warning",
        device_uid: d.device_uid,
        imei: d.imei ?? null,
        battery: liveMetrics(d).battery,
        lastSeen: d.lastSeen ?? null,
        message: `Battery is low${d.battery !== null && d.battery !== undefined ? ` (${d.battery}%)` : ""}`,
      })),
      ...(inactiveDevices || []).map((d) => ({
        type: "inactive",
        severity: "critical",
        device_uid: d.device_uid,
        imei: d.imei ?? null,
        battery: null,
        lastSeen: d.lastSeen ?? null,
        message: "Device has not reported recently",
      })),
      ...(poorSignalDevices || []).map((d) => ({
        type: "poor_signal",
        severity: "warning",
        device_uid: d.device_uid,
        imei: d.imei ?? null,
        signalStrength: liveMetrics(d).signalStrength,
        battery: liveMetrics(d).battery,
        lastSeen: d.lastSeen ?? null,
        message: `Signal is weak${d.signalStrength !== null && d.signalStrength !== undefined ? ` (${d.signalStrength})` : ""}`,
      })),
    ];
    const storedItems = storedAlerts.map((alert) => {
      const tracker = alert.Tracker;
      return {
        id: alert.id,
        type: alert.type || "alert",
        severity: alert.severity || "warning",
        device_uid: tracker?.device_uid ?? String(alert.tracker_id),
        tracker_id: alert.tracker_id,
        imei: tracker?.imei ?? null,
        battery: liveMetrics(tracker).battery,
        signalStrength: liveMetrics(tracker).signalStrength,
        lastSeen: tracker?.lastSeen ?? null,
        receivedAt: alert.createdAt ?? null,
        createdAt: alert.createdAt ?? null,
        message: alert.message || "Device alert received",
        isResolved: !!alert.isResolved,
      };
    });

    const items = (storedItems.length ? storedItems : generatedItems).sort((a, b) => {
      const aTime = new Date(a.receivedAt || a.createdAt || a.lastSeen || 0).getTime();
      const bTime = new Date(b.receivedAt || b.createdAt || b.lastSeen || 0).getTime();
      return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
    });

    res.json({
      lowBatteryDevices,
      inactiveDevices,
      poorSignalDevices,
      storedAlerts: storedItems,
      total: items.length,
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

    return res.json(devices.map((device) => serializeTracker(device)));
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
        "Use this provider-issued Bearer API key; it expires in 30 days.",
        "This key is read-only and scoped to this device_id.",
        "Use only the /api/v1 GET endpoints shown below.",
        "Responses use lat, lng, battery, signal, and timestamp.",
        "For live updates, connect with Socket.IO and listen for location:update.",
      ],
      auth: {
        type: "Bearer",
        apiKey,
        expiresIn: process.env.DEVELOPER_API_TOKEN_EXPIRES_IN || "30d",
        scopes: ["latest", "history", "live"],
      },
      endpoints: {
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
        latestCurl: `curl -H "Authorization: Bearer ${apiKey}" "${baseUrl}/api/v1/devices/${encodeURIComponent(tracker.device_uid)}/latest"`,
        historyCurl: `curl -H "Authorization: Bearer ${apiKey}" "${baseUrl}/api/v1/devices/${encodeURIComponent(tracker.device_uid)}/history?limit=100"`,
        browserTest: `Open ${baseUrl}/api/v1/devices/${encodeURIComponent(tracker.device_uid)}/latest in an API client and add Authorization: Bearer ${apiKey}`,
        errorResponse: {
          error: "UNAUTHORIZED",
          message: "Missing developer API key.",
          status: 401,
        },
        latestResponse: {
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
