import { Router } from 'express';
import jwt         from 'jsonwebtoken';
import WebhookService from '../services/WebhookService.js';

const router = Router();

// JWT-only auth (same as totp.js)
function requireJwt(req, res, next) {
  const header = req.headers['authorization'];
  if (!header?.startsWith('Bearer ey')) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'JWT required' } });
  }
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired JWT' } });
  }
}

router.use(requireJwt);

// GET /v1/webhooks — list
router.get('/', async (req, res, next) => {
  try {
    const hooks = await WebhookService.list(req.userId);
    res.json({ ok: true, data: hooks });
  } catch (err) { next(err); }
});

// GET /v1/webhooks/events — list valid events
router.get('/events', (_req, res) => {
  res.json({ ok: true, data: WebhookService.VALID_EVENTS });
});

// POST /v1/webhooks — create
router.post('/', async (req, res, next) => {
  try {
    const { url, events, secret } = req.body;
    const hook = await WebhookService.create(req.userId, { url, events, secret });
    res.status(201).json({ ok: true, data: hook });
  } catch (err) { next(err); }
});

// DELETE /v1/webhooks/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await WebhookService.remove(Number(req.params.id), req.userId);
    res.json({ ok: true, ...result });
  } catch (err) { next(err); }
});

// GET /v1/webhooks/:id/deliveries
router.get('/:id/deliveries', async (req, res, next) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit  ?? '25', 10), 100);
    const offset = parseInt(req.query.offset ?? '0', 10);
    const result = await WebhookService.listDeliveries(Number(req.params.id), req.userId, { limit, offset });
    res.json({ ok: true, ...result });
  } catch (err) { next(err); }
});

// POST /v1/webhooks/:id/deliveries/:deliveryId/redeliver
router.post('/:id/deliveries/:deliveryId/redeliver', async (req, res, next) => {
  try {
    const result = await WebhookService.redeliver(
      Number(req.params.deliveryId),
      Number(req.params.id),
      req.userId
    );
    res.json({ ok: true, ...result });
  } catch (err) { next(err); }
});

export default router;
