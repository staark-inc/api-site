import db from '../db.js';

export async function up() {
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
  console.log('[migrate] ssh_connections table ready');
}

// Run standalone: node migrate/sshConnections.js
if (process.env.RUN_MIGRATION) {
  up().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
}
