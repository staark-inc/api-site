import { Router } from 'express';
import ProjectsController from '../controllers/ProjectController.js';
import TasksController    from '../controllers/Taskscontroller.js';

const router = Router();

// Projects
router.get(    '/',           (req, res, next) => ProjectsController.list(req, res, next));
router.post(   '/',           (req, res, next) => ProjectsController.create(req, res, next));
router.get(    '/:id',        (req, res, next) => ProjectsController.getById(req, res, next));
router.put(    '/:id',        (req, res, next) => ProjectsController.update(req, res, next));
router.delete( '/:id',        (req, res, next) => ProjectsController.remove(req, res, next));

// Tasks nested under project
router.get(    '/:projectId/tasks',  (req, res, next) => TasksController.list(req, res, next));
router.post(   '/:projectId/tasks',  (req, res, next) => TasksController.create(req, res, next));

export default router;