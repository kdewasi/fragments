const path = require('path');
const envFile = path.join(__dirname, 'env.jest');
require('dotenv').config({ path: envFile });

console.log(`Using LOG_LEVEL=${process.env.LOG_LEVEL}. Use 'debug' in env.jest for more detail`);

module.exports = {
  verbose: true,
  testTimeout: 5000,
  testMatch: ['**/tests/unit/**/*.test.js'], // ✅ this is a relative pattern and works on GitHub too
  testPathIgnorePatterns: ['/node_modules/', '/fragments-backend/']
};
