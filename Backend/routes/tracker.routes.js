const express = require("express");
const router = express.Router();
const trackerController = require("../controllers/tracker.controller");

router.post("/ingest", trackerController.ingestSMS);
router.get("/latest", trackerController.latest);
router.get("/stats", trackerController.stats);
router.get("/alerts", trackerController.alerts);

module.exports = router;
