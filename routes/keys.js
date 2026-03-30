import { Router } from 'express';
import AuthController          from '../controllers/Authcontroller.js';
import { generateKeyLimiter }  from '../middleware/rateLimit.js';

const router = Router();

router.post(   '/',          generateKeyLimiter, (req, res, next) => AuthController.generateKey(req, res, next));
router.get(    '/:user_id',                      (req, res, next) => AuthController.listKeys(req, res, next));
router.delete( '/:id',                           (req, res, next) => AuthController.revokeKey(req, res, next));

export default router;