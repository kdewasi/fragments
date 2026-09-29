// src/routes/index.js
// All routes mounted under /v1 (authentication is applied in app.js).
'use strict';

const express = require('express');

const router = express.Router();

router.use('/fragments', require('./fragments'));

module.exports = router;
