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

// ✅ CORS MUST come BEFORE authentication to handle OPTIONS preflight
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

// Additional explicit CORS handling for OPTIONS requests - MUST be before auth
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Max-Age', '86400');
  res.status(200).end();
});

// Specific handler for fragments endpoint OPTIONS - bypasses authentication
app.options('/v1/fragments', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  res.header('Access-Control-Max-Age', '86400');
  res.status(200).end();
});

// Add debugging middleware to see what's happening with requests
app.use((req, res, next) => {
  logger.info(
    {
      method: req.method,
      url: req.url,
      headers: req.headers,
      userAgent: req.get('User-Agent'),
      origin: req.get('Origin'),
      protocol: req.protocol,
      httpVersion: req.httpVersion,
      host: req.get('Host'),
      referer: req.get('Referer'),
    },
    'Incoming request debug info'
  );

  // Ensure proper HTTP/1.1 handling
  res.set('X-Protocol', 'HTTP/1.1');
  res.set('X-Request-ID', `${Date.now()}-${Math.random().toString(36).slice(2)}`);

  // Add CORS headers to every response
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD');
  res.header('Access-Control-Allow-Headers', '*');

  next();
});

app.use(
  helmet({
    contentSecurityPolicy: false, // Disable CSP for testing to avoid CORS conflicts
    crossOriginEmbedderPolicy: false, // Disable COEP for testing
    crossOriginResourcePolicy: false, // Disable CORP for testing
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

// ✅ CORS is now handled BEFORE authentication, so OPTIONS requests will work
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
