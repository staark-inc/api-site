const store = new Map();

function rateLimiter({ windowMs = 60_000, max = 100, keyFn } = {}) {
  return (req, res, next) => {
    const id  = keyFn ? keyFn(req) : (req.ip ?? 'global');
    const now = Date.now();

    let entry = store.get(id);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(id, entry);
    }

    entry.count++;

    const remaining = Math.max(0, max - entry.count);
    const resetSec  = Math.ceil((entry.resetAt - now) / 1000);

    res.setHeader('X-RateLimit-Limit',     max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset',     Math.ceil(entry.resetAt / 1000));

    if (entry.count > max) {
      res.setHeader('Retry-After', resetSec);
      return res.status(429).json({
        error: {
          code:        'RATE_LIMIT_EXCEEDED',
          message:     `Too many requests. Retry after ${resetSec} seconds.`,
          retry_after: resetSec,
        }
      });
    }

    next();
  };
}

const generateKeyLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max:      5,
  keyFn:    (req) => `gen:${req.ip}`,
});

// Auth endpoints publice — 10 req/15min per IP (anti brute-force)
const authLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max:      10,
  keyFn:    (req) => `auth:${req.ip}`,
});

function apiLimiter(req, res, next) {
  // @ts-ignore
  const plan = req.auth?.plan ?? 'free';
  const max  = plan === 'pro' ? 5000 : 500;

  return rateLimiter({
    windowMs: plan === 'pro' ? 60_000 : 24 * 60 * 60 * 1000,
    max,
    // @ts-ignore
    keyFn: () => `api:${req.auth?.key_id ?? req.ip}`,
  })(req, res, next);
}

export { rateLimiter, generateKeyLimiter, authLimiter, apiLimiter };