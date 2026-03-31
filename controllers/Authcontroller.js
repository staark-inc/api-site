import AuthService   from '../services/Authservice.js';
import EmailService  from '../services/EmailService.js';
import AuditService  from '../services/AuditService.js';

class AuthController {
  async generateKey(req, res, next) {
    try {
      const { user_id, email, name, plan, label, ttl_days } = req.body;

      if (!user_id) {
        return res.status(400).json({
          error: { code: 'MISSING_FIELD', message: "'user_id' is required", field: 'user_id' }
        });
      }

      const result = await AuthService.generate({ user_id, name, plan, label, ttl_days });

      AuditService.log(user_id, 'key.generated', 'api_key', result.id, { name: result.name, plan: result.plan, label: result.label }, req.ip);

      EmailService
        .sendApiKeyCreated(email, plan)
        .catch(err => {
          console.error('[api key] send failed:', err);
        });

      return res.status(201).json({
        ok:      true,
        data:    result,
        warning: 'Store this key securely — it will not be shown again.',
      });
    } catch (err) {
      next(err);
    }
  }


  async listKeysQuery(req, res, next) {
    try {
      const { user_id, label, plan } = req.query;
      if (!user_id) {
        return res.status(400).json({
          error: { code: 'MISSING_FIELD', message: "'user_id' is required", field: 'user_id' }
        });
      }
      const keys = await AuthService.list(user_id, { label, plan });
      return res.json({ ok: true, data: keys });
    } catch (err) {
      next(err);
    }
  }

  async listKeys(req, res, next) {
    try {
      const { user_id } = req.params;
      const { label, plan } = req.query;
      const keys = await AuthService.list(user_id, { label, plan });
      return res.json({ ok: true, data: keys });
    } catch (err) {
      next(err);
    }
  }

  async revokeKey(req, res, next) {
    try {
      const { id } = req.params;
      const { user_id } = req.body;

      if (!user_id) {
        return res.status(400).json({
          error: { code: 'MISSING_FIELD', message: "'user_id' is required", field: 'user_id' }
        });
      }

      const result = await AuthService.revoke(Number(id), user_id);
      AuditService.log(user_id, 'key.revoked', 'api_key', id, null, req.ip);
      return res.json({ ok: true, ...result });
    } catch (err) {
      next(err);
    }
  }
}

export default new AuthController();