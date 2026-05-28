const express = require("express");
const rateLimit = require("express-rate-limit");
const trackerController = require("../controllers/tracker.controller");

const router = express.Router();

const perDeviceLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  keyGenerator: (req) => {
    const auth = req.headers.authorization || "";
    return `${req.params.device_id || "unknown"}:${auth}`;
  },
  message: { error: "RATE_LIMITED", message: "Rate limit reached for this device. Wait a minute and try again.", status: 429 },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/devices/:device_id/telemetry", perDeviceLimiter, trackerController.ingestTelemetryV1);
router.get("/devices/:device_id/latest", perDeviceLimiter, trackerController.developerLatest);
router.get("/devices/:device_id/history", perDeviceLimiter, trackerController.developerHistory);

module.exports = router;
