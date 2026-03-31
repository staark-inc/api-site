import db from '../db.js';

/**
 * Loghează o acțiune de audit non-blocking (fire-and-forget).
 * Nu aruncă niciodată erori spre caller.
 */
function log(user_id, action, entity_type = null, entity_id = null, details = null, ip = null) {
  db.run(
    `INSERT INTO audit_log (user_id, action, entity_type, entity_id, details, ip)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      user_id,
      action,
      entity_type,
      entity_id   ? String(entity_id) : null,
      details     ? JSON.stringify(details) : null,
      ip,
    ]
  ).catch(err => {
    console.error('[audit] log failed:', err.message);
  });
  // Intenționat fără await — fire-and-forget
}

/**
 * Returnează înregistrările audit pentru un user, cu paginare.
 */
async function list(user_id, { limit = 50, offset = 0 } = {}) {
  const safeLimit  = Math.min(Number(limit)  || 50,  200);
  const safeOffset = Math.max(Number(offset) || 0,   0);

  const rows = await db.all(
    `SELECT id, action, entity_type, entity_id, details, ip, created_at
     FROM audit_log
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [user_id, safeLimit, safeOffset]
  );

  const countRow = await db.get(
    `SELECT COUNT(*) as total FROM audit_log WHERE user_id = ?`,
    [user_id]
  );

  return {
    data:  rows.map(r => ({
      ...r,
      details: r.details ? JSON.parse(r.details) : null,
    })),
    meta: {
      total:  countRow.total,
      limit:  safeLimit,
      offset: safeOffset,
    },
  };
}

export default { log, list };
