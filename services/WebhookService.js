import crypto from 'crypto';
import db     from '../db.js';

const MAX_WEBHOOKS = 10;
const TIMEOUT_MS   = 10_000;

const VALID_EVENTS = [
  'key.generated', 'key.revoked',
  'project.created', 'project.updated', 'project.deleted',
  'task.created', 'task.updated', 'task.deleted',
  'user.login',
];

// ─── CRUD ──────────────────────────────────────────────────────────────────

async function create(user_id, { url, events, secret }) {
  if (!url) {
    const err = new Error("'url' is required");
    err.status = 400; throw err;
  }
  try { new URL(url); } catch {
    const err = new Error('Invalid URL');
    err.status = 400; throw err;
  }

  const filteredEvents = (events ?? VALID_EVENTS).filter(e => VALID_EVENTS.includes(e));
  if (!filteredEvents.length) {
    const err = new Error('No valid events specified');
    err.status = 400; throw err;
  }

  const count = await db.get(
    `SELECT COUNT(*) as n FROM user_webhooks WHERE user_id = ? AND active = 1`,
    [user_id]
  );
  if (count.n >= MAX_WEBHOOKS) {
    const err = new Error(`Maximum of ${MAX_WEBHOOKS} webhooks per user`);
    err.status = 409; throw err;
  }

  const result = await db.run(
    `INSERT INTO user_webhooks (user_id, url, secret, events) VALUES (?, ?, ?, ?)`,
    [user_id, url, secret || null, JSON.stringify(filteredEvents)]
  );

  return { id: result.lastInsertRowid, url, events: filteredEvents, active: true };
}

async function list(user_id) {
  const rows = await db.all(
    `SELECT id, url, events, active, created_at FROM user_webhooks WHERE user_id = ? ORDER BY created_at DESC`,
    [user_id]
  );
  return rows.map(r => ({ ...r, events: JSON.parse(r.events) }));
}

async function remove(id, user_id) {
  const result = await db.run(
    `DELETE FROM user_webhooks WHERE id = ? AND user_id = ?`,
    [id, user_id]
  );
  if (!result.changes) {
    const err = new Error('Webhook not found');
    err.status = 404; throw err;
  }
  return { deleted: true };
}

// ─── Delivery log ──────────────────────────────────────────────────────────

async function listDeliveries(webhook_id, user_id, { limit = 25, offset = 0 } = {}) {
  // Verify ownership
  const hook = await db.get(
    `SELECT id FROM user_webhooks WHERE id = ? AND user_id = ?`, [webhook_id, user_id]
  );
  if (!hook) {
    const err = new Error('Webhook not found');
    err.status = 404; throw err;
  }

  const [rows, total] = await Promise.all([
    db.all(
      `SELECT id, event, status, http_status, response, duration_ms, delivered_at
       FROM webhook_deliveries WHERE webhook_id = ? ORDER BY delivered_at DESC LIMIT ? OFFSET ?`,
      [webhook_id, limit, offset]
    ),
    db.get(`SELECT COUNT(*) as n FROM webhook_deliveries WHERE webhook_id = ?`, [webhook_id]),
  ]);

  return { data: rows, meta: { total: total.n, limit, offset } };
}

// ─── Fire (internal) ───────────────────────────────────────────────────────

async function fire(event, payload, user_id = null) {
  try {
    const query = user_id
      ? `SELECT * FROM user_webhooks WHERE user_id = ? AND active = 1`
      : `SELECT * FROM user_webhooks WHERE active = 1`;
    const params = user_id ? [user_id] : [];
    const hooks  = await db.all(query, params);

    for (const hook of hooks) {
      const events = JSON.parse(hook.events);
      if (!events.includes(event)) continue;

      // Don't await — fire and forget with logging
      deliver(hook, event, payload).catch(() => {});
    }
  } catch (err) {
    console.error('[webhook] fire error:', err.message);
  }
}

async function deliver(hook, event, payload) {
  const body      = JSON.stringify({ event, payload, timestamp: Math.floor(Date.now() / 1000) });
  const signature = hook.secret
    ? 'sha256=' + crypto.createHmac('sha256', hook.secret).update(body).digest('hex')
    : null;

  const start = Date.now();
  let status = 'failed', httpStatus = null, responseText = null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(hook.url, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'User-Agent':    'Staark-Webhooks/1.0',
        'X-Staark-Event': event,
        ...(signature ? { 'X-Hub-Signature-256': signature } : {}),
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timer);
    httpStatus   = res.status;
    responseText = (await res.text()).slice(0, 1000);
    status       = res.ok ? 'success' : 'failed';
  } catch (err) {
    responseText = err.message.slice(0, 1000);
  }

  const duration = Date.now() - start;

  await db.run(
    `INSERT INTO webhook_deliveries (webhook_id, event, payload, status, http_status, response, duration_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [hook.id, event, JSON.stringify(payload), status, httpStatus, responseText, duration]
  );
}

async function redeliver(deliveryId, webhookId, userId) {
  const hook = await db.get(
    `SELECT uw.* FROM user_webhooks uw WHERE uw.id = ? AND uw.user_id = ?`, [webhookId, userId]
  );
  if (!hook) {
    const err = new Error('Webhook not found');
    err.status = 404; throw err;
  }

  const delivery = await db.get(
    `SELECT * FROM webhook_deliveries WHERE id = ? AND webhook_id = ?`, [deliveryId, webhookId]
  );
  if (!delivery) {
    const err = new Error('Delivery not found');
    err.status = 404; throw err;
  }

  deliver(hook, delivery.event, JSON.parse(delivery.payload)).catch(() => {});
  return { queued: true };
}

export default { create, list, remove, listDeliveries, fire, redeliver, VALID_EVENTS };
