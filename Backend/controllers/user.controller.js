// controllers/user.controller.js

const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");
const { Tracker, User } = require("../models");

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  settings: user.settings || {},
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const allowedSettings = new Set([
  "uiTheme",
  "clockFormat",
  "dateFormat",
  "distanceUnit",
  "timezone",
  "alertEmail",
  "alertPush",
  "alertCritical",
  "alertWarning",
  "alertInfo",
  "mapStyle",
]);

exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const name = req.body?.name !== undefined ? String(req.body.name).trim() : user.name;
    const email = req.body?.email !== undefined ? String(req.body.email).trim().toLowerCase() : user.email;

    if (!email) return res.status(400).json({ error: "Email is required" });

    if (email !== user.email) {
      const existing = await User.findOne({
        where: {
          email,
          id: { [Op.ne]: user.id },
        },
      });
      if (existing) return res.status(409).json({ error: "Email already in use" });
    }

    user.name = name || null;
    user.email = email;
    await user.save();

    return res.json(publicUser(user));
  } catch (err) {
    console.error("Update Profile Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

exports.updatePassword = async (req, res) => {
  try {
    const { current, next, newPassword } = req.body || {};
    const nextPassword = String(next || newPassword || "");

    if (!current || !nextPassword) {
      return res.status(400).json({ error: "Current and new password are required" });
    }
    if (nextPassword.length < 8) {
      return res.status(400).json({ error: "New password must be at least 8 characters" });
    }

    const user = await User.scope("withPassword").findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const ok = await bcrypt.compare(String(current), String(user.password || ""));
    if (!ok) return res.status(401).json({ error: "Current password is incorrect" });

    user.password = await bcrypt.hash(nextPassword, 10);
    await user.save();

    return res.json({ message: "Password updated" });
  } catch (err) {
    console.error("Update Password Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const patch = {};
    for (const [key, value] of Object.entries(req.body || {})) {
      if (allowedSettings.has(key)) patch[key] = value;
    }

    user.settings = {
      ...(user.settings || {}),
      ...patch,
    };
    await user.save();

    return res.json({ settings: user.settings || {} });
  } catch (err) {
    console.error("Update Settings Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

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
