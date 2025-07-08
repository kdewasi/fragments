const express = require('express');
const router = express.Router();
const { Fragment } = require('../../model/fragment');
const { version, author, githubUrl } = require('../../../package.json');

// /v1/health route
router.get('/health', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.status(200).json({
    status: 'ok',
    author,
    githubUrl,
    version,
  });
});

// Middleware for raw body parsing for supported types
const rawBody = () =>
  express.raw({
    inflate: true,
    limit: '5mb',
    type: (req) => {
      try {
        const { type } = require('content-type').parse(req);
        return Fragment.isSupportedType(type);
      } catch {
        return false;
      }
    },
  });

// GET /v1/fragments
router.get('/fragments', require('./get'));

// POST /v1/fragments (new route)
router.post('/fragments', rawBody(), require('./post'));

module.exports = router;
