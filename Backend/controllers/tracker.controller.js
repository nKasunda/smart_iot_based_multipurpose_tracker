const { Tracker, Location } = require("../models");
const { Op } = require("sequelize");

/**
 * UPDATE tracker location (heartbeat)
 */
exports.updateTrackerLocation = async (req, res) => {
  try {
    const { trackerId, lat, lng, battery, signalStrength, network } = req.body;

    if (!trackerId || lat == null || lng == null) {
      return res.status(400).json({ message: "Missing fields" });
    }

    // Ensure ONE tracker row per trackerId
    await Tracker.upsert({
      trackerId,
      battery,
      signalStrength,
      network,
      status: "online",
      lastSeen: new Date(),
    });

    // Save location history
    await Location.create({
      trackerId,
      lat,
      lng,
      timestamp: new Date(),
    });

    res.json({ message: "Tracker updated" });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET tracker history
 */
exports.getTrackerHistory = async (req, res) => {
  try {
    const { trackerId } = req.params;

    const locations = await Location.findAll({
      where: { trackerId },
      order: [["timestamp", "ASC"]],
    });

    res.json(locations);
  } catch (err) {
    console.error("History error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET dashboard stats (TIME-AWARE)
 */
exports.getDashboardStats = async (req, res) => {
  try {
    const ACTIVE_SECONDS = 30;
    const activeSince = new Date(Date.now() - ACTIVE_SECONDS * 1000);

    const totalAssets = await Tracker.count();

    const activeNow = await Tracker.count({
      where: {
        lastSeen: { [Op.gt]: activeSince },
      },
    });

    const warnings = await Tracker.count({
      where: {
        battery: { [Op.lt]: 20 },
        lastSeen: { [Op.gt]: activeSince },
      },
    });

    const inTransit = activeNow; // same definition for now

    res.json({
      totalAssets,
      activeNow,
      warnings,
      inTransit,
    });
  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getActiveTrackers = async (req, res) => {
  try {
    const trackers = await Tracker.findAll({
      attributes: ["trackerId", "status", "lastSeen"],
      order: [["trackerId", "ASC"]],
    });

    res.json(trackers);
  } catch (err) {
    console.error("Get trackers error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


/**
 * GET recent alerts
 */
exports.getRecentAlerts = async (req, res) => {
  try {
    const recentLocations = await Location.findAll({
      order: [["timestamp", "DESC"]],
      limit: 10,
    });

    const alerts = recentLocations.map((loc) => ({
      device: loc.trackerId,
      type: "Location Update",
      time: loc.timestamp,
    }));

    res.json(alerts);
  } catch (err) {
    console.error("Alerts error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
