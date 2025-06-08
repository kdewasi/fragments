const express = require('express');
const router = express.Router();

// Define GET /v1/fragments route
router.get('/fragments', require('./get'));

module.exports = router;
