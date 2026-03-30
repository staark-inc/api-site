/**
 * migrate-workspaces.js
 * Rulează o singură dată: node migrate-workspaces.js
 * Creează câte un workspace pentru fiecare user care nu are unul.
 */

import crypto from 'crypto';
import db from '../db.js';

function generateId(prefix) {
  return prefix + '_' + crypto.randomBytes(8).toString('hex');
}

// Creează tabelul dacă nu există (sigur de rulat de mai multe ori)
db.exec(`
  CREATE TABLE IF NOT EXISTS workspaces (
    id          TEXT    PRIMARY KEY,
    user_id     TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT    NOT NULL,
    created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE INDEX IF NOT EXISTS idx_workspaces_user ON workspaces(user_id);
`);

// Găsește toți userii fără workspace
const usersWithoutWorkspace = db.prepare(`
  SELECT u.id, u.first_name, u.last_name
  FROM users u
  LEFT JOIN workspaces w ON w.user_id = u.id
  WHERE w.id IS NULL
`).all();

if (usersWithoutWorkspace.length === 0) {
  console.log('✓ Toți userii au deja un workspace. Nimic de făcut.');
  process.exit(0);
}

console.log(`→ Găsiți ${usersWithoutWorkspace.length} useri fără workspace. Creez...`);

const insert = db.prepare(`
  INSERT INTO workspaces (id, user_id, name)
  VALUES (?, ?, ?)
`);

const migrate = db.transaction(() => {
  for (const user of usersWithoutWorkspace) {
    const workspaceId = generateId('ws');
    const name = `${user.first_name}'s Workspace`;
    insert.run(workspaceId, user.id, name);
    console.log(`  ✓ ${user.first_name} ${user.last_name} → ${workspaceId}`);
  }
});

migrate();

console.log(`\n✓ Migrare completă. ${usersWithoutWorkspace.length} workspace-uri create.`);
process.exit(0);