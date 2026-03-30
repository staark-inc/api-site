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

import { collectPublicStatus } from './services/status.js';
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
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Staark API running on port ${PORT}`);
  });
}

start().catch(err => { console.error('Startup error:', err); process.exit(1); });