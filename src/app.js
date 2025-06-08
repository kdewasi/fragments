const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const passport = require('passport');
const { authenticate, strategy } = require('./auth');

const { version } = require('../package.json');
const logger = require('./logger');
const pino = require('pino-http')({ logger });

const app = express();

// ✅ CORS must be early and properly configured
app.use(cors({
  origin: 'http://localhost:1234',
  methods: 'GET,POST,PUT,DELETE,OPTIONS',
  allowedHeaders: 'Content-Type, Authorization',
  credentials: true,
}));

// ✅ Apply helmet with custom CSP config
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", "http://localhost:8080"],
      },
    },
  })
);

// ✅ Other middleware
app.use(compression());
app.use(pino);

// ✅ Initialize Passport + strategy
passport.use(strategy());
app.use(passport.initialize());

// ✅ Mount routes — secure ones first
app.use('/v1', authenticate(), require('./routes/api'));

// ✅ Public health check route
app.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.status(200).json({
    status: 'ok',
    author: 'Kishan Dewasi',
    githubUrl: 'https://github.com/kdewasi/fragments',
    version,
  });
});

// 404 Not Found handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    error: {
      message: 'not found',
      code: 404,
    },
  });
});

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'unable to process request';

  if (status > 499) {
    logger.error({ err }, `Error processing request`);
  }

  res.status(status).json({
    status: 'error',
    error: {
      message,
      code: status,
    },
  });
});

module.exports = app;
