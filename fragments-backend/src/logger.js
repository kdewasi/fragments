// src/logger.js

// Use `info` as default log level if not specified
const options = { level: process.env.LOG_LEVEL || 'info' };

// Use pretty formatting when in debug mode
if (options.level === 'debug') {
  options.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  };
}

// Create and export a logger instance
module.exports = require('pino')(options);
