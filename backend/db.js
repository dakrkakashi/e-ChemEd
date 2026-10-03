/**
 * db.js — SQLite Database Connection & Queries for e-chemEd
 * 
 * Supports better-sqlite3 with seamless fallback to built-in node:sqlite (Node 22+)
 * Uses parameterized queries exclusively. Never logs student PII.
 */

const fs = require('fs');
const path = require('path');

const DB_DIR = path.resolve(__dirname, 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'echemed.db');

let db;
let dbEngine = 'unknown';

try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  dbEngine = 'better-sqlite3';
} catch (err) {
  // If better-sqlite3 is unavailable, attempt built-in node:sqlite (Node 22.5+)
  try {
    const { DatabaseSync } = require('node:sqlite');
    db = new DatabaseSync(DB_PATH);
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec('PRAGMA foreign_keys = ON;');
    dbEngine = 'node:sqlite';
  } catch (err2) {
    console.error('Fatal: Failed to initialize SQLite database engine.');
    console.error('better-sqlite3 error:', err.message);
    console.error('node:sqlite error:', err2.message);
    process.exit(1);
  }
}

// Initialize tables with UNIQUE constraint on (prn, unit, session, date)
db.exec(`
  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    rollNo TEXT NOT NULL,
    division TEXT NOT NULL,
    prn TEXT NOT NULL,
    unit TEXT NOT NULL,
    session TEXT NOT NULL,
    date TEXT NOT NULL,
    created_at TEXT NOT NULL,
    CONSTRAINT unique_attendance UNIQUE (prn, unit, session, date)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

/**
 * Inserts a single attendance record.
 * Throws on duplicate constraint violation (handled by router).
 */
function insertAttendance({ name, rollNo, division, prn, unit, session, date }) {
  const createdAt = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO attendance (name, rollNo, division, prn, unit, session, date, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(name, rollNo, division, prn, unit, session, date, createdAt);
  return {
    id: Number(result.lastInsertRowid),
    createdAt
  };
}

/**
 * Retrieves all attendance records ordered by newest first.
 */
function getAllAttendance() {
  const stmt = db.prepare(`
    SELECT id, name, rollNo, division, prn, unit, session, date, created_at
    FROM attendance
    ORDER BY id DESC
  `);
  return stmt.all();
}

/**
 * Gets count of all attendance records.
 */
function getAttendanceCount() {
  const stmt = db.prepare('SELECT COUNT(*) AS total FROM attendance');
  const row = stmt.get();
  return row ? Number(row.total) : 0;
}

/**
 * Purges all attendance records. Returns count of deleted rows.
 */
function purgeAttendance() {
  const countBefore = getAttendanceCount();
  db.exec('DELETE FROM attendance');
  try {
    db.exec("DELETE FROM sqlite_sequence WHERE name = 'attendance'");
  } catch (e) {
    // sqlite_sequence might not exist if no inserts occurred
  }
  return countBefore;
}

/**
 * Gets a persistent setting by key.
 */
function getSetting(key, defaultValue = null) {
  const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
  const row = stmt.get(key);
  return row ? row.value : defaultValue;
}

/**
 * Sets a persistent setting.
 */
function setSetting(key, value) {
  const updatedAt = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `);
  stmt.run(key, String(value), updatedAt);
}

module.exports = {
  db,
  dbEngine,
  insertAttendance,
  getAllAttendance,
  getAttendanceCount,
  purgeAttendance,
  getSetting,
  setSetting
};
