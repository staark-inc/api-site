import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt    from 'jsonwebtoken';
import db     from '../db.js';

const BCRYPT_ROUNDS      = 10;
const ACCESS_TOKEN_TTL   = '15m';
const REFRESH_TOKEN_TTL  = 30 * 24 * 60 * 60;  // 30 zile în secunde
const EMAIL_TOKEN_TTL    = 24 * 60 * 60;        // 24 ore în secunde

const JWT_SECRET         = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

// ─── Helpers ───────────────────────────────────────────────────────────────

function generateId(prefix = 'usr') {
  return prefix + '_' + crypto.randomBytes(8).toString('hex');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function signAccess(user, workspaceId) {
  return jwt.sign(
    {
      sub:          user.id,
      email:        user.email,
      display_name: user.display_name,
      plan:         'free',
      workspace_id: workspaceId,
    },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );
}

async function signRefresh(userId) {
  const raw  = generateToken();
  const hash = hashToken(raw);

  await db.run(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES (?, ?, ?)`,
    [userId, hash, Math.floor(Date.now() / 1000) + REFRESH_TOKEN_TTL]
  );

  return raw;
}

// ─── Register ──────────────────────────────────────────────────────────────

async function register({ email, password, firstName, lastName, displayName }) {
  const existing = await db.get(
    `SELECT id FROM users WHERE email = ?`,
    [email.toLowerCase()]
  );
  if (existing) {
    const err = new Error('Email already in use');
    err.code   = 'CONFLICT';
    err.status = 409;
    throw err;
  }

  const id           = generateId('usr');
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const display      = displayName || `${firstName} ${lastName}`;

  await db.run(
    `INSERT INTO users (id, email, password_hash, first_name, last_name, display_name)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, email.toLowerCase(), passwordHash, firstName, lastName, display]
  );

  const workspaceId = generateId('ws');
  await db.run(
    `INSERT INTO workspaces (id, user_id, name) VALUES (?, ?, ?)`,
    [workspaceId, id, `${firstName}'s Workspace`]
  );

  const user        = await db.get(`SELECT * FROM users WHERE id = ?`, [id]);
  const verifyToken = await createEmailToken(id, 'verify_email');

  return { user: sanitize(user), verifyToken };
}

// ─── Login ─────────────────────────────────────────────────────────────────

async function login({ email, password }) {
  const user = await db.get(
    `SELECT * FROM users WHERE email = ?`,
    [email.toLowerCase()]
  );

  if (!user) {
    const err = new Error('Invalid email or password');
    err.code   = 'UNAUTHORIZED';
    err.status = 401;
    throw err;
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    const err = new Error('Invalid email or password');
    err.code   = 'UNAUTHORIZED';
    err.status = 401;
    throw err;
  }

  let workspace = await db.get(
    `SELECT id FROM workspaces WHERE user_id = ?`,
    [user.id]
  );

  let workspaceId = workspace?.id;
  if (!workspaceId) {
    workspaceId = generateId('ws');
    await db.run(
      `INSERT INTO workspaces (id, user_id, name) VALUES (?, ?, ?)`,
      [workspaceId, user.id, `${user.first_name}'s Workspace`]
    );
  }

  const accessToken  = signAccess(user, workspaceId);
  const refreshToken = await signRefresh(user.id);

  await db.run(
    `UPDATE users SET updated_at = UNIX_TIMESTAMP() WHERE id = ?`,
    [user.id]
  );

  return { user: sanitize(user), accessToken, refreshToken };
}

// ─── Logout ────────────────────────────────────────────────────────────────

async function logout(rawRefreshToken) {
  const hash = hashToken(rawRefreshToken);
  await db.run(`DELETE FROM refresh_tokens WHERE token_hash = ?`, [hash]);
}

// ─── Refresh ───────────────────────────────────────────────────────────────

async function refresh(rawRefreshToken) {
  const hash = hashToken(rawRefreshToken);

  const row = await db.get(
    `SELECT * FROM refresh_tokens
     WHERE token_hash = ? AND expires_at > UNIX_TIMESTAMP()`,
    [hash]
  );

  if (!row) {
    const err = new Error('Invalid or expired refresh token');
    err.code   = 'UNAUTHORIZED';
    err.status = 401;
    throw err;
  }

  const user      = await db.get(`SELECT * FROM users WHERE id = ?`, [row.user_id]);
  const workspace = await db.get(`SELECT id FROM workspaces WHERE user_id = ?`, [user.id]);

  await db.run(`DELETE FROM refresh_tokens WHERE token_hash = ?`, [hash]);
  const newRefreshToken = await signRefresh(user.id);
  const accessToken     = signAccess(user, workspace?.id);

  return { accessToken, refreshToken: newRefreshToken };
}

// ─── Email verification ────────────────────────────────────────────────────

async function createEmailToken(userId, type) {
  const raw  = generateToken();
  const hash = hashToken(raw);

  await db.run(
    `DELETE FROM email_tokens WHERE user_id = ? AND type = ?`,
    [userId, type]
  );
  await db.run(
    `INSERT INTO email_tokens (user_id, token_hash, type, expires_at)
     VALUES (?, ?, ?, ?)`,
    [userId, hash, type, Math.floor(Date.now() / 1000) + EMAIL_TOKEN_TTL]
  );

  return raw;
}

async function verifyEmail(rawToken) {
  const hash = hashToken(rawToken);

  const row = await db.get(
    `SELECT * FROM email_tokens
     WHERE token_hash = ? AND type = 'verify_email' AND expires_at > UNIX_TIMESTAMP()`,
    [hash]
  );

  if (!row) {
    const err = new Error('Invalid or expired verification token');
    err.code   = 'INVALID_TOKEN';
    err.status = 400;
    throw err;
  }

  await db.run(
    `UPDATE users SET email_verified = 1, updated_at = UNIX_TIMESTAMP() WHERE id = ?`,
    [row.user_id]
  );
  await db.run(`DELETE FROM email_tokens WHERE token_hash = ?`, [hash]);

  return { verified: true };
}

// ─── Password reset ────────────────────────────────────────────────────────

async function requestPasswordReset(email) {
  const user = await db.get(
    `SELECT * FROM users WHERE email = ?`,
    [email.toLowerCase()]
  );

  if (!user) return { sent: true };

  const resetToken = await createEmailToken(user.id, 'reset_password');
  return { sent: true, resetToken, userId: user.id };
}

async function resetPassword(rawToken, newPassword) {
  const hash = hashToken(rawToken);

  const row = await db.get(
    `SELECT * FROM email_tokens
     WHERE token_hash = ? AND type = 'reset_password' AND expires_at > UNIX_TIMESTAMP()`,
    [hash]
  );

  if (!row) {
    const err = new Error('Invalid or expired reset token');
    err.code   = 'INVALID_TOKEN';
    err.status = 400;
    throw err;
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  await db.run(
    `UPDATE users SET password_hash = ?, updated_at = UNIX_TIMESTAMP() WHERE id = ?`,
    [passwordHash, row.user_id]
  );
  await db.run(`DELETE FROM email_tokens WHERE token_hash = ?`, [hash]);
  await db.run(`DELETE FROM refresh_tokens WHERE user_id = ?`, [row.user_id]);

  return { reset: true };
}

// ─── Sanitize ──────────────────────────────────────────────────────────────

function sanitize(user) {
  const { password_hash, ...safe } = user;
  return safe;
}

export default {
  register,
  login,
  logout,
  refresh,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  createEmailToken,
};
