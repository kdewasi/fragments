// src/index.js

// Load environment variables from .env file
require('dotenv').config();

const logger = require('./logger');

// Handle uncaught exceptions
process.on('uncaughtException', (err, origin) => {
  logger.fatal({ err, origin }, 'uncaughtException');
  throw err;
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.fatal({ reason, promise }, 'unhandledRejection');
  throw reason;
});

// Start the server
require('./server');
