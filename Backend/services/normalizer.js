const { Tracker, Location } = require('../models');

/**
 * Detect data source type
 */
function detectSource(data) {
  if (data.message && data.sender) return 'sms';
  if (data.imei) return 'gps_tracker';
  if (data.device_id) return 'http_device';
  return 'unknown';
}

/**
 * Normalize to unified format
 * Returns: {device_id, lat, lng, speed, battery, timestamp}
 */
function normalizeData(data, source) {
  let normalized = {
    device_id: null,
    lat: null,
    lng: null,
    speed: 0,
    battery: null,
    timestamp: new Date()
  };

  if (source === 'http_device') {
    normalized.device_id = data.device_id;
    normalized.lat = parseFloat(data.lat);
    normalized.lng = parseFloat(data.lng);
    normalized.speed = parseFloat(data.speed) || 0;
    const parsedBattery = Number.parseInt(data.battery, 10);
    normalized.battery = Number.isFinite(parsedBattery) ? parsedBattery : null;
  } else if (source === 'sms') {
    const text = data.message;
    const latMatch = text.match(/LAT:([-\\d.]+)/)?.[1];
    const lngMatch = text.match(/LON:([-\\d.]+)/)?.[1];
    const batMatch = text.match(/BAT:(\\d+)/)?.[1];

    normalized.device_id = data.sender;
    normalized.lat = parseFloat(latMatch);
    normalized.lng = parseFloat(lngMatch);
    normalized.battery = batMatch ? parseInt(batMatch) : null;
  } else if (source === 'gps_tracker') {
    normalized.device_id = data.imei;
    normalized.lat = parseFloat(data.lat);
    normalized.lng = parseFloat(data.lng);
    normalized.speed = parseFloat(data.speed) || 0;
  }

  return normalized;
}

/**
 * Ensure device registered
 */
async function ensureDeviceExists(device_uid, type) {
  let device = await Tracker.findOne({ where: { device_uid } });
  if (!device) {
    device = await Tracker.create({
      device_uid,
      status: 'active',
      type: type || 'unknown'
    });
    return device;
  }
  if (type && device.type !== type) {
    await device.update({ type });
  }
  return device;
}

module.exports = {
  detectSource,
  normalizeData,
  ensureDeviceExists
};
