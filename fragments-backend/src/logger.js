// src/logger.js
'use strict';

const pino = require('pino');
const config = require('./config');

const options = {
  level: config.logLevel,
  // Never write credentials or tokens to the logs, even at debug level.
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'token',
      '*.password',
      '*.token',
    ],
    censor: '[REDACTED]',
  },
};

if (config.logPretty) {
  options.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  };
}

module.exports = pino(options);
