import { Router }          from 'express';
import ExportController    from '../controllers/ExportController.js';

const router = Router();

router.get('/keys',     (req, res, next) => ExportController.exportKeys(req, res, next));
router.get('/projects', (req, res, next) => ExportController.exportProjects(req, res, next));

export default router;
