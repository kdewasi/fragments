const express = require('express');
const router = express.Router();
const { authenticate } = require('../auth');

router.use('/v1', authenticate(), require('./api'));

module.exports = router;
