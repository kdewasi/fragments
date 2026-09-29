// src/routes/fragments/index.js
'use strict';

const express = require('express');

const config = require('../../config');
const { Fragment } = require('../../model/fragment');

const router = express.Router();

// Read the raw body only for supported fragment types; anything else leaves
// req.body undefined so the handler can answer 415.
const rawBody = express.raw({
  inflate: true,
  limit: config.maxFragmentSize,
  type: (req) => Fragment.isSupportedType(req.headers['content-type'] || ''),
});

router.get('/', require('./list'));
router.post('/', rawBody, require('./create'));
router.get('/:id/info', require('./info'));
router.get('/:id.:ext', require('./convert'));
router.get('/:id', require('./get'));
router.put('/:id', rawBody, require('./update'));
router.delete('/:id', require('./remove'));

module.exports = router;
