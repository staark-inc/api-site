import ExportService from '../services/ExportService.js';

class ExportController {

  async exportKeys(req, res, next) {
    try {
      const { user_id, format = 'json' } = req.query;

      if (!user_id) {
        return res.status(400).json({
          error: { code: 'MISSING_FIELD', message: "'user_id' is required", field: 'user_id' }
        });
      }

      const data = await ExportService.exportKeys(user_id);

      if (format === 'csv') {
        const csv = ExportService.toCSV(data, ExportService.KEY_COLUMNS);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="api-keys.csv"');
        return res.send(csv);
      }

      res.setHeader('Content-Disposition', 'attachment; filename="api-keys.json"');
      return res.json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  }

  async exportProjects(req, res, next) {
    try {
      const { workspace_id, format = 'json' } = req.query;

      if (!workspace_id) {
        return res.status(400).json({
          error: { code: 'MISSING_FIELD', message: "'workspace_id' is required", field: 'workspace_id' }
        });
      }

      if (format === 'csv') {
        const tasks = await ExportService.exportTasksFlat(workspace_id);
        const csv   = ExportService.toCSV(tasks, ExportService.TASK_CSV_COLUMNS);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="projects-tasks.csv"');
        return res.send(csv);
      }

      const data = await ExportService.exportProjects(workspace_id);
      res.setHeader('Content-Disposition', 'attachment; filename="projects.json"');
      return res.json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  }
}

export default new ExportController();
