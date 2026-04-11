require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const passport = require('passport');
const { strategy, authenticate } = require('./auth');
const { version, author } = require('../package.json');
const pinoHttp = require('pino-http');
const logger = require('./logger');
const { createErrorResponse } = require('./response');

const app = express();

// Register authentication strategy
passport.use(strategy());

// CORS — must come before authentication to handle OPTIONS preflight
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: false,
    optionsSuccessStatus: 200,
    preflightContinue: false,
  })
);

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
  })
);

// Response compression
app.use(compression());

// Structured HTTP request logging
app.use(
  pinoHttp({
    logger,
    genReqId: () => `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  })
);

// Passport initialization
app.use(passport.initialize());

// Authenticated API routes
app.use('/v1', authenticate(), require('./routes'));

// Health check endpoint (unauthenticated, for load balancers)
app.get('/health', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Root metadata endpoint (unauthenticated)
app.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.status(200).json({
    status: 'ok',
    author,
    githubUrl: 'https://github.com/kdewasi/fragments',
    version,
  });
});

// 404 handler — no matching route found
app.use((req, res) => {
  res.status(404).json(createErrorResponse(404, `Resource not found: ${req.method} ${req.originalUrl}`));
});

// ────────────────────────────────────────────────────────────────────────────
// Central error-handling middleware (4-arg signature required by Express)
// All route handlers that call next(err) will be caught here.
// This ensures a single, consistent error response shape for all failures.
// ────────────────────────────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  const status = err.status || err.statusCode || 500;

  // Log with full context for debugging, but never leak stack traces to clients
  logger.error(
    {
      err,
      method: req.method,
      url: req.originalUrl,
      status,
    },
    `Unhandled error: ${err.message}`
  );

  res.status(status).json(
    createErrorResponse(status, process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message)
  );
});

module.exports = app;

