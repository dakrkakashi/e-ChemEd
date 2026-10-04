/**
 * init-postgres.js — PostgreSQL Database Migration & Seeding CLI for e-chemEd
 * 
 * Usage:
 *   node scripts/init-postgres.js
 *   node scripts/init-postgres.js "postgres://user:password@host/dbname?sslmode=require"
 */

const path = require('path');
const dotenv = require('dotenv');

// Load environment configuration
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', 'backend', '.env') });

const connectionString = process.argv[2] || 
                         process.env.POSTGRES_URL || 
                         process.env.DATABASE_URL || 
                         process.env.POSTGRES_PRISMA_URL;

if (!connectionString) {
  console.error('\n[ERROR] No PostgreSQL connection string found.');
  console.error('Please provide a connection string as an argument or define POSTGRES_URL in .env:');
  console.error('  node scripts/init-postgres.js "postgres://user:pass@host:5432/dbname?sslmode=require"\n');
  process.exit(1);
}

const { Pool } = require('pg');
const crypto = require('crypto');

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

async function runMigration() {
  console.log('\n======================================================');
  console.log('       e-chemEd POSTGRESQL SCHEMA INITIALIZATION      ');
  console.log('======================================================\n');

  const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  const pool = new Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  });

  try {
    console.log('[1/3] Connecting to PostgreSQL database...');
    const client = await pool.connect();
    console.log('[PASS] Connected successfully.');

    console.log('[2/3] Applying schema (attendance, settings, users, sessions, user_progress)...');
    await client.query(`
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
    console.log('[PASS] Schema created/verified.');

    console.log('[3/3] Checking default user accounts...');
    const countRes = await client.query('SELECT COUNT(*) AS total FROM users');
    const totalUsers = parseInt(countRes.rows[0].total, 10);

    if (totalUsers === 0) {
      const now = new Date().toISOString();
      const adminPass = hashPassword('admin123');
      await client.query(
        `INSERT INTO users (username, password_hash, salt, role, name, roll_no, division, prn, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        ['admin', adminPass.hash, adminPass.salt, 'admin', 'Dr. S. S. Chine', null, null, null, now]
      );

      const studentPass = hashPassword('student123');
      await client.query(
        `INSERT INTO users (username, password_hash, salt, role, name, roll_no, division, prn, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        ['student', studentPass.hash, studentPass.salt, 'student', 'Rahul Shinde', '101', 'A (Computer)', '72183921B', now]
      );
      console.log('[PASS] Seeded default accounts: admin (Dr. S. S. Chine) and student (Rahul Shinde).');
    } else {
      console.log(`[INFO] Database already contains ${totalUsers} user account(s). Skipping seeding.`);
    }

    client.release();
    await pool.end();

    console.log('\n======================================================');
    console.log('   POSTGRESQL DATABASE IS READY FOR PRODUCTION        ');
    console.log('======================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\n[FATAL MIGRATION ERROR]:', err.message);
    await pool.end();
    process.exit(1);
  }
}

runMigration();
