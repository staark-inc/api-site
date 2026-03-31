import { authenticator } from 'otplib';
import qrcode from 'qrcode';
import db from '../db.js';

const APP_NAME = 'Staark';

async function generateSetup(userId, email) {
  const secret = authenticator.generateSecret();
  const otpauthUrl = authenticator.keyuri(email, APP_NAME, secret);
  const qrSvg = await qrcode.toString(otpauthUrl, { type: 'svg', margin: 1 });

  // Store as pending (not yet enabled)
  await db.run(
    `UPDATE users SET totp_secret = ? WHERE id = ?`,
    [secret, userId]
  );

  return { secret, otpauthUrl, qrSvg };
}

function verify(secret, code) {
  try {
    return authenticator.verify({ token: code, secret });
  } catch {
    return false;
  }
}

async function enable(userId, code) {
  const user = await db.get(`SELECT totp_secret FROM users WHERE id = ?`, [userId]);
  if (!user?.totp_secret) {
    const err = new Error('TOTP not set up. Call /setup first.');
    err.code = 'TOTP_NOT_SETUP';
    err.status = 400;
    throw err;
  }
  if (!verify(user.totp_secret, code)) {
    const err = new Error('Invalid TOTP code');
    err.code = 'INVALID_CODE';
    err.status = 400;
    throw err;
  }
  await db.run(`UPDATE users SET totp_enabled = 1 WHERE id = ?`, [userId]);
  return { enabled: true };
}

async function disable(userId, code) {
  const user = await db.get(`SELECT totp_secret, totp_enabled FROM users WHERE id = ?`, [userId]);
  if (!user?.totp_enabled) {
    const err = new Error('2FA is not enabled');
    err.code = 'TOTP_NOT_ENABLED';
    err.status = 400;
    throw err;
  }
  if (!verify(user.totp_secret, code)) {
    const err = new Error('Invalid TOTP code');
    err.code = 'INVALID_CODE';
    err.status = 400;
    throw err;
  }
  await db.run(`UPDATE users SET totp_secret = NULL, totp_enabled = 0 WHERE id = ?`, [userId]);
  return { disabled: true };
}

async function getStatus(userId) {
  const user = await db.get(`SELECT totp_enabled FROM users WHERE id = ?`, [userId]);
  return { totp_enabled: !!user?.totp_enabled };
}

export default { generateSetup, verify, enable, disable, getStatus };
