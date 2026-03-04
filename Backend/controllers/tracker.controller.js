const { Tracker, Location, Alert, Trip, Asset } = require("../models");
const { Op } = require("sequelize");

/**
 * Updating tracker location (heartbeat)
 */
exports.updateTrackerLocation = async (req, res) => {
  try {
    const { trackerId, lat, lng, battery, signalStrength, network } = req.body;

    if (!trackerId || lat == null || lng == null) {
      return res.status(400).json({ message: "Missing fields" });
    }

    // Upserting Tracker using device_uid
    await Tracker.upsert({
      device_uid: trackerId,
      battery,
      signalStrength,
      network,
      status: "online",
      lastSeen: new Date(),
    });

    // Saving Location history
    await Location.create({
      tracker_id: trackerId,
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
 * GETing tracker location history
 */
exports.getTrackerHistory = async (req, res) => {
  try {
    const { trackerId } = req.params;

    const locations = await Location.findAll({
      where: { tracker_id: trackerId },
      order: [["timestamp", "ASC"]],
    });

    res.json(locations);
  } catch (err) {
    console.error("History error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GETing dashboard stats (time-aware)
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

    const inTransit = activeNow; // can refine later if needed

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

/**
 * GETing all active trackers
 */
exports.getActiveTrackers = async (req, res) => {
  try {
    const trackers = await Tracker.findAll({
      attributes: ["device_uid", "status", "lastSeen"],
      order: [["device_uid", "ASC"]],
    });

    res.json(trackers);
  } catch (err) {
    console.error("Get trackers error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GETing recent alerts
 */
exports.getRecentAlerts = async (req, res) => {
  try {
    // For demo, treat last 10 locations as alerts
    const recentLocations = await Location.findAll({
      order: [["timestamp", "DESC"]],
      limit: 10,
    });

    const alerts = recentLocations.map((loc) => ({
      device: loc.tracker_id,
      type: "Location Update",
      time: loc.timestamp,
    }));

    res.json(alerts);
  } catch (err) {
    console.error("Alerts error:", err);
    res.status(500).json({ message: "Server error" });
  }
};