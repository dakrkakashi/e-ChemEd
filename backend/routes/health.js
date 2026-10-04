/**
 * health.js — Health Probe Endpoint
 */

const express = require('express');
const router = express.Router();
const { dbEngine } = require('../db');

router.get('/health', (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    ok: true,
    time: new Date().toISOString(),
    service: 'e-chemEd API',
    version: '1.0.0',
    dbEngine,
    uptimeSec: Math.round(process.uptime()),
    memoryMB: {
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024 * 100) / 100,
      rss: Math.round(mem.rss / 1024 / 1024 * 100) / 100
    }
  });
});

module.exports = router;
