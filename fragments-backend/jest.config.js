// jest.config.js
const path = require('node:path');

// Test-only environment (memory storage, Basic Auth with tests/.htpasswd, silent logs)
require('dotenv').config({ path: path.resolve(__dirname, 'env.jest'), override: true, quiet: true });

module.exports = {
  testEnvironment: 'node',
  verbose: true,
  testTimeout: 10000,
  testMatch: ['**/tests/unit/**/*.test.js'],
  collectCoverageFrom: ['src/**/*.js', '!src/index.js'],
  coverageThreshold: {
    global: { statements: 85, branches: 75, functions: 85, lines: 85 },
  },
};
