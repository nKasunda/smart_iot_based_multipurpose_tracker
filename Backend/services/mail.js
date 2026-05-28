'use strict';

const dns = require('dns');
const net = require('net');
const nodemailer = require('nodemailer');
const tls = require('tls');

let transporter;

function envValue(name) {
  return String(process.env[name] || '').trim();
}

function smtpHost() {
  return envValue('SMTP_HOST');
}

function smtpUser() {
  return envValue('SMTP_USER');
}

function smtpPass() {
  const pass = envValue('SMTP_PASS');
  const host = smtpHost().toLowerCase();

  // Gmail shows app passwords grouped with spaces. SMTP auth expects the
  // 16-character password, so accept either format in the deployment env.
  if (host.includes('gmail.com')) return pass.replace(/\s+/g, '');
  return pass;
}

function smtpForceIPv4() {
  return envValue('SMTP_FORCE_IPV4').toLowerCase() !== 'false';
}

function emailEnabled() {
  return !!(smtpHost() && smtpUser() && smtpPass());
}

function createIPv4Socket(options, callback) {
  const host = options.host;
  const port = Number(options.port || 587);
  const timeout = Number(process.env.SMTP_TIMEOUT_MS || 8000);

  dns.resolve4(host, (resolveErr, addresses) => {
    if (resolveErr) return callback(resolveErr);
    const address = addresses?.[0];
    if (!address) return callback(new Error(`No IPv4 address found for SMTP host ${host}`));

    let done = false;
    const complete = (err, socketOptions) => {
      if (done) return;
      done = true;
      callback(err, socketOptions);
    };

    const socketOptions = {
      host: address,
      port,
      servername: host,
      timeout,
    };
    const socket = options.secure
      ? tls.connect({ ...socketOptions, ...(options.tls || {}) }, () => {
          socket.removeListener('error', onError);
          complete(null, { connection: socket, secured: true });
        })
      : net.connect(socketOptions, () => {
          socket.removeListener('error', onError);
          complete(null, { connection: socket });
        });

    function onError(err) {
      complete(err);
    }

    socket.once('error', onError);
    socket.once('timeout', () => {
      socket.destroy();
      complete(new Error(`SMTP connection timed out for ${host}:${port}`));
    });
  });
}

function getTransporter() {
  if (!emailEnabled()) return null;
  if (transporter) return transporter;

  const transportOptions = {
    host: smtpHost(),
    port: Number(process.env.SMTP_PORT || 587),
    secure: envValue('SMTP_SECURE').toLowerCase() === 'true',
    connectionTimeout: Number(process.env.SMTP_TIMEOUT_MS || 8000),
    greetingTimeout: Number(process.env.SMTP_TIMEOUT_MS || 8000),
    socketTimeout: Number(process.env.SMTP_TIMEOUT_MS || 8000),
    auth: {
      user: smtpUser(),
      pass: smtpPass(),
    },
  };

  if (smtpForceIPv4()) {
    transportOptions.getSocket = createIPv4Socket;
  }

  transporter = nodemailer.createTransport(transportOptions);

  return transporter;
}

function fromAddress() {
  return envValue('SMTP_FROM') || envValue('MAIL_FROM') || smtpUser();
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function sendMail(options) {
  const tx = getTransporter();
  if (!tx) {
    console.warn('Email delivery is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS, and SMTP_FROM.');
    return { sent: false, reason: 'not_configured' };
  }

  await tx.sendMail({
    from: fromAddress(),
    ...options,
  });

  return { sent: true };
}

async function sendVerificationEmail({ to, name, verificationCode, verificationUrl }) {
  const displayName = name || 'there';
  const htmlName = escapeHtml(displayName);
  const htmlCode = escapeHtml(verificationCode);
  const htmlUrl = escapeHtml(verificationUrl);
  const codeText = verificationCode
    ? `Your verification code is: ${verificationCode}`
    : `Open this link to verify your email address: ${verificationUrl}`;
  return sendMail({
    to,
    subject: 'Verify your TrackA account',
    text: [
      `Hi ${displayName},`,
      '',
      'Your TrackA account has been created.',
      codeText,
      '',
      'This code expires in 15 minutes. If it expires, request a new code from the verify email page.',
      '',
      'If you did not create this account, you can ignore this email.',
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.55;color:#111827">
        <h2 style="margin:0 0 12px">Verify your TrackA account</h2>
        <p>Hi ${htmlName},</p>
        <p>Your TrackA account has been created. Enter this verification code in the app:</p>
        ${verificationCode
          ? `<div style="display:inline-block;letter-spacing:8px;font-size:28px;font-weight:800;background:#f3f4f6;color:#000080;border:1px solid #dbeafe;border-radius:10px;padding:12px 16px">${htmlCode}</div>`
          : `<p><a href="${htmlUrl}" style="display:inline-block;background:#000080;color:#fff;text-decoration:none;padding:12px 16px;border-radius:8px;font-weight:700">Verify email</a></p>`}
        <p style="font-size:13px;color:#4b5563">This code expires in 15 minutes. If it expires, request a new code from the verify email page.</p>
      </div>
    `,
  });
}

async function sendPasswordResetEmail({ to, name, resetUrl }) {
  const displayName = name || 'there';
  const htmlName = escapeHtml(displayName);
  const htmlUrl = escapeHtml(resetUrl);
  return sendMail({
    to,
    subject: 'Reset your TrackA password',
    text: [
      `Hi ${displayName},`,
      '',
      'We received a request to reset your TrackA password. Open this link to choose a new password:',
      resetUrl,
      '',
      'This link expires in 1 hour. If you did not request this, you can ignore this email.',
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.55;color:#111827">
        <h2 style="margin:0 0 12px">Reset your TrackA password</h2>
        <p>Hi ${htmlName},</p>
        <p>We received a request to reset your TrackA password. Use the button below to choose a new password.</p>
        <p>
          <a href="${htmlUrl}" style="display:inline-block;background:#000080;color:#fff;text-decoration:none;padding:12px 16px;border-radius:8px;font-weight:700">
            Reset password
          </a>
        </p>
        <p style="font-size:13px;color:#4b5563">This link expires in 1 hour. If you did not request this, you can ignore this email.</p>
        <p style="font-size:12px;color:#6b7280">If the button does not work, copy and paste this link into your browser:<br>${htmlUrl}</p>
      </div>
    `,
  });
}

module.exports = {
  emailEnabled,
  sendPasswordResetEmail,
  sendVerificationEmail,
};
