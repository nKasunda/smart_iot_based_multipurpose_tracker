// index.js
require('dotenv').config();

const express = require('express');
const bcrypt = require('bcryptjs');
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

async function seedDefaultAdmin() {
  const adminEmail = process.env.DEMO_ADMIN_EMAIL || 'admin@tracker.local';
  const adminPassword = process.env.DEMO_ADMIN_PASSWORD || 'Admin123!';
  const adminName = process.env.DEMO_ADMIN_NAME || 'System Administrator';
  const adminPhone = process.env.DEMO_ADMIN_PHONE || '+27000000000';

  try {
    const existingAdmin = await pool.query(
      'SELECT id FROM users WHERE email = $1 LIMIT 1',
      [adminEmail]
    );

    if (existingAdmin.rows.length > 0) {
      console.log(`Demo admin ready: ${adminEmail}`);
      return;
    }

    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await pool.query(
      `INSERT INTO users (name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)`,
      [adminName, adminEmail, adminPhone, passwordHash, 'admin']
    );

    console.log(`Seeded demo admin account: ${adminEmail}`);
  } catch (error) {
    console.error('Failed to seed demo admin account:', error.message);
  }
}

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  await seedDefaultAdmin();
});
