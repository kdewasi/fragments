// src/auth/basic-auth.js

const auth = require('http-auth');
const authPassport = require('http-auth-passport');
const logger = require('../logger');

// Use our authorize middleware
const authorize = require('./auth-middleware');

if (!process.env.HTPASSWD_FILE) {
  throw new Error('missing expected env var: HTPASSWD_FILE');
}

// Log that we're using Basic Auth
logger.info('Using HTTP Basic Auth for auth');

module.exports.strategy = () =>
  authPassport(
    auth.basic({
      realm: 'Test',
      file: process.env.HTPASSWD_FILE,

      // ⬇️ Custom authorizer with debug logs
      authorizer: (username, password, callback) => {
        console.log(`🧪 AUTHORIZER CALLED`);
        console.log(`➡️  Username: ${username}`);
        console.log(`➡️  Password: ${password}`);

        // Use the default file-based authorizer to actually check credentials
        const defaultAuthorizer = auth.basic({
          file: process.env.HTPASSWD_FILE,
        }).options.authorizer;

        defaultAuthorizer(username, password, (isAuthorized) => {
          console.log(`✅ Authorized: ${isAuthorized}`);
          callback(isAuthorized);
        });
      },
    })
  );

// Delegate auth middleware
module.exports.authenticate = () => authorize('http');
