import 'dotenv/config';
import express             from 'express';
import cors                from 'cors';
import path                from 'path';
import { fileURLToPath }   from 'url';

import { requireAuth }     from './middleware/auth.js';
import { apiLimiter, authLimiter } from './middleware/rateLimit.js';
import { errorHandler }    from './middleware/errorHandler.js';

import keysRouter          from './routes/keys.js';
import projectsRouter      from './routes/projects.js';
import tasksRouter         from './routes/tasks.js';
import authRouter          from './routes/auth.js';
import sshConnectionsRouter from './routes/sshConnections.js';
import auditRouter         from './routes/audit.js';
import exportRouter        from './routes/export.js';

import { collectPublicStatus } from './services/status.js';
import EmailService from './services/EmailService.js';
import db, { getDailyHistory } from './db.js';
import { up as migrateInit } from './migrate/init.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app       = express();

// ─── Global middleware ─────────────────────────────────────────────────────

app.use(cors({
  origin: [
    'https://staark-app.cloud',
    'https://www.staark-app.cloud',
    'http://localhost:3000',
  ],
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

// ─── Status job (every 5 min) ──────────────────────────────────────────────

async function scheduleStatusJob() {
  try {
    await collectPublicStatus({ persist: true });
    console.log('[status] Check stored');
  } catch (err) {
    console.error('[status] Job error:', err.message);
  } finally {
    setTimeout(scheduleStatusJob, 5 * 60 * 1000);
  }
}

// ─── Key expiry notification job (every 24h) ───────────────────────────────

async function checkKeyExpiry() {
  try {
    const sevenDays = 7 * 86400;
    const now       = Math.floor(Date.now() / 1000);

    const expiringKeys = await db.all(
      `SELECT ak.id, ak.name, ak.expires_at, ak.user_id, u.email
       FROM api_keys ak
       JOIN users u ON u.id = ak.user_id
       WHERE ak.revoked = 0
         AND ak.expires_at IS NOT NULL
         AND ak.expires_at > ?
         AND ak.expires_at < ?
         AND ak.expiry_notified = 0`,
      [now, now + sevenDays]
    );

    for (const key of expiringKeys) {
      const daysLeft = Math.ceil((key.expires_at - now) / 86400);

      EmailService
        .sendKeyExpiryWarning(key.email, key.name, daysLeft, key.expires_at)
        .then(() =>
          db.run(
            `UPDATE api_keys SET expiry_notified = 1 WHERE id = ?`,
            [key.id]
          )
        )
        .catch(err => {
          console.error(`[expiry] Failed for key ${key.id}:`, err.message);
        });
    }

    if (expiringKeys.length > 0) {
      console.log(`[expiry] Notified ${expiringKeys.length} expiring key(s)`);
    }
  } catch (err) {
    console.error('[expiry] Job error:', err.message);
  } finally {
    setTimeout(checkKeyExpiry, 24 * 60 * 60 * 1000);
  }
}

// ─── Public pages ──────────────────────────────────────────────────────────

const page = (file) => (_req, res) =>
  res.sendFile(path.join(__dirname, 'public', file));

app.get('/',               page('index.html'))
app.get('/status',         page('status.html'));
app.get('/authentication', page('auth.html'));
app.get('/rate-limits',    page('rate-limits.html'));
app.get('/errors',         page('errors.html'));
app.get('/v1/get-key',     page('api-key.html'));

// ─── Public API ────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => res.json({
  ok:      true,
  service: 'staark-api',
  time:    new Date().toISOString(),
}));

app.get('/v1', (_req, res) => res.json({
  ok:      true,
  service: 'api',
  message: 'REST API is running',
}));

app.get('/v1/status', async (_req, res, next) => {
  try {
    const status = await collectPublicStatus({ persist: false });
    res.json(status);
  } catch (err) {
    next(err);
  }
});

app.get('/v1/status/history', async (req, res, next) => {
  try {
    const days    = parseInt(req.query.days ?? '90', 10);
    const history = await getDailyHistory(days);
    res.json({ ok: true, days, history });
  } catch (err) {
    next(err);
  }
});

app.use('/v1/keys', keysRouter);
app.use('/v1/auth', authLimiter, authRouter);
app.use('/v1/audit', auditRouter);
app.use('/v1/export', exportRouter);

// ─── Protected routes (require valid API key) ──────────────────────────────

app.use('/v1', requireAuth, apiLimiter);
app.use('/v1/projects',        projectsRouter);
app.use('/v1/tasks',           tasksRouter);
app.use('/v1/ssh/connections', sshConnectionsRouter);

// ─── 404 ───────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error: {
      code:    'NOT_FOUND',
      message: `Cannot ${req.method} ${req.path}`,
      docs:    'https://api.staark-app.cloud',
    }
  });
});

// ─── Error handler (must be last) ─────────────────────────────────────────

app.use(errorHandler);

// ─── Start ─────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;

async function start() {
  await migrateInit();
  scheduleStatusJob();
  checkKeyExpiry();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Staark API running on port ${PORT}`);
  });
}

start().catch(err => { console.error('Startup error:', err); process.exit(1); });