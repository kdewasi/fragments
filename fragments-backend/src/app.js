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

// ✅ Middleware
app.use(
  cors({
    origin: ['http://localhost:1234', 'http://localhost:3000', 'http://localhost:8080', '*'], // Explicit origins + wildcard
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
    optionsSuccessStatus: 200, // ✅ Prevents CORS preflight (OPTIONS) errors
    preflightContinue: false,
  })
);

// Add explicit CORS headers to ensure they're not stripped by Load Balancer
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
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
