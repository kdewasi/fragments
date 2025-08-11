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
// ✅ Register HTTP Basic Auth strategy
passport.use(strategy()); // ✅ No strategy name required
console.log('✅ Passport basic strategy registered');

// ✅ Simplified CORS configuration - most permissive for testing
app.use(
  cors({
    origin: '*', // Allow ALL origins
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['*'], // Allow ALL headers
    credentials: false, // Disable credentials for wildcard origin
    optionsSuccessStatus: 200,
    preflightContinue: false,
  })
);

// Add debugging middleware to see what's happening with requests
app.use((req, res, next) => {
  logger.info({
    method: req.method,
    url: req.url,
    headers: req.headers,
    userAgent: req.get('User-Agent'),
    origin: req.get('Origin')
  }, 'Incoming request debug info');
  next();
});

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", '*'], // Allow all connections for development
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

module.exports = app;
