// src/app.js
'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const passport = require('passport');
const pinoHttp = require('pino-http');
const { rateLimit } = require('express-rate-limit');
const { randomUUID } = require('node:crypto');
const { STATUS_CODES } = require('node:http');

const config = require('./config');
const logger = require('./logger');
const { strategy, authenticate } = require('./auth');
const { createSuccessResponse, createErrorResponse } = require('./response');
const { version, author } = require('../package.json');

const app = express();

app.set('trust proxy', config.trustProxy);
app.disable('x-powered-by');

passport.use(strategy());

// Security headers. CORP is relaxed so the UI can embed fragment images cross-origin.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// CORS: restrict to CORS_ORIGINS when configured, which it should be in production.
const corsOptions = {
  origin: config.corsOrigins.length > 0 ? config.corsOrigins : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  exposedHeaders: ['Location', 'Content-Type', 'Content-Length', 'X-Request-Id'],
  maxAge: 600,
};
if (config.isProduction && corsOptions.origin === '*') {
  logger.warn('CORS_ORIGINS is not set; any origin may call this API');
}
app.use(cors(corsOptions));

app.use(compression());

// Structured request logging with a request id that is echoed back to clients.
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;
app.use(
  pinoHttp({
    logger,
    genReqId: (req, res) => {
      const incoming = req.headers['x-request-id'];
      const id =
        typeof incoming === 'string' && REQUEST_ID_PATTERN.test(incoming) ? incoming : randomUUID();
      res.setHeader('X-Request-Id', id);
      return id;
    },
    autoLogging: { ignore: (req) => req.url === '/health' },
    // Compact request/response logs (no header dumps); the request id ties them together
    serializers: {
      req: (req) => ({
        id: req.id,
        method: req.method,
        url: req.url,
        remoteAddress: req.remoteAddress,
      }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
    customLogLevel: (req, res, err) => {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
  })
);

// Basic abuse protection. Tune with RATE_LIMIT_WINDOW_MS / RATE_LIMIT_MAX.
app.use(
  rateLimit({
    windowMs: config.rateLimit.windowMs,
    limit: config.rateLimit.limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: (req) => req.path === '/health',
    handler: (req, res) => {
      res.status(429).json(createErrorResponse(429, 'Too many requests, please try again later'));
    },
  })
);

// Unauthenticated endpoints for load balancers and humans
app.get('/health', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res
    .status(200)
    .json(createSuccessResponse({ uptime: process.uptime(), timestamp: new Date().toISOString() }));
});

app.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res
    .status(200)
    .json(
      createSuccessResponse({ author, githubUrl: 'https://github.com/kdewasi/fragments', version })
    );
});

// Everything under /v1 requires authentication
app.use(passport.initialize());
app.use('/v1', authenticate(), require('./routes'));

// 404 for anything else
app.use((req, res) => {
  res.status(404).json(createErrorResponse(404, 'not found'));
});

// Central error handler. Client errors keep their message; server errors are
// logged in full but reported to the client as a generic message.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = Number(err.status || err.statusCode) || 500;
  const isClientError = status >= 400 && status < 500;
  const message = isClientError
    ? err.message || STATUS_CODES[status] || 'Bad Request'
    : 'Internal Server Error';

  if (isClientError) {
    logger.warn({ reqId: req.id, status, err: err.message }, 'Request failed');
  } else {
    logger.error({ reqId: req.id, status, err }, 'Unhandled error');
  }

  res.status(status).json(createErrorResponse(status, message));
});

module.exports = app;
