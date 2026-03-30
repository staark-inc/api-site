import bcrypt from 'bcrypt';
import crypto from 'crypto';
import db     from '../db.js';

const BCRYPT_ROUNDS     = 10;
const MAX_KEYS_PER_USER = 5;
const DEFAULT_TTL_DAYS  = 90;
const KEY_PREFIX_BASE   = 'sk_live_staark_';
const cache             = new Map(); // rawKey -> { row, expiresAt }

// ─── Helpers ───────────────────────────────────────────────────────────────

function generateRawKey() {
  const random = crypto.randomBytes(16).toString('hex');
  return `${KEY_PREFIX_BASE}${random}`;
}

function extractVisiblePrefix(rawKey) {
  return rawKey.slice(0, 24);
}

function computeExpiresAt(ttlDays) {
  if (!ttlDays) return null;
  return Math.floor(Date.now() / 1000) + ttlDays * 86400;
}

// ─── Service ───────────────────────────────────────────────────────────────

async function generate({ user_id, name, plan = 'free', ttl_days = DEFAULT_TTL_DAYS }) {
  const active = await db.get(
    `SELECT COUNT(*) as count FROM api_keys
     WHERE user_id = ? AND revoked = 0
       AND (expires_at IS NULL OR expires_at > UNIX_TIMESTAMP())`,
    [user_id]
  );

  if (active.count >= MAX_KEYS_PER_USER) {
    const err = new Error(`Maximum of ${MAX_KEYS_PER_USER} active keys allowed per user`);
    err.code   = 'MAX_KEYS_REACHED';
    err.status = 409;
    throw err;
  }

  const rawKey    = generateRawKey();
  const keyPrefix = extractVisiblePrefix(rawKey);
  const keyHash   = await bcrypt.hash(rawKey, BCRYPT_ROUNDS);
  const expiresAt = computeExpiresAt(ttl_days);

  const result = await db.run(
    `INSERT INTO api_keys (user_id, name, key_prefix, key_hash, plan, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [user_id, name ?? 'My API Key', keyPrefix, keyHash, plan, expiresAt]
  );

  return {
    id:         result.lastInsertRowid,
    key:        rawKey,
    key_prefix: keyPrefix,
    name:       name ?? 'My API Key',
    plan,
    expires_at: expiresAt,
    created_at: Math.floor(Date.now() / 1000),
  };
}

async function validate(rawKey) {
  if (!rawKey?.startsWith(KEY_PREFIX_BASE)) return null;

  const cached = cache.get(rawKey);
  if (cached && Date.now() < cached.expiresAt) return cached.row;

  const keyPrefix  = extractVisiblePrefix(rawKey);
  const candidates = await db.all(
    `SELECT * FROM api_keys
     WHERE key_prefix = ? AND revoked = 0
       AND (expires_at IS NULL OR expires_at > UNIX_TIMESTAMP())`,
    [keyPrefix]
  );

  for (const candidate of candidates) {
    const match = await bcrypt.compare(rawKey, candidate.key_hash);
    if (match) {
      await db.run(
        `UPDATE api_keys SET last_used = UNIX_TIMESTAMP() WHERE id = ?`,
        [candidate.id]
      );
      cache.set(rawKey, { row: candidate, expiresAt: Date.now() + 5 * 60 * 1000 });
      return candidate;
    }
  }

  return null;
}

async function list(user_id) {
  return db.all(
    `SELECT id, name, key_prefix, plan, expires_at, last_used, revoked, created_at
     FROM api_keys
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    [user_id]
  );
}

async function revoke(id, user_id) {
  const result = await db.run(
    `UPDATE api_keys SET revoked = 1
     WHERE id = ? AND user_id = ?`,
    [id, user_id]
  );

  if (result.changes === 0) {
    const err = new Error('Key not found or not owned by user');
    err.code   = 'NOT_FOUND';
    err.status = 404;
    throw err;
  }

  return { revoked: true };
}

export default { generate, validate, list, revoke };
