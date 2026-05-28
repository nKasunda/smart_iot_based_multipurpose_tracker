'use strict';

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const https = require('https');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { User } = require('../models');
const { sendPasswordResetEmail, sendVerificationEmail } = require('../services/mail');

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

function makeVerificationCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function buildVerificationUrl(req, token) {
  return `${getAppOrigin(req).replace(/\/$/, '')}/verify-email?token=${encodeURIComponent(token)}`;
}

function buildPasswordResetUrl(req, token) {
  return `${getAppOrigin(req).replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;
}

async function deliverVerificationEmail(req, user) {
  const verificationUrl = buildVerificationUrl(req, user.verificationToken);
  const isCode = /^\d{6}$/.test(String(user.verificationToken || ''));
  let delivery;

  try {
    delivery = await sendVerificationEmail({
      to: user.email,
      name: user.name,
      verificationCode: isCode ? user.verificationToken : null,
      verificationUrl: isCode ? null : verificationUrl,
    });
  } catch (err) {
    console.error('Verification email delivery failed:', err.message);
    delivery = { sent: false, reason: 'send_failed' };
  }

  if (!delivery.sent) {
    console.warn(`Email verification for ${user.email}: ${isCode ? user.verificationToken : verificationUrl}`);
  }

  return {
    verificationUrl,
    emailSent: delivery.sent,
  };
}

async function deliverPasswordResetEmail(req, user) {
  const resetUrl = buildPasswordResetUrl(req, user.passwordResetToken);
  let delivery;

  try {
    delivery = await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetUrl,
    });
  } catch (err) {
    console.error('Password reset email delivery failed:', err.message);
    delivery = { sent: false, reason: 'send_failed' };
  }

  if (!delivery.sent) {
    console.warn(`Password reset for ${user.email}: ${resetUrl}`);
  }

  return {
    resetUrl,
    emailSent: delivery.sent,
  };
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
    const verificationToken = makeVerificationCode();
    const verificationExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
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

    const delivery = await deliverVerificationEmail(req, user);
    return res.json({
      message: delivery.emailSent
        ? 'Account created. Enter the verification code sent to your email.'
        : 'Account created, but email delivery is not configured. Ask the administrator to configure SMTP, then resend verification.',
      emailSent: delivery.emailSent,
      email,
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
    const email = String(req.body?.email || '').trim().toLowerCase();
    const code = String(req.body?.code || '').replace(/\D/g, '').slice(0, 6);
    if (!token && (!email || !code)) {
      return res.status(400).json({ error: 'Enter your email address and the 6-digit verification code.' });
    }

    const user = token
      ? await User.findOne({ where: { verificationToken: token } })
      : await User.findOne({ where: { email, verificationToken: code } });
    if (!user) return res.status(400).json({ error: 'Invalid verification code' });
    if (user.verificationExpiresAt && new Date(user.verificationExpiresAt).getTime() < Date.now()) {
      return res.status(400).json({ error: 'Verification code has expired. Request a new code and try again.' });
    }

    user.emailVerified = true;
    user.verificationToken = null;
    user.verificationExpiresAt = null;
    await user.save();

    const authToken = signToken(user);
    return res.json({
      message: 'Email verified. Opening your dashboard.',
      token: authToken,
      user: publicUser(user),
    });
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
      user.verificationToken = makeVerificationCode();
      user.verificationExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
      await user.save();
      const delivery = await deliverVerificationEmail(req, user);
      return res.json({
        message: delivery.emailSent
          ? 'A new verification code has been sent. Check your inbox and spam folder.'
          : 'Verification was renewed, but email delivery is not configured. Ask the administrator to configure SMTP.',
        emailSent: delivery.emailSent,
        email,
      });
    }

    return res.json({ message: 'If that email needs verification, a new verification code will be sent.' });
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
      user.passwordResetToken = makeVerificationToken();
      user.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await user.save();
      const delivery = await deliverPasswordResetEmail(req, user);

      return res.json({
        message: delivery.emailSent
          ? "If an account exists for that email, password reset instructions have been sent. Check your inbox and spam folder."
          : "Password reset was requested, but email delivery is not configured. Ask the administrator to configure SMTP.",
        emailSent: delivery.emailSent,
        resetUrl: process.env.NODE_ENV === "production" ? undefined : delivery.resetUrl,
      });
    }

    return res.json({
      message: "If an account exists for that email, reset instructions will be sent.",
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const token = String(req.body?.token || req.query?.token || '').trim();
    const password = String(req.body?.password || '');

    if (!token) return res.status(400).json({ error: 'Password reset token is required' });
    if (password.length < 8) {
      return res.status(400).json({ error: 'Use a password with at least 8 characters.' });
    }

    const user = await User.scope('withPassword').findOne({ where: { passwordResetToken: token } });
    if (!user) return res.status(400).json({ error: 'Invalid password reset token' });
    if (user.passwordResetExpiresAt && new Date(user.passwordResetExpiresAt).getTime() < Date.now()) {
      return res.status(400).json({ error: 'Password reset link has expired. Request a new reset email.' });
    }

    user.password = await bcrypt.hash(password, 10);
    user.passwordResetToken = null;
    user.passwordResetExpiresAt = null;
    await user.save();

    return res.json({ message: 'Password reset. You can now sign in with your new password.' });
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
