const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

const envFile = path.resolve(__dirname, 'env.jest');
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile, override: true });
}

console.log(
  `✅ Loaded env: HTPASSWD_FILE=${process.env.HTPASSWD_FILE || 'undefined'} | AWS_COGNITO_POOL_ID=${process.env.AWS_COGNITO_POOL_ID || 'undefined'}`
);

module.exports = {
  verbose: true,
  testTimeout: 5000,
  testMatch: ['**/tests/unit/**/*.test.js'], // ✅ Platform-independent glob
  testPathIgnorePatterns: ['node_modules'], // ✅ Avoid absolute patterns
  modulePathIgnorePatterns: [], // ✅ No false ignores
};
