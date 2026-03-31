import ProjectService from '../services/ProjectService.js';
import AuditService   from '../services/AuditService.js';

class ProjectsController {

  /**
   * GET /v1/projects?workspace_id=&status=&limit=&page=
   * @param {import('express').Request<{}, {}, {}, import('../types/index').ListProjectsQuery>} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  async list(req, res, next) {
    try {
      const { workspace_id, status, limit = '20', page = '1' } = req.query;

      if (!workspace_id) {
        return res.status(400).json({
          error: { code: 'MISSING_FIELD', message: "'workspace_id' is required", field: 'workspace_id' }
        });
      }

      const result = await ProjectService.list({
        workspace_id,
        status,
        limit: Math.min(Number(limit), 100),
        page:  Math.max(Number(page), 1),
      });

      return res.json({ ok: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /v1/projects
   * @param {import('express').Request<{}, {}, import('../types/index').CreateProjectBody>} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  async create(req, res, next) {
    try {
      const { workspace_id, name, description, color, visibility } = req.body;

      if (!workspace_id) {
        return res.status(400).json({
          error: { code: 'MISSING_FIELD', message: "'workspace_id' is required", field: 'workspace_id' }
        });
      }
      if (!name?.trim()) {
        return res.status(400).json({
          error: { code: 'MISSING_FIELD', message: "'name' is required", field: 'name' }
        });
      }

      const project = await ProjectService.create({ workspace_id, name: name.trim(), description, color, visibility });

      AuditService.log(req.auth.user_id, 'project.created', 'project', project.id, { name: project.name }, req.ip);

      return res.status(201).json({ ok: true, data: project });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /v1/projects/:id
   * @param {import('express').Request<{ id: string }>} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  async getById(req, res, next) {
    try {
      const project = await ProjectService.getById(req.params.id);

      if (!project) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: `Project '${req.params.id}' not found` }
        });
      }

      return res.json({ ok: true, data: project });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /v1/projects/:id
   * @param {import('express').Request<{ id: string }, {}, import('../types/index').UpdateProjectBody>} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const fields = req.body;

      if (!Object.keys(fields).length) {
        return res.status(400).json({
          error: { code: 'VALIDATION_ERROR', message: 'No fields provided to update' }
        });
      }

      const project = await ProjectService.update(id, fields);

      if (!project) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: `Project '${id}' not found` }
        });
      }

      AuditService.log(req.auth.user_id, 'project.updated', 'project', id, { fields: Object.keys(fields) }, req.ip);

      return res.json({ ok: true, data: project });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /v1/projects/:id
   * @param {import('express').Request<{ id: string }>} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  async remove(req, res, next) {
    try {
      const deleted = await ProjectService.remove(req.params.id);

      if (!deleted) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: `Project '${req.params.id}' not found` }
        });
      }

      AuditService.log(req.auth.user_id, 'project.deleted', 'project', req.params.id, null, req.ip);

      return res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}

export default new ProjectsController();