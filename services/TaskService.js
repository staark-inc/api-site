import crypto from 'crypto';
import db     from '../db.js';

function generateId() {
  return 'task_' + crypto.randomBytes(8).toString('hex');
}

function deserialize(task) {
  if (!task) return null;
  return { ...task, tags: JSON.parse(task.tags ?? '[]') };
}

// ─── Service ───────────────────────────────────────────────────────────────

async function list({ project_id, status, priority, assignee_id, limit = 20, page = 1 }) {
  const offset     = (page - 1) * limit;
  const conditions = ['project_id = ?'];
  const params     = [project_id];

  if (status)      { conditions.push('status = ?');      params.push(status); }
  if (priority)    { conditions.push('priority = ?');     params.push(priority); }
  if (assignee_id) { conditions.push('assignee_id = ?'); params.push(assignee_id); }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const countRow = await db.get(
    `SELECT COUNT(*) as count FROM tasks ${where}`,
    params
  );
  const total = countRow.count;

  const rows = await db.all(
    `SELECT * FROM tasks ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    data: rows.map(deserialize),
    meta: { total, page, limit },
  };
}

async function create({ project_id, title, description, priority = 'medium', assignee_id, due_date, tags = [] }) {
  const id = generateId();

  await db.run(
    `INSERT INTO tasks (id, project_id, title, description, priority, assignee_id, due_date, tags)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, project_id, title, description ?? null, priority, assignee_id ?? null, due_date ?? null, JSON.stringify(tags)]
  );

  return deserialize(await db.get(`SELECT * FROM tasks WHERE id = ?`, [id]));
}

async function getById(id) {
  return deserialize(await db.get(`SELECT * FROM tasks WHERE id = ?`, [id]));
}

async function update(id, fields) {
  const allowed = ['title', 'description', 'status', 'priority', 'assignee_id', 'due_date', 'tags'];
  const updates = Object.keys(fields).filter(k => allowed.includes(k));

  if (!updates.length) return getById(id);

  const values = updates.map(k => k === 'tags' ? JSON.stringify(fields[k]) : fields[k]);
  const set    = updates.map(k => `${k} = ?`).join(', ');

  await db.run(
    `UPDATE tasks SET ${set}, updated_at = UNIX_TIMESTAMP() WHERE id = ?`,
    [...values, id]
  );

  return getById(id);
}

async function remove(id) {
  const result = await db.run(`DELETE FROM tasks WHERE id = ?`, [id]);
  return result.changes > 0;
}

export default { list, create, getById, update, remove };
