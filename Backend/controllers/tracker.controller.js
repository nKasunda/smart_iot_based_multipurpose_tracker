const { Tracker, Location, User } = require("../models");
const { Op } = require("sequelize");

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

const cleanImei = (value) => {
  if (value === undefined || value === null) return null;

  const text = String(value)
    .trim()
    .replace(/^IMEI[:=]?/i, "")
    .trim();

  return text || null;
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

    const parsed = normalizePayload(req.body);

    if (!parsed) {
      return res.status(400).json({ error: "Invalid payload format" });
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

    // For smartphone trackers, require ingestToken for security
    if (tracker.type === 'smartphone') {
      const token = parsed.token || req.body.token;
      if (!token || token !== tracker.ingestToken) {
        console.warn("Rejected ingest for smartphone tracker - invalid token:", imei);
        return res.status(403).json({ error: "Invalid token" });
      }
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
 * Create a smartphone tracker for a user
 */
exports.createSmartphoneTracker = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Authentication required" });

    const name = req.body?.name ? String(req.body.name).trim() : "My Smartphone";

    // Generate virtual IMEI and token
    const virtualImei = `APP-${require('crypto').randomUUID()}`;
    const ingestToken = require('crypto').randomUUID();

    // Create device_uid
    const device_uid = `PHONE-${Date.now()}`;

    const tracker = await Tracker.create({
      device_uid,
      imei: virtualImei,
      ingestToken,
      type: 'smartphone',
      name,
      userId,
      status: 'assigned',
    });

    return res.json({
      tracker,
      trackingUrl: `${req.protocol}://${req.get('host')}/phone-tracker?imei=${virtualImei}&token=${ingestToken}`,
    });
  } catch (err) {
    console.error("createSmartphoneTracker error:", err);
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
