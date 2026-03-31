import { Router }       from 'express';
import AuditController  from '../controllers/AuditController.js';

const router = Router();

router.get('/', (req, res, next) => AuditController.list(req, res, next));

export default router;
