// src/logger.js

const pino = require('pino');

// Default log level is 'info', unless overridden
const level = process.env.LOG_LEVEL || 'info';

const options = {
  level,
};

// Enable pretty output in debug mode
if (level === 'debug') {
  options.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  };
}

// Export the configured logger
const logger = pino(options);

module.exports = logger;
