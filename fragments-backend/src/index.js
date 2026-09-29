// src/index.js
'use strict';

// Load a local .env file if one exists (never committed, see .env.example)
require('dotenv').config({ quiet: true });

const stoppable = require('stoppable');
const config = require('./config');
const logger = require('./logger');
const app = require('./app');

const server = stoppable(
  app.listen(config.port, () => {
    logger.info({ port: config.port, env: config.nodeEnv }, 'Server started');
  }),
  10_000 // grace period for in-flight requests on shutdown
);

// Keep-alive must outlive the load balancer's idle timeout (60s on an ALB),
// otherwise the ALB can reuse a connection the server just closed -> 502s.
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'Shutdown signal received, closing server');
  server.stop((err) => {
    if (err) {
      logger.error({ err }, 'Error during graceful shutdown');
      process.exit(1);
    }
    logger.info('Server closed');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Log and exit on programmer errors; the container orchestrator restarts us.
process.on('uncaughtException', (err, origin) => {
  logger.fatal({ err, origin }, 'Uncaught exception');
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  logger.fatal({ err: reason }, 'Unhandled promise rejection');
  process.exit(1);
});
