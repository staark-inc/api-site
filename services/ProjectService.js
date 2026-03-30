import crypto from 'crypto';
import db     from '../db.js';

function generateId() {
  return 'proj_' + crypto.randomBytes(8).toString('hex');
}

async function taskCount(projectId) {
  const row = await db.get(
    `SELECT COUNT(*) as count FROM tasks WHERE project_id = ?`,
    [projectId]
  );
  return row?.count ?? 0;
}

async function withTaskCount(project) {
  if (!project) return null;
  return { ...project, task_count: await taskCount(project.id) };
}

// ─── Service ───────────────────────────────────────────────────────────────

async function list({ workspace_id, status, limit = 20, page = 1 }) {
  const offset = (page - 1) * limit;

  const where  = status
    ? `WHERE workspace_id = ? AND status = ?`
    : `WHERE workspace_id = ?`;
  const params = status ? [workspace_id, status] : [workspace_id];

  const countRow = await db.get(
    `SELECT COUNT(*) as count FROM projects ${where}`,
    params
  );
  const total = countRow.count;

  const rows = await db.all(
    `SELECT * FROM projects ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    data: await Promise.all(rows.map(withTaskCount)),
    meta: { total, page, limit },
  };
}

async function create({ workspace_id, name, description, color, visibility = 'private' }) {
  const id = generateId();

  await db.run(
    `INSERT INTO projects (id, workspace_id, name, description, color, visibility)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, workspace_id, name, description ?? null, color ?? null, visibility]
  );

  return withTaskCount(await db.get(`SELECT * FROM projects WHERE id = ?`, [id]));
}

async function getById(id) {
  return withTaskCount(await db.get(`SELECT * FROM projects WHERE id = ?`, [id]));
}

async function update(id, fields) {
  const allowed = ['name', 'description', 'color', 'status', 'visibility'];
  const updates = Object.keys(fields).filter(k => allowed.includes(k));

  if (!updates.length) return getById(id);

  const set    = updates.map(k => `${k} = ?`).join(', ');
  const values = updates.map(k => fields[k]);

  await db.run(
    `UPDATE projects SET ${set}, updated_at = UNIX_TIMESTAMP() WHERE id = ?`,
    [...values, id]
  );

  return getById(id);
}

async function remove(id) {
  const result = await db.run(`DELETE FROM projects WHERE id = ?`, [id]);
  return result.changes > 0;
}

export default { list, create, getById, update, remove };
