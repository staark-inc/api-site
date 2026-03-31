import crypto from 'crypto';
import jwt    from 'jsonwebtoken';
import db     from '../db.js';
import UserService from './UserService.js';

const GOOGLE_AUTH_URL  = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USER_URL  = 'https://www.googleapis.com/oauth2/v3/userinfo';

const GITHUB_AUTH_URL  = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_USER_URL  = 'https://api.github.com/user';
const GITHUB_EMAIL_URL = 'https://api.github.com/user/emails';

function generateId(prefix = 'usr') {
  return prefix + '_' + crypto.randomBytes(8).toString('hex');
}

// ─── Google ────────────────────────────────────────────────────────────────

function getGoogleUrl(state) {
  const params = new URLSearchParams({
    client_id:     process.env.GOOGLE_CLIENT_ID,
    redirect_uri:  process.env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope:         'openid email profile',
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params}`;
}

async function handleGoogleCallback(code) {
  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id:     process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri:  process.env.GOOGLE_REDIRECT_URI,
      grant_type:    'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    const err = new Error('Google token exchange failed');
    err.status = 502;
    throw err;
  }

  const { access_token } = await tokenRes.json();

  const userRes = await fetch(GOOGLE_USER_URL, {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  if (!userRes.ok) {
    const err = new Error('Failed to fetch Google user info');
    err.status = 502;
    throw err;
  }

  const profile = await userRes.json();
  return {
    provider:   'google',
    id:         profile.sub,
    email:      profile.email,
    firstName:  profile.given_name || profile.name?.split(' ')[0] || 'User',
    lastName:   profile.family_name || profile.name?.split(' ').slice(1).join(' ') || '',
    displayName: profile.name || profile.email,
  };
}

// ─── GitHub ────────────────────────────────────────────────────────────────

function getGithubUrl(state) {
  const params = new URLSearchParams({
    client_id:   process.env.GITHUB_CLIENT_ID,
    redirect_uri: process.env.GITHUB_REDIRECT_URI,
    scope:       'read:user user:email',
    state,
  });
  return `${GITHUB_AUTH_URL}?${params}`;
}

async function handleGithubCallback(code) {
  const tokenRes = await fetch(GITHUB_TOKEN_URL, {
    method:  'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id:     process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      redirect_uri:  process.env.GITHUB_REDIRECT_URI,
      code,
    }),
  });

  if (!tokenRes.ok) {
    const err = new Error('GitHub token exchange failed');
    err.status = 502;
    throw err;
  }

  const { access_token } = await tokenRes.json();

  const [userRes, emailRes] = await Promise.all([
    fetch(GITHUB_USER_URL,  { headers: { Authorization: `Bearer ${access_token}`, 'User-Agent': 'Staark-API' } }),
    fetch(GITHUB_EMAIL_URL, { headers: { Authorization: `Bearer ${access_token}`, 'User-Agent': 'Staark-API' } }),
  ]);

  const profile = await userRes.json();
  const emails  = emailRes.ok ? await emailRes.json() : [];
  const primary = emails.find(e => e.primary && e.verified)?.email || profile.email;

  const nameParts = (profile.name || profile.login || 'GitHub User').split(' ');

  return {
    provider:    'github',
    id:          String(profile.id),
    email:       primary,
    firstName:   nameParts[0],
    lastName:    nameParts.slice(1).join(' ') || '',
    displayName: profile.name || profile.login,
  };
}

// ─── Find or create OAuth user ─────────────────────────────────────────────

async function findOrCreateUser(profile) {
  if (!profile.email) {
    const err = new Error('OAuth provider did not return an email address');
    err.status = 400;
    throw err;
  }

  // 1. Look up by oauth_provider + oauth_id
  let user = await db.get(
    `SELECT * FROM users WHERE oauth_provider = ? AND oauth_id = ?`,
    [profile.provider, profile.id]
  );

  // 2. Fall back to email match (link accounts)
  if (!user) {
    user = await db.get(`SELECT * FROM users WHERE email = ?`, [profile.email.toLowerCase()]);
    if (user) {
      await db.run(
        `UPDATE users SET oauth_provider = ?, oauth_id = ?, updated_at = UNIX_TIMESTAMP() WHERE id = ?`,
        [profile.provider, profile.id, user.id]
      );
      user = await db.get(`SELECT * FROM users WHERE id = ?`, [user.id]);
    }
  }

  // 3. Create new user
  if (!user) {
    const id      = generateId('usr');
    const display = profile.displayName || `${profile.firstName} ${profile.lastName}`.trim();

    await db.run(
      `INSERT INTO users (id, email, first_name, last_name, display_name, email_verified, oauth_provider, oauth_id)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
      [id, profile.email.toLowerCase(), profile.firstName, profile.lastName, display, profile.provider, profile.id]
    );

    const wsId = generateId('ws');
    await db.run(
      `INSERT INTO workspaces (id, user_id, name) VALUES (?, ?, ?)`,
      [wsId, id, `${profile.firstName}'s Workspace`]
    );

    user = await db.get(`SELECT * FROM users WHERE id = ?`, [id]);
  }

  // Issue tokens
  const workspace = await db.get(`SELECT id FROM workspaces WHERE user_id = ?`, [user.id]);
  const accessToken  = jwt.sign(
    { sub: user.id, email: user.email, display_name: user.display_name, plan: 'free', workspace_id: workspace?.id },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
  const refreshToken = await UserService.createRefreshToken(user.id);

  return { accessToken, refreshToken };
}

export default { getGoogleUrl, handleGoogleCallback, getGithubUrl, handleGithubCallback, findOrCreateUser };
