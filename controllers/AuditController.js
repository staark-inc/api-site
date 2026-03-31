import AuditService from '../services/AuditService.js';

class AuditController {
  async list(req, res, next) {
    try {
      const { user_id, limit = '50', offset = '0' } = req.query;

      if (!user_id) {
        return res.status(400).json({
          error: { code: 'MISSING_FIELD', message: "'user_id' is required", field: 'user_id' }
        });
      }

      const result = await AuditService.list(user_id, { limit, offset });
      return res.json({ ok: true, ...result });
    } catch (err) {
      next(err);
    }
  }
}

export default new AuditController();
