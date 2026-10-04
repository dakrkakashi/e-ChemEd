/**
 * db.js — Multi-Engine Database Connection & Queries for e-chemEd
 * 
 * Supports:
 * 1. PostgreSQL (Vercel Postgres / Neon / Supabase) via 'pg' connection pooling.
 * 2. SQLite via better-sqlite3 with fallback to node:sqlite (Node 22+) for local/offline runtimes.
 * 3. In-Memory Resilient Fallback for serverless preview/demo runtimes before a cloud DB is attached.
 * 
 * Uses parameterized queries exclusively ($1, $2 for Postgres; ?, ? for SQLite).
 * Never logs student PII.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Determine database engine from environment
const postgresConnStr = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL;
const isPostgres = Boolean(postgresConnStr && postgresConnStr.trim());

let dbEngine = isPostgres ? 'postgresql' : 'unknown';
let pgPool = null;
let sqliteDb = null;
const stmtCache = new Map();

/**
 * Hash password with random salt using native scrypt
 */
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

/**
 * Verify password against salt and stored hash using timingSafeEqual
 */
function verifyPassword(password, salt, storedHash) {
  if (!password || !salt || !storedHash) return false;
  try {
    const computed = crypto.scryptSync(password, salt, 64).toString('hex');
    const bufComputed = Buffer.from(computed);
    const bufStored = Buffer.from(storedHash);
    if (bufComputed.length !== bufStored.length) {
      const dummy = Buffer.alloc(bufStored.length);
      crypto.timingSafeEqual(bufStored, dummy);
      return false;
    }
    return crypto.timingSafeEqual(bufComputed, bufStored);
  } catch (err) {
    return false;
  }
}

// ---------------------------------------------------------------------------
// IN-MEMORY RESILIENT STORE (Zero-setup cloud preview & fallback)
// ---------------------------------------------------------------------------
const defaultAdminPass = hashPassword('admin123');
const defaultStudentPass = hashPassword('student123');

const memoryStore = {
  users: [
    {
      id: 1,
      username: 'admin',
      password_hash: defaultAdminPass.hash,
      salt: defaultAdminPass.salt,
      role: 'admin',
      name: 'Dr. S. S. Chine',
      roll_no: null,
      division: null,
      prn: null,
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      username: 'student',
      password_hash: defaultStudentPass.hash,
      salt: defaultStudentPass.salt,
      role: 'student',
      name: 'Rahul Shinde',
      roll_no: '101',
      division: 'A (Computer)',
      prn: '72183921B',
      created_at: new Date().toISOString()
    }
  ],
  sessions: new Map(),
  userProgress: new Map(),
  attendance: [],
  settings: new Map([['session_code', '']])
};

/**
 * Cache or retrieve prepared statements for SQLite
 */
function getStmt(key, sql) {
  let stmt = stmtCache.get(key);
  if (!stmt && sqliteDb) {
    stmt = sqliteDb.prepare(sql);
    stmtCache.set(key, stmt);
  }
  return stmt;
}

// ---------------------------------------------------------------------------
// POSTGRESQL ENGINE INITIALIZATION & SCHEMA
// ---------------------------------------------------------------------------
let pgInitPromise = null;

function getPgPool() {
  if (!pgPool) {
    const { Pool } = require('pg');
    const isLocal = postgresConnStr.includes('localhost') || postgresConnStr.includes('127.0.0.1');
    pgPool = new Pool({
      connectionString: postgresConnStr,
      ssl: isLocal ? false : { rejectUnauthorized: false },
      max: parseInt(process.env.PG_POOL_MAX || '10', 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    });
  }
  return pgPool;
}

async function ensurePgSchema() {
  if (pgInitPromise) return pgInitPromise;

  pgInitPromise = (async () => {
    const pool = getPgPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        "rollNo" TEXT NOT NULL,
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

      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'student')),
        name TEXT NOT NULL,
        roll_no TEXT,
        division TEXT,
        prn TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        last_active_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS user_progress (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        unit_id INTEGER NOT NULL,
        activity_key TEXT NOT NULL,
        completed_at TEXT NOT NULL,
        CONSTRAINT unique_user_unit_activity UNIQUE (user_id, unit_id, activity_key)
      );
    `);

    // Seed default accounts if empty
    const countRes = await pool.query('SELECT COUNT(*) AS total FROM users');
    const total = parseInt(countRes.rows[0].total, 10);
    if (total === 0) {
      const now = new Date().toISOString();
      const adminPass = hashPassword('admin123');
      await pool.query(
        `INSERT INTO users (username, password_hash, salt, role, name, roll_no, division, prn, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        ['admin', adminPass.hash, adminPass.salt, 'admin', 'Dr. S. S. Chine', null, null, null, now]
      );

      const studentPass = hashPassword('student123');
      await pool.query(
        `INSERT INTO users (username, password_hash, salt, role, name, roll_no, division, prn, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        ['student', studentPass.hash, studentPass.salt, 'student', 'Rahul Shinde', '101', 'A (Computer)', '72183921B', now]
      );
    }
  })();

  return pgInitPromise;
}

// ---------------------------------------------------------------------------
// SQLITE ENGINE INITIALIZATION & SCHEMA
// ---------------------------------------------------------------------------
if (!isPostgres) {
  try {
    let DB_DIR = path.resolve(__dirname, 'data');
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
    } catch (e) {
      DB_DIR = path.join('/tmp', 'echemed-data');
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
    }
    const DB_PATH = path.join(DB_DIR, 'echemed.db');

    try {
      const Database = require('better-sqlite3');
      sqliteDb = new Database(DB_PATH);
      sqliteDb.pragma('journal_mode = WAL');
      sqliteDb.pragma('foreign_keys = ON');
      sqliteDb.pragma('busy_timeout = 5000');
      dbEngine = 'better-sqlite3';
    } catch (err) {
      try {
        const { DatabaseSync } = require('node:sqlite');
        sqliteDb = new DatabaseSync(DB_PATH);
        sqliteDb.exec('PRAGMA journal_mode = WAL;');
        sqliteDb.exec('PRAGMA foreign_keys = ON;');
        dbEngine = 'node:sqlite';
      } catch (err2) {
        dbEngine = 'memory-fallback';
      }
    }

    if (sqliteDb) {
      // Initialize SQLite schema
      sqliteDb.exec(`
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

        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL COLLATE NOCASE,
          password_hash TEXT NOT NULL,
          salt TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('admin', 'student')),
          name TEXT NOT NULL,
          roll_no TEXT,
          division TEXT,
          prn TEXT,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sessions (
          token TEXT PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          expires_at TEXT NOT NULL,
          created_at TEXT NOT NULL,
          last_active_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS user_progress (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          unit_id INTEGER NOT NULL,
          activity_key TEXT NOT NULL,
          completed_at TEXT NOT NULL,
          CONSTRAINT unique_user_unit_activity UNIQUE (user_id, unit_id, activity_key)
        );
      `);

      seedDefaultUsers();
    } else {
      dbEngine = 'memory-fallback';
    }
  } catch (initErr) {
    dbEngine = 'memory-fallback';
  }
}

/**
 * Seed default accounts in SQLite
 */
function seedDefaultUsers() {
  if (isPostgres) {
    return ensurePgSchema();
  }
  if (!sqliteDb) {
    return;
  }

  const countStmt = getStmt('countUsers', 'SELECT COUNT(*) AS total FROM users');
  if (!countStmt) return;
  const row = countStmt.get();
  const total = row ? Number(row.total) : 0;

  if (total === 0) {
    const now = new Date().toISOString();
    const insertStmt = getStmt('insertUser', `
      INSERT INTO users (username, password_hash, salt, role, name, roll_no, division, prn, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Admin: admin / admin123
    const adminPass = hashPassword('admin123');
    insertStmt.run('admin', adminPass.hash, adminPass.salt, 'admin', 'Dr. S. S. Chine', null, null, null, now);

    // Student: student / student123
    const studentPass = hashPassword('student123');
    insertStmt.run('student', studentPass.hash, studentPass.salt, 'student', 'Rahul Shinde', '101', 'A (Computer)', '72183921B', now);
  }
}

// ---------------------------------------------------------------------------
// DATA ACCESS LAYER (UNIFIED ASYNC API)
// ---------------------------------------------------------------------------

/**
 * Retrieve user by username with credentials for login verification
 */
async function getUserWithPassword(username) {
  if (!username) return null;

  if (isPostgres) {
    await ensurePgSchema();
    const res = await getPgPool().query(
      `SELECT id, username, password_hash, salt, role, name, roll_no, division, prn, created_at
       FROM users
       WHERE LOWER(username) = LOWER($1)`,
      [username.trim()]
    );
    return res.rows[0] || null;
  }

  if (sqliteDb) {
    const stmt = getStmt('getUserWithPassword', `
      SELECT id, username, password_hash, salt, role, name, roll_no, division, prn, created_at
      FROM users
      WHERE username = ?
    `);
    return stmt.get(username.trim()) || null;
  }

  // Memory fallback
  const clean = username.trim().toLowerCase();
  const u = memoryStore.users.find(u => u.username.toLowerCase() === clean || (u.prn && u.prn.toLowerCase() === clean));
  return u ? { ...u } : null;
}

/**
 * Retrieve safe user object by ID
 */
async function getUserById(id) {
  if (isPostgres) {
    await ensurePgSchema();
    const res = await getPgPool().query(
      `SELECT id, username, role, name, roll_no, division, prn, created_at
       FROM users
       WHERE id = $1`,
      [id]
    );
    return res.rows[0] || null;
  }

  if (sqliteDb) {
    const stmt = getStmt('getUserById', `
      SELECT id, username, role, name, roll_no, division, prn, created_at
      FROM users
      WHERE id = ?
    `);
    return stmt.get(id) || null;
  }

  // Memory fallback
  const u = memoryStore.users.find(u => u.id === Number(id));
  if (!u) return null;
  return {
    id: u.id, username: u.username, role: u.role, name: u.name,
    roll_no: u.roll_no, division: u.division, prn: u.prn, created_at: u.created_at
  };
}

/**
 * Retrieve safe user object by username
 */
async function getUserByUsername(username) {
  if (!username) return null;

  if (isPostgres) {
    await ensurePgSchema();
    const res = await getPgPool().query(
      `SELECT id, username, role, name, roll_no, division, prn, created_at
       FROM users
       WHERE LOWER(username) = LOWER($1)`,
      [username.trim()]
    );
    return res.rows[0] || null;
  }

  if (sqliteDb) {
    const stmt = getStmt('getUserByUsername', `
      SELECT id, username, role, name, roll_no, division, prn, created_at
      FROM users
      WHERE username = ?
    `);
    return stmt.get(username.trim()) || null;
  }

  // Memory fallback
  const clean = username.trim().toLowerCase();
  const u = memoryStore.users.find(u => u.username.toLowerCase() === clean);
  if (!u) return null;
  return {
    id: u.id, username: u.username, role: u.role, name: u.name,
    roll_no: u.roll_no, division: u.division, prn: u.prn, created_at: u.created_at
  };
}

/**
 * Create a new user session (7 days validity)
 */
async function createSession(userId, durationDays = 7) {
  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();
  const createdAt = now.toISOString();

  if (isPostgres) {
    await ensurePgSchema();
    await getPgPool().query(
      `INSERT INTO sessions (token, user_id, expires_at, created_at, last_active_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [token, userId, expiresAt, createdAt, createdAt]
    );
    return { token, expiresAt };
  }

  if (sqliteDb) {
    const stmt = getStmt('createSession', `
      INSERT INTO sessions (token, user_id, expires_at, created_at, last_active_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(token, userId, expiresAt, createdAt, createdAt);
    return { token, expiresAt };
  }

  // Memory fallback
  memoryStore.sessions.set(token, {
    token,
    userId,
    expiresAt,
    createdAt,
    lastActiveAt: createdAt
  });
  return { token, expiresAt };
}

/**
 * Validate session token and return user profile
 */
async function getSession(token) {
  if (!token || typeof token !== 'string') return null;

  const now = new Date().toISOString();

  if (isPostgres) {
    await ensurePgSchema();
    const res = await getPgPool().query(
      `SELECT s.token, s.user_id, s.expires_at, s.created_at, s.last_active_at,
              u.id, u.username, u.role, u.name, u.roll_no, u.division, u.prn
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.token = $1`,
      [token]
    );
    const record = res.rows[0];
    if (!record) return null;

    if (record.expires_at <= now) {
      await deleteSession(token);
      return null;
    }

    getPgPool().query('UPDATE sessions SET last_active_at = $1 WHERE token = $2', [now, token]).catch(() => {});

    return {
      token: record.token,
      userId: record.user_id,
      expiresAt: record.expires_at,
      createdAt: record.created_at,
      lastActiveAt: now,
      user: {
        id: record.user_id,
        username: record.username,
        role: record.role,
        name: record.name,
        rollNo: record.roll_no,
        division: record.division,
        prn: record.prn
      }
    };
  }

  if (sqliteDb) {
    const stmt = getStmt('getSession', `
      SELECT s.token, s.user_id, s.expires_at, s.created_at, s.last_active_at,
             u.id, u.username, u.role, u.name, u.roll_no, u.division, u.prn
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ?
    `);
    const record = stmt.get(token);

    if (!record) return null;

    if (record.expires_at <= now) {
      deleteSession(token);
      return null;
    }

    try {
      const updateStmt = getStmt('updateLastActive', 'UPDATE sessions SET last_active_at = ? WHERE token = ?');
      updateStmt.run(now, token);
    } catch (e) {}

    return {
      token: record.token,
      userId: record.user_id,
      expiresAt: record.expires_at,
      createdAt: record.created_at,
      lastActiveAt: now,
      user: {
        id: record.user_id,
        username: record.username,
        role: record.role,
        name: record.name,
        rollNo: record.roll_no,
        division: record.division,
        prn: record.prn
      }
    };
  }

  // Memory fallback
  const record = memoryStore.sessions.get(token);
  if (!record) return null;
  if (record.expiresAt <= now) {
    memoryStore.sessions.delete(token);
    return null;
  }
  record.lastActiveAt = now;
  const u = memoryStore.users.find(u => u.id === record.userId);
  if (!u) return null;
  return {
    token: record.token,
    userId: record.userId,
    expiresAt: record.expiresAt,
    createdAt: record.createdAt,
    lastActiveAt: now,
    user: {
      id: u.id,
      username: u.username,
      role: u.role,
      name: u.name,
      rollNo: u.roll_no,
      division: u.division,
      prn: u.prn
    }
  };
}

/**
 * Delete a user session (logout)
 */
async function deleteSession(token) {
  if (!token) return;

  if (isPostgres) {
    await ensurePgSchema();
    await getPgPool().query('DELETE FROM sessions WHERE token = $1', [token]);
    return;
  }

  if (sqliteDb) {
    const stmt = getStmt('deleteSession', 'DELETE FROM sessions WHERE token = ?');
    if (stmt) stmt.run(token);
    return;
  }

  // Memory fallback
  memoryStore.sessions.delete(token);
}

/**
 * Remove all expired sessions
 */
async function cleanExpiredSessions() {
  const now = new Date().toISOString();

  if (isPostgres) {
    await ensurePgSchema();
    const res = await getPgPool().query('DELETE FROM sessions WHERE expires_at <= $1', [now]);
    return res.rowCount;
  }

  if (sqliteDb) {
    const stmt = getStmt('cleanExpiredSessions', 'DELETE FROM sessions WHERE expires_at <= ?');
    if (!stmt) return 0;
    const res = stmt.run(now);
    return res.changes;
  }

  // Memory fallback
  let deleted = 0;
  for (const [t, s] of memoryStore.sessions.entries()) {
    if (s.expiresAt <= now) {
      memoryStore.sessions.delete(t);
      deleted++;
    }
  }
  return deleted;
}

/**
 * Retrieve user progress across all units
 */
async function getUserProgress(userId) {
  const units = {
    1: { mindMapRead: false, videoWatched: false, questionBankViewed: false, quizCompleted: false, gamePlayed: false },
    2: { mindMapRead: false, videoWatched: false, questionBankViewed: false, quizCompleted: false, gamePlayed: false },
    3: { mindMapRead: false, videoWatched: false, questionBankViewed: false, quizCompleted: false, gamePlayed: false },
    4: { mindMapRead: false, videoWatched: false, questionBankViewed: false, quizCompleted: false, gamePlayed: false },
    5: { mindMapRead: false, videoWatched: false, questionBankViewed: false, quizCompleted: false, gamePlayed: false }
  };

  let rows = [];
  if (isPostgres) {
    await ensurePgSchema();
    const res = await getPgPool().query(
      'SELECT unit_id, activity_key, completed_at FROM user_progress WHERE user_id = $1',
      [userId]
    );
    rows = res.rows;
  } else if (sqliteDb) {
    const stmt = getStmt('getUserProgress', `
      SELECT unit_id, activity_key, completed_at
      FROM user_progress
      WHERE user_id = ?
    `);
    if (stmt) rows = stmt.all(userId);
  } else {
    // Memory fallback
    const list = memoryStore.userProgress.get(Number(userId)) || [];
    rows = list;
  }

  for (const row of rows) {
    if (!units[row.unit_id]) {
      units[row.unit_id] = { mindMapRead: false, videoWatched: false, questionBankViewed: false, quizCompleted: false, gamePlayed: false };
    }
    units[row.unit_id][row.activity_key] = true;
  }

  return { units };
}

/**
 * Mark an activity for a user and return the updated progress
 */
async function markUserActivity(userId, unitId, activityKey) {
  const now = new Date().toISOString();

  if (isPostgres) {
    await ensurePgSchema();
    await getPgPool().query(
      `INSERT INTO user_progress (user_id, unit_id, activity_key, completed_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, unit_id, activity_key) DO UPDATE SET completed_at = EXCLUDED.completed_at`,
      [userId, Number(unitId), String(activityKey), now]
    );
    return getUserProgress(userId);
  }

  if (sqliteDb) {
    const stmt = getStmt('markUserActivity', `
      INSERT INTO user_progress (user_id, unit_id, activity_key, completed_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id, unit_id, activity_key) DO UPDATE SET completed_at = excluded.completed_at
    `);
    if (stmt) stmt.run(userId, Number(unitId), String(activityKey), now);
    return getUserProgress(userId);
  }

  // Memory fallback
  const uid = Number(userId);
  const uId = Number(unitId);
  const key = String(activityKey);
  let list = memoryStore.userProgress.get(uid);
  if (!list) {
    list = [];
    memoryStore.userProgress.set(uid, list);
  }
  const exists = list.find(item => item.unit_id === uId && item.activity_key === key);
  if (exists) {
    exists.completed_at = now;
  } else {
    list.push({ unit_id: uId, activity_key: key, completed_at: now });
  }
  return getUserProgress(userId);
}

/**
 * Inserts a single attendance record.
 * Throws on duplicate constraint violation (handled by router).
 */
async function insertAttendance({ name, rollNo, division, prn, unit, session, date }) {
  const createdAt = new Date().toISOString();

  if (isPostgres) {
    await ensurePgSchema();
    const res = await getPgPool().query(
      `INSERT INTO attendance (name, "rollNo", division, prn, unit, session, date, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, created_at`,
      [name, rollNo, division, prn, unit, session, date, createdAt]
    );
    return {
      id: Number(res.rows[0].id),
      createdAt
    };
  }

  if (sqliteDb) {
    const stmt = getStmt('insertAttendance', `
      INSERT INTO attendance (name, rollNo, division, prn, unit, session, date, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(name, rollNo, division, prn, unit, session, date, createdAt);
    return {
      id: Number(result.lastInsertRowid),
      createdAt
    };
  }

  // Memory fallback
  const isDup = memoryStore.attendance.find(a => 
    a.prn === prn && a.unit === unit && a.session === session && a.date === date
  );
  if (isDup) {
    const err = new Error('Attendance already recorded (duplicate constraint)');
    err.code = '23505';
    throw err;
  }
  const id = memoryStore.attendance.length + 1;
  const rec = {
    id,
    name,
    rollNo,
    division,
    prn,
    unit,
    session,
    date,
    created_at: createdAt
  };
  memoryStore.attendance.push(rec);
  return { id, createdAt };
}

/**
 * Retrieves all attendance records ordered by newest first.
 */
async function getAllAttendance() {
  if (isPostgres) {
    await ensurePgSchema();
    const res = await getPgPool().query(`
      SELECT id, name, "rollNo", division, prn, unit, session, date, created_at
      FROM attendance
      ORDER BY id DESC
    `);
    return res.rows;
  }

  if (sqliteDb) {
    const stmt = getStmt('getAllAttendance', `
      SELECT id, name, rollNo, division, prn, unit, session, date, created_at
      FROM attendance
      ORDER BY id DESC
    `);
    return stmt.all();
  }

  // Memory fallback
  return [...memoryStore.attendance].reverse();
}

/**
 * Gets count of all attendance records.
 */
async function getAttendanceCount() {
  if (isPostgres) {
    await ensurePgSchema();
    const res = await getPgPool().query('SELECT COUNT(*) AS total FROM attendance');
    return res.rows[0] ? Number(res.rows[0].total) : 0;
  }

  if (sqliteDb) {
    const stmt = getStmt('getAttendanceCount', 'SELECT COUNT(*) AS total FROM attendance');
    const row = stmt ? stmt.get() : null;
    return row ? Number(row.total) : 0;
  }

  // Memory fallback
  return memoryStore.attendance.length;
}

/**
 * Purges all attendance records. Returns count of deleted rows.
 */
async function purgeAttendance() {
  const countBefore = await getAttendanceCount();

  if (isPostgres) {
    await ensurePgSchema();
    await getPgPool().query('DELETE FROM attendance');
    try {
      await getPgPool().query('ALTER SEQUENCE IF EXISTS attendance_id_seq RESTART WITH 1');
    } catch (e) {}
    return countBefore;
  }

  if (sqliteDb) {
    sqliteDb.exec('DELETE FROM attendance');
    try {
      sqliteDb.exec("DELETE FROM sqlite_sequence WHERE name = 'attendance'");
    } catch (e) {}
    return countBefore;
  }

  // Memory fallback
  memoryStore.attendance = [];
  return countBefore;
}

/**
 * Gets a persistent setting by key.
 */
async function getSetting(key, defaultValue = null) {
  if (isPostgres) {
    await ensurePgSchema();
    const res = await getPgPool().query('SELECT value FROM settings WHERE key = $1', [key]);
    return res.rows[0] ? res.rows[0].value : defaultValue;
  }

  if (sqliteDb) {
    const stmt = getStmt('getSetting', 'SELECT value FROM settings WHERE key = ?');
    const row = stmt ? stmt.get(key) : null;
    return row ? row.value : defaultValue;
  }

  // Memory fallback
  return memoryStore.settings.has(key) ? memoryStore.settings.get(key) : defaultValue;
}

/**
 * Sets a persistent setting.
 */
async function setSetting(key, value) {
  const updatedAt = new Date().toISOString();

  if (isPostgres) {
    await ensurePgSchema();
    await getPgPool().query(
      `INSERT INTO settings (key, value, updated_at)
       VALUES ($1, $2, $3)
       ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`,
      [key, String(value), updatedAt]
    );
    return;
  }

  if (sqliteDb) {
    const stmt = getStmt('setSetting', `
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `);
    if (stmt) stmt.run(key, String(value), updatedAt);
    return;
  }

  // Memory fallback
  memoryStore.settings.set(key, String(value));
}

/**
 * Cleanly closes database connection pool/instance
 */
async function closeDb() {
  if (pgPool) {
    await pgPool.end();
    pgPool = null;
  }
}

module.exports = {
  db: sqliteDb,
  dbEngine,
  isPostgres,
  ensurePgSchema,
  hashPassword,
  verifyPassword,
  seedDefaultUsers,
  getUserWithPassword,
  getUserById,
  getUserByUsername,
  createSession,
  getSession,
  deleteSession,
  cleanExpiredSessions,
  getUserProgress,
  markUserActivity,
  insertAttendance,
  getAllAttendance,
  getAttendanceCount,
  purgeAttendance,
  getSetting,
  setSetting,
  closeDb
};
