const express = require('express');
const passport = require('passport');
const logger = require('./logger');
const { authenticate } = require('./auth');

const routes = require('./routes');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(passport.initialize());
app.use(authenticate());

app.use((req, res, next) => {
  logger.info(`🧪 req.user = ${JSON.stringify(req.user)}`);
  next();
});

// ✅ Mount top-level routes (they handle /v1 inside)
app.use(routes);

app.use((err, req, res, next) => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ status: 'error', error: err.message });
});

module.exports = app;
