const express = require("express");
const router = express.Router();
const trackerController = require("../controllers/tracker.controller");

// Tracker endpoints
router.post("/update", trackerController.updateTrackerLocation);
router.get("/:trackerId/history", trackerController.getTrackerHistory);

// Dashboard
router.get("/stats", trackerController.getDashboardStats);
router.get("/alerts", trackerController.getRecentAlerts);
router.get("/", trackerController.getActiveTrackers);


module.exports = router;
