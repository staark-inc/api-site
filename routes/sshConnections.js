import { Router } from 'express';
import ctrl from '../controllers/SshConnectionController.js';

const router = Router();

router.get('/',         (req, res, next) => ctrl.list(req, res, next));
router.put('/:id',      (req, res, next) => ctrl.upsert(req, res, next));
router.delete('/:id',   (req, res, next) => ctrl.delete(req, res, next));
router.post('/sync',    (req, res, next) => ctrl.bulkSync(req, res, next));

export default router;
