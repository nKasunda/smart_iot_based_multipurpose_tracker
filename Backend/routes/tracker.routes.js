const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();
const trackerController = require("../controllers/tracker.controller");
const { authenticate, requireAdmin } = require("../middleware/auth");

const developerLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: "Developer API rate limit reached. Wait a minute and try again." },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/ingest", trackerController.ingestSMS);
router.get("/time", authenticate, trackerController.serverTime);
router.get("/latest", authenticate, trackerController.latest);
router.get("/stats", authenticate, trackerController.stats);
router.get("/alerts", authenticate, trackerController.alerts);
router.get("/devices", authenticate, trackerController.devices);
router.get("/devices/:device_id/integration", authenticate, trackerController.deviceIntegration);
router.post("/devices", authenticate, requireAdmin, trackerController.registerDevice);
router.get("/developer/latest", developerLimiter, trackerController.developerLatest);
router.get("/developer/history", developerLimiter, trackerController.developerHistory);
router.get("/history", authenticate, trackerController.history);
router.get("/:device_id/history", authenticate, trackerController.history);

module.exports = router;
