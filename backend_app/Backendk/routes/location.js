const express = require('express');
const router = express.Router();
const pool = require('../db');

// ------------------------------------
// POST /location → Save device location
// ------------------------------------
router.post('/', async (req, res) => {
  try {
  const {
  device_id,
  latitude,
  longitude,
  altitude_m,
  // speed_kmh,
  accuracy_m,
  gsm_signal
} = req.body;

// Convert to numbers
const lat = parseFloat(latitude);
const lon = parseFloat(longitude);
// const speed = speed_kmh ? parseFloat(speed_kmh) : null;

    // Validate required fields
    if (!device_id || isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ error: 'device_id, latitude and longitude are required' });
    }

    // Check if device exists
    const device = await pool.query(
      'SELECT * FROM devices WHERE id = $1',
      [device_id]
    );

    if (device.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const deviceData = device.rows[0];

    // Authorization check
    if (
      req.user.role !== 'admin' &&
      deviceData.user_id !== req.user.id
    ) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Insert location
    const result = await pool.query(
      `INSERT INTO location_logs
      (device_id, latitude, longitude, altitude_m, speed_kmh, accuracy_m, gsm_signal, recorded_at)
      VALUES ($1,$2,$3,$4,$5,$6,NOW())
      RETURNING *`,
      [
        device_id,
        lat,
        lon,
        altitude_m || null,
        // speed,
        accuracy_m || null,
        gsm_signal || null
      ]
    );

    // Update last seen timestamp
    await pool.query(
      'UPDATE devices SET last_seen_at = NOW() WHERE id = $1',
      [device_id]
    );

    res.status(201).json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// ------------------------------------
// GET /location/latest/:device_id
// Latest location (IMPORTANT: must come BEFORE /:device_id)
// ------------------------------------
router.get('/latest/:device_id', async (req, res) => {
  try {
    const { device_id } = req.params;

    const device = await pool.query(
      'SELECT * FROM devices WHERE id = $1',
      [device_id]
    );

    if (device.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const deviceData = device.rows[0];

    if (
      req.user.role !== 'admin' &&
      deviceData.user_id !== req.user.id
    ) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const result = await pool.query(
      `SELECT *
       FROM location_logs
       WHERE device_id = $1
       ORDER BY recorded_at DESC
       LIMIT 1`,
      [device_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No location data found' });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// ------------------------------------
// GET /location/:device_id
// Full location history
// ------------------------------------
router.get('/:device_id', async (req, res) => {
  try {
    const { device_id } = req.params;

    const device = await pool.query(
      'SELECT * FROM devices WHERE id = $1',
      [device_id]
    );

    if (device.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const deviceData = device.rows[0];

    if (
      req.user.role !== 'admin' &&
      deviceData.user_id !== req.user.id
    ) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const result = await pool.query(
      `SELECT *
       FROM location_logs
       WHERE device_id = $1
       ORDER BY recorded_at DESC`,
      [device_id]
    );

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


module.exports = router;