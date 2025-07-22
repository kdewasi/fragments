//src/routes/api/fragments/index.js
const express = require('express');
const router = express.Router();
const contentType = require('content-type');
const { Fragment } = require('../../../model/fragment');

// Middleware to parse raw body for supported fragment types
const rawBody = () =>
  express.raw({
    inflate: true,
    limit: '5mb',
    type: (req) => {
      try {
        const { type } = contentType.parse(req);
        return Fragment.isSupportedType(type);
      } catch {
        return false;
      }
    },
  });

// Import route handlers
const get = require('../get');
const post = require('./post');
const getById = require('../get-id');
const getByExtension = require('../get-ext');
const getInfo = require('../get-info');

// ✅ Register routes (order matters)
router.get('/:id/info', getInfo);
router.get('/:id.:ext', getByExtension);
router.get('/:id', getById);
router.get('/', get);
router.post('/', rawBody(), post);

module.exports = router;
