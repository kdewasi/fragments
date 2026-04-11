// src/index.js
require('dotenv').config();

const app = require('./app');
const logger = require('./logger');
const stoppable = require('stoppable');

const PORT = process.env.PORT || 8080;

// Wrap in stoppable for graceful shutdown (10s grace period)
const server = stoppable(
  app.listen(PORT, () => {
    logger.info({ port: PORT }, 'Server started');
  }),
  10000
);

// Graceful shutdown handler
function shutdown(signal) {
  logger.info({ signal }, 'Shutdown signal received, closing server gracefully...');
  server.stop((err) => {
    if (err) {
      logger.error({ err }, 'Error during graceful shutdown');
      process.exit(1);
    }
    logger.info('Server closed gracefully');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Global error handlers — log and crash (let the process manager restart)
process.on('uncaughtException', (err, origin) => {
  logger.fatal({ err, origin }, 'Uncaught Exception — crashing');
  throw err;
});

process.on('unhandledRejection', (reason, promise) => {
  logger.fatal({ reason, promise }, 'Unhandled Rejection — crashing');
  throw reason;
});

