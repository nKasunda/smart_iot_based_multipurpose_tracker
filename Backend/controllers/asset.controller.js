const { Asset, Tracker } = require("../models");

/**
 * GET all assets
 */
exports.getAssets = async (req, res) => {
  try {
    const assets = await Asset.findAll({
      include: [
        {
          model: Tracker,
          attributes: ["device_uid", "status", "battery", "lastSeen"],
        },
      ],
    });

    res.json(assets);
  } catch (err) {
    console.error("Get assets error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * CREATE asset
 */
exports.createAsset = async (req, res) => {
  try {
    const { name, type, trackerId } = req.body;

    const asset = await Asset.create({
      name,
      type,
      trackerId,
    });

    res.json(asset);
  } catch (err) {
    console.error("Create asset error:", err);
    res.status(500).json({ message: "Server error" });
  }
};