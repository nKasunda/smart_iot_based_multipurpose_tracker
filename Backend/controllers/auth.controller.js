'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  return secret;
}

function signToken(user) {
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role || 'user' },
    jwtSecret(),
    { expiresIn }
  );
}

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password required' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'password must be at least 6 chars' });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'email already in use' });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    const role = 'user';
    const user = await User.create({ name: name || null, email, password: passwordHash, role });

    const token = signToken(user);
    return res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// Optional admin bootstrap (set ADMIN_REGISTER_TOKEN in env to enable)
exports.registerAdmin = async (req, res) => {
  try {
    const { name, email, password, admin_token } = req.body || {};
    const expected = process.env.ADMIN_REGISTER_TOKEN;
    if (!expected) {
      return res.status(404).json({ error: 'Admin registration disabled' });
    }
    if (!admin_token || admin_token !== expected) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password required' });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'email already in use' });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    const user = await User.create({
      name: name || null,
      email,
      password: passwordHash,
      role: 'admin'
    });

    const token = signToken(user);
    return res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password required' });
    }

    const user = await User.scope('withPassword').findOne({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(String(password), String(user.password || ''));
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken(user);
    return res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.me = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'name', 'email', 'role', 'createdAt', 'updatedAt']
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json(user);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
