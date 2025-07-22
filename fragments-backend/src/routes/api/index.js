//src/routes/api/index.js
const express = require('express');
const router = express.Router();
const { version, author } = require('../../../package.json');
const { hostname } = require('os');
const { createSuccessResponse } = require('../../response');

// ✅ Health check route: GET /v1/health
router.get('/health', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.status(200).json(
    createSuccessResponse({
      status: 'ok',
      author,
      githubUrl: 'https://github.com/kdewasi/fragments',
      version,
      hostname: hostname(),
    })
  );
});

// ✅ Mount all /v1/fragments routes
router.use('/fragments', require('./fragments'));

module.exports = router;
