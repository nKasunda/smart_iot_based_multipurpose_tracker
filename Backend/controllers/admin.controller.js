// controllers/admin.controller.js

const { Tracker, User } = require("../models");

/**
 * Provision a new device into the system
 * Admin marks device as "available" for users to claim
 */
exports.provisionDevice = async (req, res) => {
  try {
    const { device_id, imei } = req.body;

    if (!device_id || !device_id.trim()) {
      return res.status(400).json({ error: "Device ID is required" });
    }

    if (!imei || !imei.trim()) {
      return res.status(400).json({ error: "IMEI is required" });
    }

    // Check if device already exists
    const existing = await Tracker.findOne({
      where: { device_uid: device_id.trim() }
    });

    if (existing) {
      return res.status(409).json({ error: "Device already provisioned" });
    }

    // IMEI should be unique (when present)
    const imeiText = imei.trim();

    const existingImei = await Tracker.findOne({
      where: { imei: imeiText }
    });

    if (existingImei) {
      return res.status(409).json({ error: "IMEI already in use" });
    }

    // Prevent a device ID from being equal to any existing IMEI
    const reservedDeviceId = await Tracker.findOne({
      where: { imei: device_id.trim() }
    });

    if (reservedDeviceId) {
      return res.status(409).json({ error: "Device ID cannot match an existing IMEI" });
    }

    // Prevent an IMEI from matching any existing device ID
    const reservedImei = await Tracker.findOne({
      where: { device_uid: imeiText }
    });

    if (reservedImei) {
      return res.status(409).json({ error: "IMEI cannot match an existing Device ID" });
    }

    // Create new device with "available" status
    const tracker = await Tracker.create({
      device_uid: device_id.trim(),
      imei: imeiText,
      status: "available",
      lastSeen: null,
      battery: null
    });

    return res.status(201).json({
      message: "Device provisioned successfully",
      device: tracker.toJSON()
    });
  } catch (err) {
    console.error("Provision Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * Update an existing device (admin)
 * Currently supports updating IMEI for legacy rows.
 */
exports.updateDevice = async (req, res) => {
  try {
    const { device_id: currentDeviceId } = req.params;
    const { device_uid, imei, ownerEmail } = req.body || {};

    const device = await Tracker.findOne({
      where: { device_uid: currentDeviceId }
    });

    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    const updateFields = {};

    if (device_uid !== undefined && String(device_uid).trim()) {
      const newDeviceId = String(device_uid).trim();
      if (newDeviceId !== device.device_uid) {
        const existingDevice = await Tracker.findOne({
          where: { device_uid: newDeviceId }
        });
        if (existingDevice) {
          return res.status(409).json({ error: "Device ID already in use" });
        }

        const deviceIdAsImei = await Tracker.findOne({
          where: { imei: newDeviceId }
        });
        if (deviceIdAsImei) {
          return res.status(409).json({ error: "Device ID cannot match an existing IMEI" });
        }

        updateFields.device_uid = newDeviceId;
      }
    }

    if (imei !== undefined) {
      const imeiText = String(imei).trim();
      if (!imeiText) {
        return res.status(400).json({ error: "IMEI cannot be empty" });
      }
      if (imeiText !== device.imei) {
        const existingImei = await Tracker.findOne({
          where: { imei: imeiText }
        });
        if (existingImei && existingImei.device_uid !== device.device_uid) {
          return res.status(409).json({ error: "IMEI already in use" });
        }

        const imeiAsDeviceId = await Tracker.findOne({
          where: { device_uid: imeiText }
        });
        if (imeiAsDeviceId) {
          return res.status(409).json({ error: "IMEI cannot match an existing Device ID" });
        }

        updateFields.imei = imeiText;
      }
    }

    if (ownerEmail !== undefined) {
      const ownerText = String(ownerEmail).trim();
      if (!ownerText) {
        updateFields.userId = null;
        updateFields.status = "available";
      } else {
        const owner = await User.findOne({ where: { email: ownerText } });
        if (!owner) {
          return res.status(404).json({ error: "Owner not found" });
        }
        updateFields.userId = owner.id;
        updateFields.status = "assigned";
      }
    }

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    const oldDeviceId = device.device_uid;
    await device.update(updateFields);

    if (updateFields.device_uid && updateFields.device_uid !== oldDeviceId) {
      await Location.update(
        { device_id: updateFields.device_uid },
        { where: { device_id: oldDeviceId } }
      );
    }

    return res.json({
      message: "Device updated",
      device: device.toJSON()
    });
  } catch (err) {
    console.error("Update Device Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * List all provisioned devices (admin inventory)
 */
exports.listAllDevices = async (req, res) => {
  try {
    const devices = await Tracker.findAll({
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email"]
        }
      ],
      order: [["createdAt", "DESC"]]
    });

    const available = devices.filter(d => d.status === "available").length;
    const assigned = devices.filter(d => d.status === "assigned").length;

    return res.json({
      devices,
      total: devices.length,
      available,
      assigned
    });
  } catch (err) {
    console.error("List Devices Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * Get device detail
 */
exports.getDeviceDetail = async (req, res) => {
  try {
    const { device_id } = req.params;

    const device = await Tracker.findOne({
      where: { device_uid: device_id },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email"]
        }
      ]
    });

    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    return res.json(device);
  } catch (err) {
    console.error("Get Device Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * Revoke/unclaim device from user
 */
exports.revokeDevice = async (req, res) => {
  try {
    const { device_id } = req.params;

    const device = await Tracker.findOne({
      where: { device_uid: device_id }
    });

    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    // Update to unassigned state
    await device.update({
      status: "available",
      userId: null
    });

    return res.json({
      message: "Device unassigned successfully",
      device: device.toJSON()
    });
  } catch (err) {
    console.error("Revoke Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * Delete device from system
 */
exports.deleteDevice = async (req, res) => {
  try {
    const { device_id } = req.params;

    const device = await Tracker.findOne({
      where: { device_uid: device_id }
    });

    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    await device.destroy();

    return res.json({
      message: "Device deleted successfully"
    });
  } catch (err) {
    console.error("Delete Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * Get admin dashboard stats
 */
exports.getDashboardStats = async (req, res) => {
  try {
    const totalDevices = await Tracker.count();
    const availableDevices = await Tracker.count({
      where: { status: "available" }
    });
    const assignedDevices = await Tracker.count({
      where: { status: "assigned" }
    });
    const totalUsers = await User.count();

    return res.json({
      totalDevices,
      availableDevices,
      assignedDevices,
      totalUsers
    });
  } catch (err) {
    console.error("Stats Error:", err);
    return res.status(500).json({ error: err.message });
  }
};
