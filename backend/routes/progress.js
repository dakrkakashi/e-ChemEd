/**
 * progress.js — User Learning Progress Routes
 * 
 * Provides:
 * - GET  /api/progress: Returns all unit progress for current authenticated user
 * - POST /api/progress: Marks activity for a unit, persists to database, returns updated progress
 */

const express = require('express');
const router = express.Router();
const { getUserProgress, markUserActivity } = require('../db');
const { requireAuth } = require('../middleware/auth');

const VALID_ACTIVITIES = [
  'mindMapRead',
  'videoWatched',
  'questionBankViewed',
  'quizCompleted',
  'gamePlayed'
];

/**
 * GET /api/progress
 */
router.get('/progress', requireAuth, async (req, res) => {
  try {
    const progress = await getUserProgress(req.user.id);
    return res.status(200).json({
      ok: true,
      progress
    });
  } catch (err) {
    console.error('[PROGRESS GET ERROR]:', err.message);
    return res.status(500).json({
      ok: false,
      error: 'Failed to retrieve progress data.'
    });
  }
});

/**
 * POST /api/progress
 * Body: { unitId: 1..5, activityKey: 'mindMapRead'|... }
 */
router.post('/progress', requireAuth, async (req, res) => {
  try {
    const { unitId, activityKey } = req.body || {};

    const unitNum = parseInt(unitId, 10);
    if (isNaN(unitNum) || unitNum < 1 || unitNum > 5) {
      return res.status(400).json({
        ok: false,
        error: 'Invalid unitId. Must be between 1 and 5.'
      });
    }

    if (!activityKey || typeof activityKey !== 'string' || !VALID_ACTIVITIES.includes(activityKey)) {
      return res.status(400).json({
        ok: false,
        error: `Invalid activityKey. Must be one of: ${VALID_ACTIVITIES.join(', ')}`
      });
    }

    const updatedProgress = await markUserActivity(req.user.id, unitNum, activityKey);

    return res.status(200).json({
      ok: true,
      message: 'Progress recorded.',
      progress: updatedProgress
    });
  } catch (err) {
    console.error('[PROGRESS POST ERROR]:', err.message);
    return res.status(500).json({
      ok: false,
      error: 'Failed to save progress.'
    });
  }
});

module.exports = router;
