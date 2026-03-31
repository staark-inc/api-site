import db from '../db.js';

// ── CSV builder ─────────────────────────────────────────────────────────────

function escapeCSV(val) {
  if (val == null) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function toCSV(rows, columns) {
  const header = columns.join(',');
  const lines  = rows.map(row =>
    columns.map(col => escapeCSV(row[col])).join(',')
  );
  return [header, ...lines].join('\n');
}

// ── Keys export ─────────────────────────────────────────────────────────────

async function exportKeys(user_id) {
  const rows = await db.all(
    `SELECT id, name, key_prefix, plan, label, expires_at, last_used, revoked, created_at
     FROM api_keys
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    [user_id]
  );
  return rows;
}

const KEY_COLUMNS = ['id', 'name', 'key_prefix', 'plan', 'label', 'expires_at', 'last_used', 'revoked', 'created_at'];

// ── Projects + tasks export ──────────────────────────────────────────────────

async function exportProjects(workspace_id) {
  const projects = await db.all(
    `SELECT id, name, description, color, status, visibility, created_at, updated_at
     FROM projects
     WHERE workspace_id = ?
     ORDER BY created_at DESC`,
    [workspace_id]
  );

  const projectsWithTasks = await Promise.all(
    projects.map(async p => {
      const tasks = await db.all(
        `SELECT id, title, description, status, priority, assignee_id, due_date, tags, created_at, updated_at
         FROM tasks
         WHERE project_id = ?
         ORDER BY created_at DESC`,
        [p.id]
      );
      return {
        ...p,
        tasks: tasks.map(t => ({ ...t, tags: JSON.parse(t.tags ?? '[]') })),
      };
    })
  );

  return projectsWithTasks;
}

// Flat list pentru CSV (tasks cu project_id inclus)
async function exportTasksFlat(workspace_id) {
  const rows = await db.all(
    `SELECT t.id, t.project_id, p.name AS project_name,
            t.title, t.description, t.status, t.priority,
            t.assignee_id, t.due_date, t.tags, t.created_at, t.updated_at
     FROM tasks t
     JOIN projects p ON p.id = t.project_id
     WHERE p.workspace_id = ?
     ORDER BY t.created_at DESC`,
    [workspace_id]
  );
  return rows.map(t => ({ ...t, tags: JSON.parse(t.tags ?? '[]') }));
}

const TASK_CSV_COLUMNS = [
  'id', 'project_id', 'project_name', 'title', 'description',
  'status', 'priority', 'assignee_id', 'due_date', 'created_at', 'updated_at'
];

export default { exportKeys, exportProjects, exportTasksFlat, toCSV, KEY_COLUMNS, TASK_CSV_COLUMNS };
