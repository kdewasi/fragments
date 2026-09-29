// src/auth/index.js
// Picks the authentication strategy from the environment:
//   - AWS_COGNITO_POOL_ID + AWS_COGNITO_CLIENT_ID  -> Cognito (required in production)
//   - HTPASSWD_FILE                                -> HTTP Basic Auth (development / CI only)
//   - nothing, outside production                  -> the bundled tests/.htpasswd
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const config = require('../config');
const logger = require('../logger');

const { cognitoPoolId, cognitoClientId, htpasswdFile } = config.auth;
const cognitoConfigured = Boolean(cognitoPoolId && cognitoClientId);

// Relative HTPASSWD_FILE paths are resolved against this package, not the
// process working directory, so they work in Docker (/app), in a monorepo
// checkout and in serverless bundles that keep the fragments-backend/ prefix.
const PACKAGE_ROOT = path.resolve(__dirname, '..', '..');
function resolveHtpasswd(file) {
  return path.isAbsolute(file) ? file : path.resolve(PACKAGE_ROOT, file);
}

if (cognitoConfigured && htpasswdFile) {
  throw new Error(
    'env contains configuration for both AWS Cognito and HTTP Basic Auth. Only one is allowed.'
  );
}

if (cognitoConfigured) {
  module.exports = require('./cognito')({ userPoolId: cognitoPoolId, clientId: cognitoClientId });
} else if (htpasswdFile) {
  if (config.isProduction) {
    throw new Error(
      'HTTP Basic Auth (HTPASSWD_FILE) is not allowed when NODE_ENV=production. ' +
        'Set AWS_COGNITO_POOL_ID and AWS_COGNITO_CLIENT_ID instead.'
    );
  }
  module.exports = require('./basic-auth')(resolveHtpasswd(htpasswdFile));
} else if (!config.isProduction) {
  const fallback = path.join(PACKAGE_ROOT, 'tests', '.htpasswd');
  if (!fs.existsSync(fallback)) {
    throw new Error(
      'No authentication configured: set HTPASSWD_FILE or the AWS_COGNITO_* variables'
    );
  }
  logger.warn(
    { file: fallback },
    'No auth configured; using the test .htpasswd (development only)'
  );
  module.exports = require('./basic-auth')(fallback);
} else {
  throw new Error(
    'No authentication configured. Production requires AWS_COGNITO_POOL_ID and AWS_COGNITO_CLIENT_ID.'
  );
}
