// controllers/user.controller.js

const { Tracker } = require("../models");

/**
 * Claim an available device using IMEI
 * User claims a device using the IMEI number
 */
exports.claimDevice = async (req, res) => {
  try {
    const { imei, name } = req.body;
    const userId = req.user.id;

    if (!imei || !imei.trim()) {
      return res.status(400).json({ error: "IMEI is required" });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Device name is required" });
    }

    // Find the device by IMEI
    const matches = await Tracker.findAll({
      where: { imei: imei.trim() },
      limit: 2
    });

    if (matches.length > 1) {
      return res.status(409).json({ error: "Ambiguous IMEI (multiple devices share this imei). Contact admin." });
    }

    const device = matches[0] || null;

    if (!device) {
      return res.status(404).json({ error: "Device not found. Check the IMEI number" });
    }

    // Check if device is available
    if (device.status !== "available") {
      if (device.userId === userId) {
        return res.status(409).json({ error: "You already own this device" });
      }
      return res.status(409).json({ error: "Device is already claimed by another user" });
    }

    // Claim the device
    await device.update({
      userId: userId,
      name: name.trim(),
      status: "assigned"
    });

    return res.status(200).json({
      message: "Device claimed successfully!",
      device: device.toJSON()
    });
  } catch (err) {
    console.error("Claim Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * Get user's claimed devices
 */
exports.getUserDevices = async (req, res) => {
  try {
    const userId = req.user.id;

    const devices = await Tracker.findAll({
      where: { userId: userId },
      order: [["createdAt", "DESC"]]
    });

    return res.json({
      devices,
      count: devices.length
    });
  } catch (err) {
    console.error("Get User Devices Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * Unclaim a device (user releases ownership)
 */
exports.unclaimDevice = async (req, res) => {
  try {
    const { device_id } = req.params;
    const userId = req.user.id;

    const device = await Tracker.findOne({
      where: { device_uid: device_id }
    });

    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    // Verify user owns this device
    if (device.userId !== userId) {
      return res.status(403).json({ error: "You don't own this device" });
    }

    // Reset device to available
    await device.update({
      userId: null,
      name: null,
      status: "available"
    });

    return res.json({
      message: "Device unclaimed successfully",
      device: device.toJSON()
    });
  } catch (err) {
    console.error("Unclaim Error:", err);
    return res.status(500).json({ error: err.message });
  }
};
