import SshConnectionService from '../services/SshConnectionService.js';

class SshConnectionController {
  async list(req, res, next) {
    try {
      const data = await SshConnectionService.list(req.auth.user_id);
      return res.json({ ok: true, data });
    } catch (err) { next(err); }
  }

  async upsert(req, res, next) {
    try {
      const connection = req.body;
      if (!connection.id) {
        return res.status(400).json({ error: { code: 'MISSING_FIELD', message: "'id' is required", field: 'id' } });
      }
      const data = await SshConnectionService.upsert(req.auth.user_id, connection);
      return res.json({ ok: true, data });
    } catch (err) { next(err); }
  }

  async delete(req, res, next) {
    try {
      const result = await SshConnectionService.delete(req.auth.user_id, req.params.id);
      if (!result.deleted) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Connection not found' } });
      }
      return res.status(204).send();
    } catch (err) { next(err); }
  }

  async bulkSync(req, res, next) {
    try {
      const { connections } = req.body;
      if (!Array.isArray(connections)) {
        return res.status(400).json({ error: { code: 'MISSING_FIELD', message: "'connections' array is required" } });
      }
      const data = await SshConnectionService.bulkSync(req.auth.user_id, connections);
      return res.json({ ok: true, data });
    } catch (err) { next(err); }
  }
}

export default new SshConnectionController();
