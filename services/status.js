import axios from 'axios';
import db, { saveCheck } from '../db.js';

// ─── Helpers ───────────────────────────────────────────────────────────────

function getStatus(ok, latencyMs) {
  if (!ok)              return 'Down';
  if (latencyMs > 1000) return 'Degraded';
  return                'Operational';
}

// ─── Single service check ──────────────────────────────────────────────────

async function check(name, target, url, persist = false, options = {}) {
  const start = Date.now();

  try {
    const res       = await axios.get(url, { timeout: 5000, validateStatus: () => true, ...options });
    const latencyMs = Date.now() - start;
    const ok        = res.status >= 200 && res.status < 500;

    const result = {
      name,
      target,
      latencyMs,
      uptimePercent: ok ? 100 : 0,
      status:        getStatus(ok, latencyMs),
      httpStatus:    res.status,
    };

    if (persist) await saveCheck(result);

    return result;
  } catch (err) {
    const result = {
      name,
      target,
      latencyMs:     0,
      uptimePercent: 0,
      status:        'Down',
      httpStatus:    null,
      error:         err.message,
    };

    if (persist) await saveCheck(result);

    return result;
  }
}

// ─── Collect all services ──────────────────────────────────────────────────

async function collectPublicStatus({ persist = false } = {}) {
  const services = await Promise.all([
    check('REST API',         '/v1',                  'http://node-api:3000/v1',                     persist),
    check('Webhooks',         '/v1/webhooks',         'http://node-webhooks:3000/v1/webhooks',        persist),
    check('Authentication',   '/v1/auth',             'http://node-api:3000/v1/auth',                persist),
    check('SSH Connections',  '/v1/ssh/connections',  'http://node-api:3000/v1/ssh/connections',     persist, {
      headers: { Authorization: 'Bearer sk_live_staark_statuscheck00000000000000' }
    }),
    check('Dashboard',        'staark-app.cloud',     'http://traefik:8080/ping',                    persist),
    check('CDN / Static',     'cdn.staark-app.cloud', 'http://cdn.staark-app.cloud/ping',            persist),
  ]);

  return {
    ok:          true,
    generatedAt: new Date().toISOString(),
    services,
  };
}

export { collectPublicStatus };