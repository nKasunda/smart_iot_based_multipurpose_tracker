// routes/user.routes.js

const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const { authenticate } = require("../middleware/auth");

// All user routes require authentication
router.use(authenticate);

// Claim a device
router.post("/devices/claim", userController.claimDevice);

// Get user's claimed devices
router.get("/devices", userController.getUserDevices);

// Unclaim a device
router.delete("/devices/:device_id/unclaim", userController.unclaimDevice);

module.exports = router;
