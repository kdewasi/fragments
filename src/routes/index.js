const express = require('express');
const { version, author } = require('../../package.json');

const router = express.Router();

// Secure all /v1 routes
router.use('/v1', require('./api'));

// Health check route
router.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.status(200).json({
    status: 'ok',
    author,
    githubUrl: 'https://github.com/kdewasi/fragments',
    version,
  });
});

module.exports = router;
