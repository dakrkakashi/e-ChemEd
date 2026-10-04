/**
 * attendance.js — Attendance API Routes
 * 
 * Endpoints for student submission, admin listing, CSV export, and session management.
 * Strictly adheres to student privacy: no console logging of student names, rolls, or PRNs.
 */

const express = require('express');
const router = express.Router();
const { 
  insertAttendance, 
  getAllAttendance, 
  getAttendanceCount, 
  getSetting, 
  setSetting 
} = require('../db');
const { requireAdmin } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rate-limit');
const { validateAttendancePayload, getAcademicConfig } = require('../middleware/validation');

/**
 * Public: Get academic options (divisions, sessions, units)
 */
router.get('/attendance/options', (req, res) => {
  res.json({
    ok: true,
    options: getAcademicConfig()
  });
});

/**
 * Student Submission: POST /api/attendance
 * Rate limited to 60/min per IP.
 * Strict input validation & parameterized SQL.
 */
router.post('/attendance', rateLimit, validateAttendancePayload, async (req, res) => {
  try {
    const record = await insertAttendance(req.cleanData);
    
    // Privacy note: DO NOT LOG student name, roll, or PRN to stdout/stderr!
    console.log(`[ATTENDANCE] Record #${record.id} inserted for ${req.cleanData.division} [${req.cleanData.date}]`);

    return res.status(201).json({
      ok: true,
      message: 'Attendance recorded successfully.',
      id: record.id
    });
  } catch (err) {
    // Detect UNIQUE constraint violation on (prn, unit, session, date)
    // 23505 is PostgreSQL unique_violation, 'unique' / 'constraint' is SQLite
    const errMsg = (err.message || '').toLowerCase();
    const isUnique = err.code === '23505' || errMsg.includes('unique') || errMsg.includes('constraint');
    if (isUnique) {
      return res.status(409).json({
        ok: false,
        error: 'Attendance already recorded'
      });
    }

    console.error('[ATTENDANCE ERROR] Database insertion failed:', err.message);
    return res.status(500).json({
      ok: false,
      error: 'An internal error occurred while saving attendance. Please inform your faculty.'
    });
  }
});

/**
 * Admin: List Attendance Records (GET /api/attendance)
 * Protected by requireAdmin (session role 'admin' or legacy x-admin-key header).
 */
router.get('/attendance', requireAdmin, async (req, res) => {
  try {
    const records = await getAllAttendance();
    res.json({
      ok: true,
      count: records.length,
      records
    });
  } catch (err) {
    console.error('[ATTENDANCE LIST ERROR]:', err.message);
    res.status(500).json({
      ok: false,
      error: 'Failed to retrieve attendance roster.'
    });
  }
});

/**
 * Admin: Export CSV (GET /api/attendance/export.csv)
 * Protected strictly by requireAdmin HEADER ONLY (no query parameter).
 */
router.get('/attendance/export.csv', requireAdmin, async (req, res) => {
  try {
    const records = await getAllAttendance();
    
    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const header = ['ID', 'Date', 'Session', 'Unit', 'Division', 'Roll No', 'PRN', 'Student Name', 'Recorded At'];
    const lines = [header.join(',')];

    for (const r of records) {
      lines.push([
        escapeCsv(r.id),
        escapeCsv(r.date),
        escapeCsv(r.session),
        escapeCsv(r.unit),
        escapeCsv(r.division),
        escapeCsv(r.rollNo || r.roll_no),
        escapeCsv(r.prn),
        escapeCsv(r.name),
        escapeCsv(r.created_at)
      ].join(','));
    }

    const csvContent = '\uFEFF' + lines.join('\r\n'); // Include UTF-8 BOM for Excel compatibility
    const today = new Date().toISOString().split('T')[0];

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="attendance-export-${today}.csv"`);
    res.send(csvContent);
  } catch (err) {
    console.error('[CSV EXPORT ERROR]:', err.message);
    res.status(500).json({
      ok: false,
      error: 'Failed to generate attendance CSV export.'
    });
  }
});

/**
 * Admin: Get Active Session Code (GET /api/attendance/session-code)
 * Protected by requireAdmin.
 */
router.get('/attendance/session-code', requireAdmin, async (req, res) => {
  try {
    const dbCode = await getSetting('session_code', '');
    const activeCode = (dbCode || process.env.SESSION_CODE || '').trim();
    res.json({
      ok: true,
      sessionCode: activeCode,
      isRequired: activeCode.length > 0
    });
  } catch (err) {
    console.error('[SESSION CODE GET ERROR]:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to retrieve session code.' });
  }
});

/**
 * Admin: Set/Update Session Code (POST /api/attendance/session-code)
 * Protected by requireAdmin.
 */
router.post('/attendance/session-code', requireAdmin, async (req, res) => {
  try {
    const newCode = typeof req.body.sessionCode === 'string' ? req.body.sessionCode.trim() : '';
    await setSetting('session_code', newCode);
    res.json({
      ok: true,
      message: newCode ? 'Session code updated successfully.' : 'Session code disabled.',
      sessionCode: newCode,
      isRequired: newCode.length > 0
    });
  } catch (err) {
    console.error('[SESSION CODE SET ERROR]:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to update session code.' });
  }
});

module.exports = router;
