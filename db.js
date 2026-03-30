// @ts-nocheck
/// <reference path="../types/index.d.ts" />

import mysql from 'mysql2/promise';

// ── Connection Pool ───────────────────────────────────────────
const pool = mysql.createPool({
  host:               process.env.DB_HOST     || '192.168.0.11',
  port:        parseInt(process.env.DB_PORT   || '3306'),
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'app',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone:           '+00:00',
  charset:            'utf8mb4',
});

// ── Helpers — interfață compatibilă cu better-sqlite3 ─────────
//
//  better-sqlite3 (sync):
//    db.prepare(sql).all(params)      → rows[]
//    db.prepare(sql).get(params)      → row | undefined
//    db.prepare(sql).run(params)      → { changes, lastInsertRowid }
//
//  mysql2 (async) — folosim aceeași convenție prin wrapper-e:
//    await db.all(sql, params)        → rows[]
//    await db.get(sql, params)        → row | undefined
//    await db.run(sql, params)        → { changes, lastInsertRowid }
//    await db.query(sql, params)      → rows[] (alias pentru all)
//

const db = {
  pool,

  // SELECT → array de obiecte
  async all(sql, params = []) {
    const [rows] = await pool.query(sql, params);
    return rows;
  },

  // SELECT → primul rând sau undefined
  async get(sql, params = []) {
    const [rows] = await pool.query(sql, params);
    return rows[0] ?? undefined;
  },

  // INSERT / UPDATE / DELETE → { changes, lastInsertRowid }
  async run(sql, params = []) {
    const [result] = await pool.query(sql, params);
    return {
      changes:         result.affectedRows ?? 0,
      lastInsertRowid: result.insertId     ?? null,
    };
  },

  // Alias pentru all()
  async query(sql, params = []) {
    return this.all(sql, params);
  },

  // Tranzacție — preia o funcție async și o execută într-o conexiune dedicată
  async transaction(fn) {
    const conn = await pool.getConnection();
    await conn.beginTransaction();
    try {
      const result = await fn({
        all:   async (sql, p=[]) => { const [r] = await conn.query(sql, p); return r },
        get:   async (sql, p=[]) => { const [r] = await conn.query(sql, p); return r[0] ?? undefined },
        run:   async (sql, p=[]) => { const [r] = await conn.query(sql, p); return { changes: r.affectedRows, lastInsertRowid: r.insertId } },
        query: async (sql, p=[]) => { const [r] = await conn.query(sql, p); return r },
      });
      await conn.commit();
      return result;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  // Verifică conexiunea la startup
  async ping() {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    return true;
  },
};

// ── Status Checks ─────────────────────────────────────────────

async function saveCheck(service) {
  await db.run(
    `INSERT INTO status_checks
     (service_name, target, status, latency_ms, http_status, checked_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      service.name,
      service.target,
      service.status,
      service.latencyMs  ?? 0,
      service.httpStatus ?? null,
      new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, ''),
    ]
  );
}

async function getDailyHistory(days = 90) {
  return db.all(
    `SELECT
       service_name,
       DATE(checked_at) AS day,
       COUNT(*) AS total_checks,
       SUM(CASE WHEN status = 'Operational' THEN 1 ELSE 0 END) AS ok_checks,
       ROUND(
         SUM(CASE WHEN status = 'Operational' THEN 1 ELSE 0 END) * 100.0 / COUNT(*),
         2
       ) AS uptime_percent
     FROM status_checks
     WHERE checked_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
     GROUP BY service_name, day
     ORDER BY day ASC`,
    [days]
  );
}

export {
  db as default,
  saveCheck,
  getDailyHistory,
};