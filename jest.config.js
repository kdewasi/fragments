const path = require('path');
const envFile = path.join(__dirname, 'env.jest');
require('dotenv').config({ path: envFile });

console.log(`Using LOG_LEVEL=${process.env.LOG_LEVEL}. Use 'debug' in env.jest for more detail`);

module.exports = {
  verbose: true,
  testTimeout: 5000,
  roots: ['<rootDir>/tests'],               // ✅ Tell Jest where to look
  testMatch: ['**/*.test.js'],              // ✅ Look for any *.test.js inside /tests
  testPathIgnorePatterns: ['/node_modules/', '/fragments-backend/'],
};
