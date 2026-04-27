// routes/admin.routes.js

const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");
const { authenticate } = require("../middleware/auth");

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

// All admin routes require authentication
router.use(authenticate);
router.use(requireAdmin);

// Device provisioning
router.post("/devices", adminController.provisionDevice);

// List all devices
router.get("/devices", adminController.listAllDevices);

// Get device detail
router.get("/devices/:device_id", adminController.getDeviceDetail);

// Update device (e.g., set IMEI on legacy rows)
router.patch("/devices/:device_id", adminController.updateDevice);

// Revoke/unclaim device
router.post("/devices/:device_id/revoke", adminController.revokeDevice);

// Delete device
router.delete("/devices/:device_id", adminController.deleteDevice);

// Dashboard stats
router.get("/stats", adminController.getDashboardStats);

module.exports = router;
