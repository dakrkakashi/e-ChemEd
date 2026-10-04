/**
 * validation.js — Attendance Input Validation & Session Code Enforcement
 * 
 * Strict sanitization, length checks, and configurable academic constraints.
 */

const fs = require('fs');
const path = require('path');
const { getSetting } = require('../db');

// Load editable academic options
const CONFIG_PATH = path.resolve(__dirname, '..', 'config', 'academic-config.json');

function getAcademicConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return {
      divisions: ['A (Computer)', 'B (IT)', 'C (E&TC)', 'D (Mechanical)', 'E (Civil)', 'F (Electrical)'],
      sessions: ['Lecture', 'Lab Practical', 'Tutorial'],
      units: [
        'Unit 1: Water Processing and Environmental Sustainability',
        'Unit 2: Electrochemical Energy Storage Systems',
        'Unit 3: Flexible Electronics & Optoelectronic Materials',
        'Unit 4: Nanomaterials, Electrochemistry & Thermal Analysis',
        'Unit 5: Energy Generation & Sustainable Fuels'
      ]
    };
  }
}

async function validateAttendancePayload(req, res, next) {
  try {
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({
        ok: false,
        error: 'Invalid request: JSON object payload expected.'
      });
    }

    // 1. Session Code Verification (if enabled)
    // Active code checked in database first (dynamic admin override), falling back to env var
    const dbSessionCode = await getSetting('session_code', '');
    const activeSessionCode = (dbSessionCode || process.env.SESSION_CODE || '').trim();

    if (activeSessionCode) {
      const providedCode = (body.sessionCode || req.headers['x-session-code'] || '').trim();
      if (!providedCode) {
        return res.status(400).json({
          ok: false,
          error: "Session code required. Please enter today's session code provided by your faculty."
        });
      }
      if (providedCode.toLowerCase() !== activeSessionCode.toLowerCase()) {
        return res.status(400).json({
          ok: false,
          error: "Invalid session code. Please verify the code with your faculty coordinator."
        });
      }
    }

    // 2. Field Extractions and Trimming
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const prn = typeof body.prn === 'string' ? body.prn.trim() : '';
    const rollNo = typeof (body.rollNo || body.roll) === 'string' 
      ? (body.rollNo || body.roll).trim() 
      : (typeof (body.rollNo || body.roll) === 'number' ? String(body.rollNo || body.roll) : '');
    const division = typeof body.division === 'string' ? body.division.trim() : '';
    const unit = typeof body.unit === 'string' ? body.unit.trim() : '';
    const session = typeof body.session === 'string' && body.session.trim() ? body.session.trim() : 'Lecture';
    const date = typeof body.date === 'string' ? body.date.trim() : '';

    // 3. Validation Rules
    const academic = getAcademicConfig();

    // Name: 2 - 100 characters, letters, spaces, common punctuation
    if (!name || name.length < 2 || name.length > 100) {
      return res.status(400).json({
        ok: false,
        error: 'Validation failed: Full Name must be between 2 and 100 characters.'
      });
    }

    // PRN: 5 - 20 alphanumeric characters
    const prnRegex = /^[A-Za-z0-9]{5,20}$/;
    if (!prn || !prnRegex.test(prn)) {
      return res.status(400).json({
        ok: false,
        error: 'Validation failed: Permanent Registration Number (PRN) must be 5 to 20 letters/digits.'
      });
    }

    // Roll Number: 1 - 20 alphanumeric characters
    const rollRegex = /^[A-Za-z0-9]{1,20}$/;
    if (!rollNo || !rollRegex.test(rollNo)) {
      return res.status(400).json({
        ok: false,
        error: 'Validation failed: Roll Number must be 1 to 20 letters/digits.'
      });
    }

    // Academic Division: must be in configured divisions
    if (!division || !academic.divisions.includes(division)) {
      return res.status(400).json({
        ok: false,
        error: `Validation failed: Invalid division. Must be one of: ${academic.divisions.join(', ')}.`
      });
    }

    // Unit: must be in configured units
    if (!unit || !academic.units.includes(unit)) {
      return res.status(400).json({
        ok: false,
        error: 'Validation failed: Attending syllabus unit must be selected from the valid curriculum units.'
      });
    }

    // Session Type: must be in configured sessions
    if (!session || !academic.sessions.includes(session)) {
      return res.status(400).json({
        ok: false,
        error: `Validation failed: Invalid session type. Must be one of: ${academic.sessions.join(', ')}.`
      });
    }

    // Date: YYYY-MM-DD format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!date || !dateRegex.test(date) || isNaN(Date.parse(date))) {
      return res.status(400).json({
        ok: false,
        error: 'Validation failed: Date must be in YYYY-MM-DD format.'
      });
    }

    // Attach sanitized, trimmed values to req.cleanData
    req.cleanData = {
      name,
      prn: prn.toUpperCase(),
      rollNo: rollNo.toUpperCase(),
      division,
      unit,
      session,
      date
    };

    next();
  } catch (err) {
    console.error('[VALIDATION ERROR]:', err.message);
    return res.status(500).json({
      ok: false,
      error: 'An internal error occurred during request validation.'
    });
  }
}

module.exports = {
  validateAttendancePayload,
  getAcademicConfig
};

