// index.js
require('dotenv').config();

const express = require('express');git
const pool = require('./db'); // PostgreSQL connection
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const { verifyToken, adminOnly } = require('./middleware/auth');
const devicesRouter = require('./routes/devices');
const locationRouter = require('./routes/location');

const app = express();
app.use(express.json());

// ----------------------------
// Routes
// ----------------------------
app.use('/auth', authRouter);
app.use('/users', verifyToken, adminOnly, usersRouter);
app.use('/devices', verifyToken, devicesRouter);
app.use('/location', verifyToken, locationRouter);

// Root route
app.get('/', (req, res) => res.json({ message: 'IoT Tracking API is running.' }));

// DB test route
app.get('/db-test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() AS current_time');
    res.json({ message: 'Database connected successfully.', time: result.rows[0].current_time });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));