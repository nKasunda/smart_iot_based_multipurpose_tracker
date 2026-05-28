'use strict';

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const https = require('https');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { User } = require('../models');

let firebaseCertCache = { expiresAt: 0, certs: null };

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

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    emailVerified: !!user.emailVerified,
    authProvider: user.authProvider || 'password',
    settings: user.settings || {}
  };
}

function base64UrlDecode(value) {
  const text = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(text.padEnd(text.length + ((4 - (text.length % 4)) % 4), '='), 'base64');
}

function getAppOrigin(req) {
  return (
    process.env.FRONTEND_URL ||
    req.get?.('origin') ||
    'http://localhost:3000'
  );
}

function makeVerificationToken() {
  return crypto.randomBytes(32).toString('hex');
}

function buildVerificationUrl(req, token) {
  return `${getAppOrigin(req).replace(/\/$/, '')}/verify-email?token=${encodeURIComponent(token)}`;
}

async function getFirebaseCerts() {
  if (firebaseCertCache.certs && firebaseCertCache.expiresAt > Date.now()) {
    return firebaseCertCache.certs;
  }

  const url = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
  const { body, headers } = await new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`Firebase cert fetch failed with status ${res.statusCode}`));
            return;
          }
          resolve({ body, headers: res.headers });
        });
      })
      .on('error', reject);
  });

  const maxAge = String(headers['cache-control'] || '').match(/max-age=(\d+)/)?.[1];
  firebaseCertCache = {
    certs: JSON.parse(body),
    expiresAt: Date.now() + (Number(maxAge || 300) * 1000),
  };
  return firebaseCertCache.certs;
}

async function verifyFirebaseIdToken(idToken) {
  const projectId = process.env.FIREBASE_PROJECT_ID || 'iot-tracker-951c2';
  const parts = String(idToken || '').split('.');
  if (parts.length !== 3) throw new Error('Invalid Google token');

  const header = JSON.parse(base64UrlDecode(parts[0]).toString('utf8'));
  const payload = JSON.parse(base64UrlDecode(parts[1]).toString('utf8'));
  const certs = await getFirebaseCerts();
  const cert = certs[header.kid];
  if (!cert) throw new Error('Unknown Google token key');

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${parts[0]}.${parts[1]}`);
  verifier.end();
  const valid = verifier.verify(cert, base64UrlDecode(parts[2]));
  if (!valid) throw new Error('Invalid Google token signature');

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) throw new Error('Google token expired');
  if (payload.aud !== projectId) throw new Error('Google token audience mismatch');
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new Error('Google token issuer mismatch');
  }
  if (!payload.sub) throw new Error('Google token subject missing');
  if (!payload.email || payload.email_verified !== true) {
    throw new Error('Google account email is not verified');
  }

  return payload;
}

exports.register = async (req, res) => {
  try {
    const { name, password } = req.body || {};
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email || !password) {
      return res.status(400).json({ error: 'Enter both your email address and password.' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Use a password with at least 6 characters.' });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'That email is already registered. Try signing in instead.' });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    const role = 'user';
    const verificationToken = makeVerificationToken();
    const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const user = await User.create({
      name: name || null,
      email,
      password: passwordHash,
      role,
      emailVerified: false,
      verificationToken,
      verificationExpiresAt,
      authProvider: 'password',
    });

    const verificationUrl = buildVerificationUrl(req, verificationToken);
    console.log(`Email verification for ${email}: ${verificationUrl}`);
    return res.json({
      message: 'Account created. Verify your email before signing in.',
      verificationUrl: process.env.NODE_ENV === 'production' ? undefined : verificationUrl,
      user: publicUser(user)
    });
  } catch (err) {
    return res.status(500).json({ error: 'Could not create the account right now. Please try again.' });
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
      return res.status(400).json({ error: 'Enter both your email address and password.' });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'That email is already registered.' });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    const user = await User.create({
      name: name || null,
      email,
      password: passwordHash,
      role: 'admin',
      emailVerified: true,
      authProvider: 'password'
    });

    const token = signToken(user);
    return res.json({
      token,
      user: publicUser(user)
    });
  } catch (err) {
    return res.status(500).json({ error: 'Could not create the admin account right now. Please try again.' });
  }
};

exports.login = async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const { password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Enter both your email address and password.' });
    }

    const user = await User.scope('withPassword').findOne({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(String(password), String(user.password || ''));
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    if (!user.emailVerified) {
      return res.status(403).json({ error: 'Please verify your email before signing in.' });
    }

    const token = signToken(user);
    return res.json({
      token,
      user: publicUser(user)
    });
  } catch (err) {
    return res.status(500).json({ error: 'Sign in is temporarily unavailable. Please try again.' });
  }
};

exports.googleSignIn = async (req, res) => {
  try {
    const decoded = await verifyFirebaseIdToken(req.body?.idToken);
    const email = String(decoded.email || '').trim().toLowerCase();

    let user = await User.findOne({
      where: {
        [Op.or]: [
          { googleSub: decoded.sub },
          { email },
        ],
      },
    });

    if (!user) {
      user = await User.create({
        name: decoded.name || email.split('@')[0],
        email,
        password: null,
        role: 'user',
        emailVerified: true,
        verificationToken: null,
        verificationExpiresAt: null,
        authProvider: 'google',
        googleSub: decoded.sub,
      });
    } else {
      user.emailVerified = true;
      user.verificationToken = null;
      user.verificationExpiresAt = null;
      user.googleSub = user.googleSub || decoded.sub;
      user.authProvider = user.authProvider === 'password' ? 'password_google' : (user.authProvider || 'google');
      if (!user.name && decoded.name) user.name = decoded.name;
      await user.save();
    }

    const token = signToken(user);
    return res.json({ token, user: publicUser(user) });
  } catch (err) {
    return res.status(401).json({ error: err.message || 'Google sign-in failed' });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const token = String(req.body?.token || req.query?.token || '').trim();
    if (!token) return res.status(400).json({ error: 'Verification token is required' });

    const user = await User.findOne({ where: { verificationToken: token } });
    if (!user) return res.status(400).json({ error: 'Invalid verification token' });
    if (user.verificationExpiresAt && new Date(user.verificationExpiresAt).getTime() < Date.now()) {
      return res.status(400).json({ error: 'Verification token has expired' });
    }

    user.emailVerified = true;
    user.verificationToken = null;
    user.verificationExpiresAt = null;
    await user.save();

    return res.json({ message: 'Email verified. You can now sign in.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.resendVerification = async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'email is required' });

    const user = await User.findOne({ where: { email } });
    if (user && !user.emailVerified) {
      user.verificationToken = makeVerificationToken();
      user.verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await user.save();
      const verificationUrl = buildVerificationUrl(req, user.verificationToken);
      console.log(`Email verification for ${email}: ${verificationUrl}`);
      return res.json({
        message: 'If that email needs verification, a new verification link will be sent.',
        verificationUrl: process.env.NODE_ENV === 'production' ? undefined : verificationUrl,
      });
    }

    return res.json({ message: 'If that email needs verification, a new verification link will be sent.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ error: "email is required" });
    }

    const user = await User.findOne({ where: { email } });
    if (user) {
      console.log(`Password reset requested for ${email}. Configure email delivery to send reset links.`);
    }

    return res.json({
      message: "If an account exists for that email, reset instructions will be sent.",
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.me = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'name', 'email', 'role', 'emailVerified', 'authProvider', 'settings', 'createdAt', 'updatedAt']
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json(user);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
