//src/routes/index.js
const express = require('express');
const router = express.Router();

// ✅ Mount all /v1 routes from routes/api/index.js
router.use('/', require('./api'));

module.exports = router;
