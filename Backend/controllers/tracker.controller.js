// tracker.controller.js
const { Tracker, Location } = require("../models");
const { Op } = require("sequelize");

const normalizeTrackerKey = (value) => {
  if (!value) return null;
  let text = String(value).trim();
  if (!text) return null;
  text = text.toUpperCase();
  text = text.replace(/^ID[:=]?/i, "").trim();
  return text.startsWith("TRK-") ? text : `TRK-${text}`;
};

const buildTrackerCandidateKeys = (payload) => {
  const set = new Set();
  const add = (value) => {
    const normalized = normalizeTrackerKey(value);
    if (!normalized) return;
    set.add(normalized);
    const raw = normalized.replace(/^TRK-/, "");
    if (raw) set.add(raw);
    if (/^\d+$/.test(raw)) set.add(`TRK-${raw.padStart(3, "0")}`);
  };

  add(payload.sender);
  add(payload.trackerId);
  add(payload.tracker_id);

  if (payload.message) {
    const regex = /(?:ID[:=]?|TRACKERID[:=]?|TRACKER[:=]?|DEV[:=]?)[\s]*([A-Za-z0-9-]+)/gi;
    let match;
    while ((match = regex.exec(String(payload.message)))) {
      add(match[1]);
    }
  }

  return Array.from(set);
};

const findTrackerForPayload = async (payload) => {
  const keys = buildTrackerCandidateKeys(payload);
  if (!keys.length) return null;
  return Tracker.findOne({
    where: {
      device_uid: {
        [Op.in]: keys,
      },
    },
  });
};

/**
* Ingest SMS payload from tracker
*/
exports.ingestSMS = async (req, res) => {
  try {
    const { message, sender } = req.body;

    if (!message || !sender) {
      console.log("Missing sender or message");
      return res.status(400).json({ error: "Invalid payload" });
    }

    console.log("Received SMS from", sender, ":", message);

    // Flexible regex: find LAT, LON, TS anywhere in the message
    const regex = /LAT[:=]([-\d.]+).*LON[:=]([-\d.]+).*TS[:=]?(\d+)/i;
    const match = message.match(regex);

    if (!match) {
      console.log("Invalid format:", message);
      return res.sendStatus(200); // do not throw error for bad SMS
    }

    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    const ts = new Date(parseInt(match[3]) * 1000); // TS in seconds

    // Find or create tracker
    let tracker = await Tracker.findOne({ where: { device_uid: sender } });
    if (!tracker) {
      tracker = await Tracker.create({ device_uid: sender });
      console.log("Created new tracker:", sender);
    }

    // Save location
    const location = await Location.create({
      tracker_id: tracker.device_uid,
      lat,
      lng,
      timestamp: ts,
    });
    console.log(`Saved location for tracker ${sender}: ${lat}, ${lng}`);

    // Update tracker's lastSeen
    tracker.lastSeen = ts;
    await tracker.save();

    // Emit real-time update via Socket.io
    const io = req.app.get("io");
    if (io) {
      io.emit("tracker-update", {
        trackerId: tracker.device_uid,
        lat,
        lng,
        timestamp: ts,
      });
      console.log("Emitted tracker-update via Socket.io");
    } else {
      console.log("Socket.io not initialized");
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("ingestSMS error:", err);
    res.sendStatus(500);
  }
};

/**
* Get the latest location for all trackers
*/
exports.latest = async (req, res) => {
  try {
    const trackers = await Tracker.findAll({
      attributes: ["device_uid", "lastSeen"],
      order: [["device_uid", "ASC"]],
    });

    const trackerIds = trackers.map((tracker) => tracker.device_uid);
    const locations = trackerIds.length
      ? await Location.findAll({
          where: {
            tracker_id: {
              [Op.in]: trackerIds,
            },
          },
          attributes: ["tracker_id", "lat", "lng", "timestamp"],
          order: [["timestamp", "DESC"]],
        })
      : [];

    const latestByTracker = new Map();
    for (const location of locations) {
      if (!latestByTracker.has(location.tracker_id)) {
        latestByTracker.set(location.tracker_id, location);
      }
    }

    const response = trackers.map((tracker) => {
      const loc = latestByTracker.get(tracker.device_uid);

      return {
        trackerId: tracker.device_uid,
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
* Get overview stats for the dashboard cards
*/
exports.stats = async (req, res) => {
  try {
    const now = new Date();
    const activeThreshold = new Date(now.getTime() - 5 * 60 * 1000);
    const warningThreshold = new Date(now.getTime() - 15 * 60 * 1000);

    const totalAssets = await Tracker.count();
    const activeNow = await Tracker.count({
      where: {
        lastSeen: {
          [Op.gte]: activeThreshold,
        },
      },
    });
    const warnings = await Tracker.count({
      where: {
        lastSeen: {
          [Op.lt]: warningThreshold,
        },
      },
    });

    res.json({
      totalAssets,
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
* Get simple recent alerts derived from tracker activity
*/
exports.alerts = async (req, res) => {
  try {
    const warningThreshold = new Date(Date.now() - 15 * 60 * 1000);
    const staleTrackers = await Tracker.findAll({
      where: {
        lastSeen: {
          [Op.lt]: warningThreshold,
        },
      },
      order: [["lastSeen", "ASC"]],
      limit: 10,
    });

    const alerts = staleTrackers.map((tracker) => ({
      device: tracker.device_uid,
      type: "Tracker has not reported recently",
      time: tracker.lastSeen,
    }));

    res.json(alerts);
  } catch (err) {
    console.error("alerts error:", err);
    res.sendStatus(500);
  }
};
