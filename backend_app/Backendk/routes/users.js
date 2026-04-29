// routes/users.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get all users (admin only)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, role, created_at FROM users');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;