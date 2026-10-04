/**
 * api/index.js — Vercel Serverless Function Entry Point for e-chemEd
 * 
 * Exports the shared Express application handler to serve all /api/* routes
 * on Vercel Serverless Functions.
 */

const path = require('path');
const dotenv = require('dotenv');

// Attempt to load .env if present (e.g. during local vercel dev)
try {
  dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
} catch (e) {}

const app = require('../backend/app');

module.exports = app;
