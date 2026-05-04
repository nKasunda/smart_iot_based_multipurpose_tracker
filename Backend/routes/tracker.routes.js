const express = require("express");
const router = express.Router();
const trackerController = require("../controllers/tracker.controller");
const { authenticate, requireAdmin } = require("../middleware/auth");

router.post("/ingest", trackerController.ingestSMS);
router.get("/latest", authenticate, trackerController.latest);
router.get("/stats", authenticate, trackerController.stats);
router.get("/alerts", authenticate, trackerController.alerts);
router.get("/devices", authenticate, trackerController.devices);
router.post("/devices", authenticate, requireAdmin, trackerController.registerDevice);
router.get("/history", authenticate, trackerController.history);
router.get("/:device_id/history", authenticate, trackerController.history);

module.exports = router;
