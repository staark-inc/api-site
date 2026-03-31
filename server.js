import 'dotenv/config';
import express             from 'express';
import cors                from 'cors';
import path                from 'path';
import { fileURLToPath }   from 'url';

import { requireAuth }     from './middleware/auth.js';
import { apiLimiter, authLimiter } from './middleware/rateLimit.js';
import { errorHandler }    from './middleware/errorHandler.js';

import keysRouter           from './routes/keys.js';
import projectsRouter       from './routes/projects.js';
import tasksRouter          from './routes/tasks.js';
import authRouter           from './routes/auth.js';
import totpRouter           from './routes/totp.js';
import oauthRouter          from './routes/oauth.js';
import sshConnectionsRouter from './routes/sshConnections.js';
import auditRouter          from './routes/audit.js';
import exportRouter         from './routes/export.js';
import webhooksRouter       from './routes/webhooks.js';

import { collectPublicStatus } from './services/status.js';
import EmailService from './services/EmailService.js';
import db, { getDailyHistory } from './db.js';
import { up as migrateInit } from './migrate/init.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app       = express();

// ─── OpenAPI 3.0 spec ──────────────────────────────────────────────────────

const openApiSpec = {
  openapi: '3.0.3',
  info: { title: 'Staark API', version: '1.5.0', description: 'REST API for Staark platform — keys, projects, tasks, auth, webhooks.' },
  servers: [{ url: 'https://api.staark-app.cloud', description: 'Production' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT or API Key' },
    },
    schemas: {
      Error: { type: 'object', properties: { error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' } } } } },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/health': { get: { tags: ['System'], summary: 'Health check', security: [], responses: { 200: { description: 'OK' } } } },
    '/v1/status': { get: { tags: ['System'], summary: 'Service status', security: [], responses: { 200: { description: 'Status data' } } } },
    '/v1/auth/register': { post: { tags: ['Auth'], summary: 'Register a new user', security: [], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email','password','firstName','lastName'], properties: { email: { type: 'string' }, password: { type: 'string' }, firstName: { type: 'string' }, lastName: { type: 'string' } } } } } }, responses: { 201: { description: 'User created' }, 409: { description: 'Email already in use' } } } },
    '/v1/auth/login': { post: { tags: ['Auth'], summary: 'Login', security: [], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email','password'], properties: { email: { type: 'string' }, password: { type: 'string' } } } } } }, responses: { 200: { description: 'Returns accessToken + refreshToken, or requires_2fa=true with temp_token' } } } },
    '/v1/auth/refresh': { post: { tags: ['Auth'], summary: 'Refresh access token', responses: { 200: { description: 'New accessToken' } } } },
    '/v1/auth/logout': { post: { tags: ['Auth'], summary: 'Logout (invalidate refresh token)', responses: { 200: { description: 'OK' } } } },
    '/v1/auth/totp/setup': { post: { tags: ['2FA'], summary: 'Generate TOTP secret + QR code', responses: { 200: { description: 'Returns secret and QR SVG' } } } },
    '/v1/auth/totp/enable': { post: { tags: ['2FA'], summary: 'Enable 2FA with TOTP code', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['code'], properties: { code: { type: 'string' } } } } } }, responses: { 200: { description: '2FA enabled' } } } },
    '/v1/auth/totp/disable': { post: { tags: ['2FA'], summary: 'Disable 2FA', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['code'], properties: { code: { type: 'string' } } } } } }, responses: { 200: { description: '2FA disabled' } } } },
    '/v1/auth/totp/validate': { post: { tags: ['2FA'], summary: 'Validate TOTP during login', security: [], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['temp_token','code'], properties: { temp_token: { type: 'string' }, code: { type: 'string' } } } } } }, responses: { 200: { description: 'Returns full accessToken + refreshToken' } } } },
    '/v1/auth/oauth/google': { get: { tags: ['OAuth'], summary: 'Redirect to Google OAuth', security: [], responses: { 302: { description: 'Redirect' } } } },
    '/v1/auth/oauth/github': { get: { tags: ['OAuth'], summary: 'Redirect to GitHub OAuth', security: [], responses: { 302: { description: 'Redirect' } } } },
    '/v1/keys': { post: { tags: ['API Keys'], summary: 'Generate a new API key', responses: { 201: { description: 'Key created' } } } },
    '/v1/webhooks': {
      get: { tags: ['Webhooks'], summary: 'List user webhooks', responses: { 200: { description: 'Webhook list' } } },
      post: { tags: ['Webhooks'], summary: 'Create a webhook', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['url'], properties: { url: { type: 'string' }, events: { type: 'array', items: { type: 'string' } }, secret: { type: 'string' } } } } } }, responses: { 201: { description: 'Webhook created' } } },
    },
    '/v1/webhooks/{id}': { delete: { tags: ['Webhooks'], summary: 'Delete a webhook', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'Deleted' } } } },
    '/v1/webhooks/{id}/deliveries': { get: { tags: ['Webhooks'], summary: 'List deliveries for a webhook', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }, { name: 'limit', in: 'query', schema: { type: 'integer', default: 25 } }, { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } }], responses: { 200: { description: 'Delivery log' } } } },
    '/v1/projects': {
      get: { tags: ['Projects'], summary: 'List projects', responses: { 200: { description: 'Project list' } } },
      post: { tags: ['Projects'], summary: 'Create a project', responses: { 201: { description: 'Project created' } } },
    },
    '/v1/tasks': {
      get: { tags: ['Tasks'], summary: 'List tasks', responses: { 200: { description: 'Task list' } } },
      post: { tags: ['Tasks'], summary: 'Create a task', responses: { 201: { description: 'Task created' } } },
    },
    '/v1/audit': { get: { tags: ['Audit'], summary: 'Get audit log', responses: { 200: { description: 'Audit entries' } } } },
    '/v1/export/keys': { get: { tags: ['Export'], summary: 'Export API keys (JSON or CSV)', parameters: [{ name: 'format', in: 'query', schema: { type: 'string', enum: ['json','csv'] } }], responses: { 200: { description: 'Export data' } } } },
    '/v1/export/projects': { get: { tags: ['Export'], summary: 'Export projects + tasks (JSON or CSV)', parameters: [{ name: 'format', in: 'query', schema: { type: 'string', enum: ['json','csv'] } }], responses: { 200: { description: 'Export data' } } } },
  },
};

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

app.use('/v1/keys',          keysRouter);
app.use('/v1/auth',          authLimiter, authRouter);
app.use('/v1/auth/totp',     totpRouter);
app.use('/v1/auth/oauth',    oauthRouter);
app.use('/v1/audit',         auditRouter);
app.use('/v1/export',        exportRouter);
app.use('/v1/webhooks',      webhooksRouter);

// ─── OpenAPI + Swagger UI ──────────────────────────────────────────────────

app.get('/openapi.json', (_req, res) => res.json(openApiSpec));
app.get('/docs', (_req, res) => res.send(`<!DOCTYPE html>
<html><head><title>Staark API Docs</title>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" >
</head><body>
<div id="swagger-ui"></div>
<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>
SwaggerUIBundle({ url: '/openapi.json', dom_id: '#swagger-ui', presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset], layout: 'BaseLayout', deepLinking: true });
</script>
</body></html>`));

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