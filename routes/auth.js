// routes/auth.js
import { Router }      from 'express';
import { requireAuth } from '../middleware/auth.js';
import UserController  from '../controllers/UserController.js';

const router = Router();

// Status check — public
router.get('/', (_req, res) => res.json({
  ok:      true,
  service: 'auth',
  message: 'Authentication endpoint is running',
}));

// Public — nu cer token
router.post('/register',        (req, res, next) => UserController.register(req, res, next));
router.post('/login',           (req, res, next) => UserController.login(req, res, next));
router.post('/verify-email',    (req, res, next) => UserController.verifyEmail(req, res, next));
router.post('/forgot-password', (req, res, next) => UserController.forgotPassword(req, res, next));
router.post('/reset-password',  (req, res, next) => UserController.resetPassword(req, res, next));

// Protejate — cer Bearer token valid
router.post('/refresh', requireAuth, (req, res, next) => UserController.refresh(req, res, next));
router.post('/logout',  requireAuth, (req, res, next) => UserController.logout(req, res, next));

export default router;
