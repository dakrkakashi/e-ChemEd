/**
 * health.js — Health Probe Endpoint
 */

const express = require('express');
const router = express.Router();
const { dbEngine } = require('../db');

router.get('/health', (req, res) => {
  res.json({
    ok: true,
    time: new Date().toISOString(),
    service: 'e-chemEd API',
    version: '1.0.0',
    dbEngine
  });
});

module.exports = router;
