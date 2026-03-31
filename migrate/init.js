import db from '../db.js';

export async function up() {
  // ── Users ──────────────────────────────────────────────────────────────────
  await db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id             VARCHAR(64)   NOT NULL,
      email          VARCHAR(255)  NOT NULL,
      password_hash  VARCHAR(255),
      first_name     VARCHAR(255),
      last_name      VARCHAR(255),
      display_name   VARCHAR(255),
      email_verified TINYINT(1)    NOT NULL DEFAULT 0,
      created_at     BIGINT        NOT NULL DEFAULT (UNIX_TIMESTAMP()),
      updated_at     BIGINT        NOT NULL DEFAULT (UNIX_TIMESTAMP()),
      PRIMARY KEY (id),
      UNIQUE KEY uq_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ── Workspaces ─────────────────────────────────────────────────────────────
  await db.run(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id         VARCHAR(64)   NOT NULL,
      user_id    VARCHAR(64)   NOT NULL,
      name       VARCHAR(255)  NOT NULL,
      created_at TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      INDEX idx_user_id (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ── Refresh tokens ─────────────────────────────────────────────────────────
  await db.run(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
      user_id     VARCHAR(64)   NOT NULL,
      token_hash  VARCHAR(64)   NOT NULL,
      expires_at  BIGINT        NOT NULL,
      created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_token_hash (token_hash),
      INDEX idx_user_id (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ── Email tokens ───────────────────────────────────────────────────────────
  await db.run(`
    CREATE TABLE IF NOT EXISTS email_tokens (
      id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
      user_id     VARCHAR(64)   NOT NULL,
      token_hash  VARCHAR(64)   NOT NULL,
      type        VARCHAR(32)   NOT NULL,
      expires_at  BIGINT        NOT NULL,
      created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      INDEX idx_user_type (user_id, type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ── API keys ───────────────────────────────────────────────────────────────
  await db.run(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
      user_id     VARCHAR(64)   NOT NULL,
      name        VARCHAR(255),
      key_prefix  VARCHAR(32)   NOT NULL,
      key_hash    VARCHAR(255)  NOT NULL,
      plan        VARCHAR(32)   NOT NULL DEFAULT 'free',
      label       VARCHAR(32)   NOT NULL DEFAULT 'development',
      expires_at  BIGINT,
      last_used   BIGINT,
      revoked     TINYINT(1)    NOT NULL DEFAULT 0,
      created_at  BIGINT        NOT NULL DEFAULT (UNIX_TIMESTAMP()),
      PRIMARY KEY (id),
      INDEX idx_key_prefix (key_prefix),
      INDEX idx_user_id (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ── Projects ───────────────────────────────────────────────────────────────
  await db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id           VARCHAR(64)   NOT NULL,
      workspace_id VARCHAR(64)   NOT NULL,
      name         VARCHAR(255)  NOT NULL,
      description  TEXT,
      color        VARCHAR(32),
      status       VARCHAR(32)   NOT NULL DEFAULT 'active',
      visibility   VARCHAR(32)   NOT NULL DEFAULT 'private',
      created_at   BIGINT        NOT NULL DEFAULT (UNIX_TIMESTAMP()),
      updated_at   BIGINT        NOT NULL DEFAULT (UNIX_TIMESTAMP()),
      PRIMARY KEY (id),
      INDEX idx_workspace_id (workspace_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ── Tasks ──────────────────────────────────────────────────────────────────
  await db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id           VARCHAR(64)   NOT NULL,
      project_id   VARCHAR(64)   NOT NULL,
      title        VARCHAR(255)  NOT NULL,
      description  TEXT,
      status       VARCHAR(32)   NOT NULL DEFAULT 'todo',
      priority     VARCHAR(32)   NOT NULL DEFAULT 'medium',
      assignee_id  VARCHAR(64),
      due_date     DATE,
      tags         JSON,
      created_at   BIGINT        NOT NULL DEFAULT (UNIX_TIMESTAMP()),
      updated_at   BIGINT        NOT NULL DEFAULT (UNIX_TIMESTAMP()),
      PRIMARY KEY (id),
      INDEX idx_project_id (project_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ── Status checks ──────────────────────────────────────────────────────────
  await db.run(`
    CREATE TABLE IF NOT EXISTS status_checks (
      id           INT UNSIGNED  NOT NULL AUTO_INCREMENT,
      service_name VARCHAR(255)  NOT NULL,
      target       VARCHAR(255),
      status       VARCHAR(32)   NOT NULL,
      latency_ms   INT           NOT NULL DEFAULT 0,
      http_status  SMALLINT,
      checked_at   DATETIME      NOT NULL,
      PRIMARY KEY (id),
      INDEX idx_service_checked (service_name, checked_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ── SSH connections ────────────────────────────────────────────────────────
  await db.run(`
    CREATE TABLE IF NOT EXISTS ssh_connections (
      id           VARCHAR(64)   NOT NULL,
      user_id      VARCHAR(64)   NOT NULL,
      name         VARCHAR(255),
      host         VARCHAR(255),
      port         INT           DEFAULT 22,
      username     VARCHAR(255),
      auth_type    VARCHAR(32)   DEFAULT 'password',
      data         LONGTEXT      NOT NULL,
      sort_order   INT           DEFAULT 0,
      created_at   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
      updated_at   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      INDEX idx_user_id (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ── Audit log ──────────────────────────────────────────────────────────────
  await db.run(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id     VARCHAR(64)  NOT NULL,
      action      VARCHAR(64)  NOT NULL,
      entity_type VARCHAR(32),
      entity_id   VARCHAR(64),
      details     JSON,
      ip          VARCHAR(64),
      created_at  BIGINT DEFAULT (UNIX_TIMESTAMP()),
      INDEX idx_user_action (user_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ── ALTER api_keys: coloana expiry_notified ────────────────────────────────
  try {
    await db.run(`
      ALTER TABLE api_keys
      ADD COLUMN IF NOT EXISTS expiry_notified TINYINT DEFAULT 0
    `);
  } catch (err) {
    if (err.code !== 'ER_DUP_FIELDNAME') throw err;
  }

  // ALTER users — oauth + totp columns
  try {
    await db.run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(32) DEFAULT NULL`);
    await db.run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_id VARCHAR(255) DEFAULT NULL`);
    await db.run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(64) DEFAULT NULL`);
    await db.run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled TINYINT(1) NOT NULL DEFAULT 0`);
  } catch (err) {
    if (err.code !== 'ER_DUP_FIELDNAME') throw err;
  }

  // user_webhooks table
  await db.run(`
    CREATE TABLE IF NOT EXISTS user_webhooks (
      id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id     VARCHAR(64) NOT NULL,
      url         VARCHAR(512) NOT NULL,
      secret      VARCHAR(128),
      events      JSON NOT NULL,
      active      TINYINT(1) NOT NULL DEFAULT 1,
      created_at  BIGINT DEFAULT (UNIX_TIMESTAMP()),
      INDEX idx_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // webhook_deliveries table
  await db.run(`
    CREATE TABLE IF NOT EXISTS webhook_deliveries (
      id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      webhook_id   INT UNSIGNED NOT NULL,
      event        VARCHAR(64) NOT NULL,
      payload      JSON NOT NULL,
      status       VARCHAR(16) NOT NULL DEFAULT 'pending',
      http_status  SMALLINT,
      response     TEXT,
      duration_ms  INT,
      delivered_at BIGINT DEFAULT (UNIX_TIMESTAMP()),
      INDEX idx_webhook (webhook_id, delivered_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  console.log('[migrate] all tables ready');
}

// Run standalone: RUN_MIGRATION=1 node migrate/init.js
if (process.env.RUN_MIGRATION) {
  up().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
}
