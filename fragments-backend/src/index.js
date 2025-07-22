//src/index.js
require('dotenv').config(); // ✅ Load .env before anything else

const app = require('./app');
const logger = require('./logger');

const PORT = process.env.PORT || 8080;

// ✅ Start the server
app.listen(PORT, () => {
  logger.info(`🚀 Server started on http://localhost:${PORT}`);
});

// ✅ Global error handlers (recommended for stability)
process.on('uncaughtException', (err, origin) => {
  logger.fatal({ err, origin }, '❌ Uncaught Exception');
  throw err;
});

process.on('unhandledRejection', (reason, promise) => {
  logger.fatal({ reason, promise }, '❌ Unhandled Rejection');
  throw reason;
});
