import db from '../db.js';

class SshConnectionService {
  async list(userId) {
    const rows = await db.all(
      `SELECT data FROM ssh_connections
       WHERE user_id = ?
       ORDER BY sort_order ASC, created_at ASC`,
      [userId]
    );
    return rows.map(r => JSON.parse(r.data));
  }

  async upsert(userId, connection) {
    const {
      id, name = '', host = '', port = 22,
      username = '', authType = 'password', sort_order = 0,
    } = connection;

    const existing = await db.get(
      `SELECT id FROM ssh_connections WHERE id = ? AND user_id = ?`,
      [id, userId]
    );

    if (existing) {
      await db.run(
        `UPDATE ssh_connections
         SET name=?, host=?, port=?, username=?, auth_type=?, data=?, sort_order=?, updated_at=NOW()
         WHERE id=? AND user_id=?`,
        [name, host, port ?? 22, username, authType, JSON.stringify(connection), sort_order, id, userId]
      );
    } else {
      await db.run(
        `INSERT INTO ssh_connections (id, user_id, name, host, port, username, auth_type, data, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, userId, name, host, port ?? 22, username, authType, JSON.stringify(connection), sort_order]
      );
    }

    const row = await db.get(
      `SELECT data FROM ssh_connections WHERE id = ? AND user_id = ?`,
      [id, userId]
    );
    return JSON.parse(row.data);
  }

  async delete(userId, id) {
    const result = await db.run(
      `DELETE FROM ssh_connections WHERE id = ? AND user_id = ?`,
      [id, userId]
    );
    return { deleted: result.changes > 0 };
  }

  async bulkSync(userId, connections) {
    for (const conn of connections) {
      if (conn.id) await this.upsert(userId, conn);
    }
    return this.list(userId);
  }
}

export default new SshConnectionService();
