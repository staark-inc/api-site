import jwt         from 'jsonwebtoken';
import AuthService from '../services/Authservice.js';

function unauthorized(res, message = 'Invalid or expired token') {
  return res.status(401).json({
    error: {
      code:    'UNAUTHORIZED',
      message,
      docs:    'https://api.staark-app.cloud/authentication',
    }
  });
}

async function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader?.startsWith('Bearer ')) {
    return unauthorized(res, 'Missing Authorization header. Expected: Bearer <token>');
  }

  const token = authHeader.slice(7);

  // ── JWT (browser/dashboard) ─────────────────────────────────────────────
  if (token.startsWith('ey')) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      // @ts-ignore
      req.auth = { key_id: null, user_id: payload.sub, plan: payload.plan ?? 'free' };
      return next();
    } catch {
      return unauthorized(res, 'Invalid or expired JWT token');
    }
  }

  // ── API Key (server-to-server / SDK) ────────────────────────────────────
  const keyRow = await AuthService.validate(token);
  if (!keyRow) return unauthorized(res, 'Invalid or expired API key');

  // @ts-ignore
  req.auth = { key_id: keyRow.id, user_id: keyRow.user_id, plan: keyRow.plan };
  next();
}

export { requireAuth };