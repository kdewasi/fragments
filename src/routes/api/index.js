const express = require('express');
const router = express.Router();
const { Fragment } = require('../../model/fragment');

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
