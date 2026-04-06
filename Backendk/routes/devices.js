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
    const { name, type, user_id } = req.body;

    if (!name || !type || !user_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await pool.query(
      'INSERT INTO devices (name, type, user_id) VALUES ($1, $2, $3) RETURNING *',
      [name, type, user_id]
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

module.exports = router;