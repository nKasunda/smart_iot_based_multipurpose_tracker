/**
 * Cleanup script to remove all devices with null device_uid from the system inventory
 * Run with: node cleanup-null-devices.js
 */

const { Tracker } = require("./models");
const sequelize = require("./config/db");

async function cleanupNullDevices() {
  try {
    console.log("Connecting to database...");
    await sequelize.authenticate();
    console.log("Database connected successfully.");

    console.log("Searching for devices with null device_uid...");
    const nullDevices = await Tracker.findAll({
      where: {
        device_uid: null
      }
    });

    if (nullDevices.length === 0) {
      console.log("No devices with null device_uid found. System is clean.");
      process.exit(0);
    }

    console.log(`Found ${nullDevices.length} device(s) with null device_uid.`);
    console.log("Deleting these devices...");

    const deletedCount = await Tracker.destroy({
      where: {
        device_uid: null
      }
    });

    console.log(`✓ Successfully deleted ${deletedCount} device(s) with null device_uid.`);
    console.log("Cleanup complete!");
    process.exit(0);
  } catch (err) {
    console.error("Error during cleanup:", err);
    process.exit(1);
  }
}

cleanupNullDevices();
