const path = require('path');
const envFile = path.join(__dirname, 'env.jest');
require('dotenv').config({ path: envFile });

console.log(`Using LOG_LEVEL=${process.env.LOG_LEVEL}. Use 'debug' in env.jest for more detail`);

module.exports = {
  verbose: true,
  testTimeout: 5000,
  testMatch: ['<rootDir>/tests/**/*.test.js'], // ✅ This works across environments
  testPathIgnorePatterns: ['/node_modules/', '/fragments-backend/']
};
