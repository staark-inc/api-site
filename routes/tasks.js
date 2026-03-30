import { Router } from 'express';
import TasksController from '../controllers/Taskscontroller.js';

const router = Router();

router.get(    '/:id',  (req, res, next) => TasksController.getById(req, res, next));
router.put(    '/:id',  (req, res, next) => TasksController.update(req, res, next));
router.delete( '/:id',  (req, res, next) => TasksController.remove(req, res, next));

export default router;