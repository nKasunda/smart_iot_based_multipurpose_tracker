const express = require('express');
const router = express.Router();
const pool = require('../db');
const { adminOnly } = require('../middleware/auth');

// ----------------------------
// GET: View devices
// ----------------------------
router.get('/', async (req, res) => {
  try {
    let result;

    if (req.user.role === 'admin') {
      // Admin sees all devices
      result = await pool.query('SELECT * FROM devices');
    } else {
      // User sees only their devices
      result = await pool.query(
        'SELECT * FROM devices WHERE user_id = $1',
        [req.user.id]
      );
    }

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ----------------------------
// POST: Create device (Admin only)
// ----------------------------
router.post('/', adminOnly, async (req, res) => {
  try {
    const { name, user_id } = req.body;

    if (!name || !user_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await pool.query(
      'INSERT INTO devices (name, user_id) VALUES ($1, $2) RETURNING *',
      [name,user_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ----------------------------
// DELETE: Remove device (Admin only)
// ----------------------------
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query('DELETE FROM devices WHERE id = $1', [id]);

    res.json({ message: 'Device deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});
//--------------------------------------
//GET: Check device status
//--------------------------------------

router.get('/status/:device_id', async (req, res) => {
  try {
    const { device_id } = req.params;

    const result = await pool.query(
      'SELECT id, last_seen_at FROM devices WHERE id = $1',
      [device_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const device = result.rows[0];

    let status = 'offline';

    if (device.last_seen_at) {
      const lastSeen = new Date(device.last_seen_at);
      const now = new Date();

      const diffSeconds = (now - lastSeen) / 1000;

      if (diffSeconds <= 120) {
        status = 'online';
      }
    }

    res.json({
      device_id,
      status,
      last_seen_at: device.last_seen_at
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;