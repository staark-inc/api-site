import TaskService from '../services/TaskService.js';

class TasksController {

  /**
   * GET /v1/projects/:projectId/tasks
   * @param {import('express').Request<{ projectId: string }, {}, {}, import('../types/index').ListTasksQuery>} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  async list(req, res, next) {
    try {
      const { projectId } = req.params;
      const { status, priority, assignee_id, limit = '20', page = '1' } = req.query;

      const result = await TaskService.list({
        project_id: projectId,
        status,
        priority,
        assignee_id,
        limit: Math.min(Number(limit), 100),
        page:  Math.max(Number(page), 1),
      });

      return res.json({ ok: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /v1/projects/:projectId/tasks
   * @param {import('express').Request<{ projectId: string }, {}, import('../types/index').CreateTaskBody>} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  async create(req, res, next) {
    try {
      const { projectId } = req.params;
      const { title, description, priority, assignee_id, due_date, tags } = req.body;

      if (!title?.trim()) {
        return res.status(400).json({
          error: { code: 'MISSING_FIELD', message: "'title' is required", field: 'title' }
        });
      }

      const task = await TaskService.create({
        project_id: projectId,
        title:      title.trim(),
        description,
        priority,
        assignee_id,
        due_date,
        tags,
      });

      return res.status(201).json({ ok: true, data: task });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /v1/tasks/:id
   * @param {import('express').Request<{ id: string }>} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  async getById(req, res, next) {
    try {
      const task = await TaskService.getById(req.params.id);

      if (!task) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: `Task '${req.params.id}' not found` }
        });
      }

      return res.json({ ok: true, data: task });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /v1/tasks/:id
   * @param {import('express').Request<{ id: string }, {}, import('../types/index').UpdateTaskBody>} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  async update(req, res, next) {
    try {
      const { id }  = req.params;
      const fields  = req.body;

      if (!Object.keys(fields).length) {
        return res.status(400).json({
          error: { code: 'VALIDATION_ERROR', message: 'No fields provided to update' }
        });
      }

      const task = await TaskService.update(id, fields);

      if (!task) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: `Task '${id}' not found` }
        });
      }

      return res.json({ ok: true, data: task });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /v1/tasks/:id
   * @param {import('express').Request<{ id: string }>} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  async remove(req, res, next) {
    try {
      const deleted = await TaskService.remove(req.params.id);

      if (!deleted) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: `Task '${req.params.id}' not found` }
        });
      }

      return res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}

export default new TasksController();