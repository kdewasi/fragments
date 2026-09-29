// src/auth/basic-auth.js
// HTTP Basic Auth backed by an .htpasswd file (bcrypt, apr1 or sha1 hashes).
// Only for local development and automated tests; production refuses to load it.
'use strict';

const fs = require('node:fs');
const auth = require('http-auth');
const authPassport = require('http-auth-passport');

const logger = require('../logger');
const authorize = require('./auth-middleware');

module.exports = function createBasicAuth(file) {
  if (!file) throw new Error('missing expected env var: HTPASSWD_FILE');
  if (!fs.existsSync(file)) throw new Error(`HTPASSWD_FILE not found: ${file}`);

  logger.info({ file }, 'Using HTTP Basic Auth');

  return {
    strategy: () => authPassport(auth.basic({ realm: 'Fragments', file })),
    authenticate: () => authorize('http'),
  };
};
