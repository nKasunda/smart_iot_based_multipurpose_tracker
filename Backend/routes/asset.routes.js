const router = require("express").Router();
const assetController = require("../controllers/asset.controller");

router.get("/", assetController.getAssets);
router.post("/", assetController.createAsset);

module.exports = router;