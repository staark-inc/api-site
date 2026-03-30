import UserService  from '../services/UserService.js';
import EmailService from '../services/EmailService.js';

class UserController {

  /**
   * POST /v1/auth/register
   */
  async register(req, res, next) {
    try {
      const { email, password, confirmPassword, firstName, lastName, displayName } = req.body;

      if (!email)           return res.status(400).json({ error: { code: 'MISSING_FIELD', message: "'email' is required",     field: 'email' } });
      if (!password)        return res.status(400).json({ error: { code: 'MISSING_FIELD', message: "'password' is required",  field: 'password' } });
      if (!firstName)       return res.status(400).json({ error: { code: 'MISSING_FIELD', message: "'firstName' is required", field: 'firstName' } });
      if (!lastName)        return res.status(400).json({ error: { code: 'MISSING_FIELD', message: "'lastName' is required",  field: 'lastName' } });

      if (password !== confirmPassword) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Passwords do not match', field: 'confirmPassword' } });
      }

      if (password.length < 8) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 8 characters', field: 'password' } });
      }

      const { user, verifyToken } = await UserService.register({ email, password, firstName, lastName, displayName });

      // Send verification email (non-blocking)
      EmailService
        .sendVerifyEmail(user.email, user.display_name, verifyToken)
        .catch(err => {
          console.error('[email] verify send failed:', err);
        });

      return res.status(201).json({ ok: true, data: user });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /v1/auth/login
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      if (!email)    return res.status(400).json({ error: { code: 'MISSING_FIELD', message: "'email' is required",    field: 'email' } });
      if (!password) return res.status(400).json({ error: { code: 'MISSING_FIELD', message: "'password' is required", field: 'password' } });

      const result = await UserService.login({ email, password });

      return res.json({ ok: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /v1/auth/logout
   */
  async logout(req, res, next) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ error: { code: 'MISSING_FIELD', message: "'refreshToken' is required", field: 'refreshToken' } });
      }

      UserService.logout(refreshToken);

      return res.json({ ok: true, message: 'Logged out successfully' });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /v1/auth/refresh
   */
  async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ error: { code: 'MISSING_FIELD', message: "'refreshToken' is required", field: 'refreshToken' } });
      }

      const result = await UserService.refresh(refreshToken);

      return res.json({ ok: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /v1/auth/verify-email
   */
  async verifyEmail(req, res, next) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ error: { code: 'MISSING_FIELD', message: "'token' is required", field: 'token' } });
      }

      const result = await UserService.verifyEmail(token);

      return res.json({ ok: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /v1/auth/forgot-password
   */
  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: { code: 'MISSING_FIELD', message: "'email' is required", field: 'email' } });
      }

      const result = await UserService.requestPasswordReset(email);

      // Send reset email if user exists (non-blocking)
      if (result.resetToken) {
        const user = { display_name: 'User' }; // minimal — don't expose user existence
        EmailService
          .sendPasswordReset(email, user.display_name, result.resetToken)
          .catch(err => {
            console.error('[email] password reset send failed:', err);
          });
      }

      // Always return 200 to prevent email enumeration
      return res.json({ ok: true, message: 'If this email exists, a reset link has been sent.' });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /v1/auth/reset-password
   */
  async resetPassword(req, res, next) {
    try {
      const { token, password, confirmPassword } = req.body;

      if (!token)    return res.status(400).json({ error: { code: 'MISSING_FIELD', message: "'token' is required",    field: 'token' } });
      if (!password) return res.status(400).json({ error: { code: 'MISSING_FIELD', message: "'password' is required", field: 'password' } });

      if (password !== confirmPassword) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Passwords do not match', field: 'confirmPassword' } });
      }

      if (password.length < 8) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 8 characters', field: 'password' } });
      }

      const result = await UserService.resetPassword(token, password);

      return res.json({ ok: true, ...result });
    } catch (err) {
      next(err);
    }
  }
}

export default new UserController();