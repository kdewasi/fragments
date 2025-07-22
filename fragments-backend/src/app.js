require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const passport = require('passport');
const { strategy, authenticate } = require('./auth'); // ✅ CORRECT DESTRUCTURING
const { version, author } = require('../package.json');
const pinoHttp = require('pino-http');
const logger = require('./logger');

const app = express();

console.log('✅ Import successful: authenticate and strategy loaded from auth');

// ✅ Register bearer strategy
passport.use('bearer', strategy()); // ✅ Use as object, not function
console.log('✅ Passport bearer strategy registered');

// ✅ Middleware
app.use(
  cors({
    origin: 'http://localhost:1234',
    methods: 'GET,POST,PUT,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization',
    credentials: true,
  })
);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", 'http://localhost:8080'],
      },
    },
  })
);
app.use(compression());

app.use(
  pinoHttp({
    logger,
    genReqId: () => `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  })
);

app.use(passport.initialize());
app.use('/v1', authenticate(), require('./routes'));

app.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.status(200).json({
    status: 'ok',
    author,
    githubUrl: 'https://github.com/kdewasi/fragments',
    version,
  });
});

app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    error: { message: 'not found', code: 404 },
  });
});

app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'unable to process request';

  if (status >= 500) logger.error({ err }, 'Unhandled error');

  res.status(status).json({
    status: 'error',
    error: { message, code: status },
  });
});

module.exports = app;
