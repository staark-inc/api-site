import { Router } from 'express';
import crypto      from 'crypto';
import OAuthService from '../services/OAuthService.js';
import AuditService from '../services/AuditService.js';

const router = Router();

const DASHBOARD_OAUTH_CALLBACK = process.env.DASHBOARD_OAUTH_CALLBACK || 'https://staark-app.cloud/auth/oauth/callback';

// Simple in-memory state store (prevents CSRF; state expires in 10 min)
const stateStore = new Map();
function createState() {
  const state = crypto.randomBytes(16).toString('hex');
  stateStore.set(state, Date.now());
  setTimeout(() => stateStore.delete(state), 10 * 60 * 1000);
  return state;
}
function consumeState(state) {
  if (!stateStore.has(state)) return false;
  stateStore.delete(state);
  return true;
}

function oauthError(res, message) {
  const url = new URL(DASHBOARD_OAUTH_CALLBACK);
  url.searchParams.set('error', message);
  return res.redirect(url.toString());
}

// ── Google ──────────────────────────────────────────────────────────────────

router.get('/google', (_req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(501).json({ error: { code: 'NOT_CONFIGURED', message: 'Google OAuth is not configured' } });
  }
  res.redirect(OAuthService.getGoogleUrl(createState()));
});

router.get('/google/callback', async (req, res) => {
  const { code, state, error } = req.query;
  if (error)              return oauthError(res, error);
  if (!consumeState(state)) return oauthError(res, 'Invalid OAuth state');

  try {
    const profile = await OAuthService.handleGoogleCallback(code);
    const tokens  = await OAuthService.findOrCreateUser(profile);
    AuditService.log(null, 'user.login', 'user', null, { provider: 'google' }, req.ip);

    const url = new URL(DASHBOARD_OAUTH_CALLBACK);
    url.searchParams.set('token',   tokens.accessToken);
    url.searchParams.set('refresh', tokens.refreshToken);
    res.redirect(url.toString());
  } catch (err) {
    oauthError(res, err.message || 'OAuth failed');
  }
});

// ── GitHub ──────────────────────────────────────────────────────────────────

router.get('/github', (_req, res) => {
  if (!process.env.GITHUB_CLIENT_ID) {
    return res.status(501).json({ error: { code: 'NOT_CONFIGURED', message: 'GitHub OAuth is not configured' } });
  }
  res.redirect(OAuthService.getGithubUrl(createState()));
});

router.get('/github/callback', async (req, res) => {
  const { code, state, error } = req.query;
  if (error)              return oauthError(res, error);
  if (!consumeState(state)) return oauthError(res, 'Invalid OAuth state');

  try {
    const profile = await OAuthService.handleGithubCallback(code);
    const tokens  = await OAuthService.findOrCreateUser(profile);
    AuditService.log(null, 'user.login', 'user', null, { provider: 'github' }, req.ip);

    const url = new URL(DASHBOARD_OAUTH_CALLBACK);
    url.searchParams.set('token',   tokens.accessToken);
    url.searchParams.set('refresh', tokens.refreshToken);
    res.redirect(url.toString());
  } catch (err) {
    oauthError(res, err.message || 'OAuth failed');
  }
});

export default router;
