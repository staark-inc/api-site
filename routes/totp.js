import { Router } from 'express';
import jwt         from 'jsonwebtoken';
import TotpService from '../services/TotpService.js';
import UserService from '../services/UserService.js';

const router = Router();

// Simple JWT-only middleware for TOTP management endpoints
function requireJwt(req, res, next) {
  const header = req.headers['authorization'];
  if (!header?.startsWith('Bearer ey')) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'JWT required' } });
  }
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    req.userId    = payload.sub;
    req.userEmail = payload.email;
    next();
  } catch {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired JWT' } });
  }
}

// GET /v1/auth/totp/status
router.get('/status', requireJwt, async (req, res, next) => {
  try {
    const status = await TotpService.getStatus(req.userId);
    res.json({ ok: true, ...status });
  } catch (err) { next(err); }
});

// POST /v1/auth/totp/setup — generate secret + QR
router.post('/setup', requireJwt, async (req, res, next) => {
  try {
    const result = await TotpService.generateSetup(req.userId, req.userEmail);
    res.json({ ok: true, data: result });
  } catch (err) { next(err); }
});

// POST /v1/auth/totp/enable — { code }
router.post('/enable', requireJwt, async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: { code: 'MISSING_FIELD', message: "'code' is required" } });
    const result = await TotpService.enable(req.userId, code);
    res.json({ ok: true, ...result });
  } catch (err) { next(err); }
});

// POST /v1/auth/totp/disable — { code }
router.post('/disable', requireJwt, async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: { code: 'MISSING_FIELD', message: "'code' is required" } });
    const result = await TotpService.disable(req.userId, code);
    res.json({ ok: true, ...result });
  } catch (err) { next(err); }
});

// POST /v1/auth/totp/validate — { temp_token, code } → full JWT
router.post('/validate', async (req, res, next) => {
  try {
    const { temp_token, code } = req.body;
    if (!temp_token) return res.status(400).json({ error: { code: 'MISSING_FIELD', message: "'temp_token' is required" } });
    if (!code)       return res.status(400).json({ error: { code: 'MISSING_FIELD', message: "'code' is required" } });

    let payload;
    try {
      payload = jwt.verify(temp_token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Invalid or expired temp token' } });
    }

    if (payload.scope !== '2fa-pending') {
      return res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Token is not a 2FA pending token' } });
    }

    const user = await import('../db.js').then(m => m.default.get(
      `SELECT * FROM users WHERE id = ?`, [payload.sub]
    ));

    if (!user?.totp_enabled || !TotpService.verify(user.totp_secret, code)) {
      return res.status(401).json({ error: { code: 'INVALID_CODE', message: 'Invalid TOTP code' } });
    }

    const accessToken  = jwt.sign(
      { sub: user.id, email: user.email, display_name: user.display_name, plan: 'free', workspace_id: payload.workspace_id },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );
    const refreshToken = await UserService.createRefreshToken(user.id);

    const { password_hash, totp_secret, ...safeUser } = user;
    res.json({ ok: true, user: safeUser, accessToken, refreshToken });
  } catch (err) { next(err); }
});

export default router;
