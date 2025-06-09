// src/auth/basic-auth.js

const auth = require('http-auth');
const passport = require('passport');
const authPassport = require('http-auth-passport');
const logger = require('../logger');
const fs = require('fs');

if (!process.env.HTPASSWD_FILE) {
  throw new Error('missing expected env var: HTPASSWD_FILE');
}

// Verify the file actually exists
if (!fs.existsSync(process.env.HTPASSWD_FILE)) {
  throw new Error(`HTPASSWD_FILE does not exist: ${process.env.HTPASSWD_FILE}`);
}

// Log the file path being used
console.log('✅ Using .htpasswd file at:', process.env.HTPASSWD_FILE);
logger.info('Using HTTP Basic Auth for auth');

// Create the strategy
let strategy;
try {
  strategy = authPassport(
    auth.basic({
      file: process.env.HTPASSWD_FILE,
    })
  );

  // ✅ Register the strategy with passport
  passport.use(strategy);
} catch (error) {
  console.error('❌ Basic Auth strategy setup failed:', error);
  throw error;
}

module.exports.strategy = () => strategy;

module.exports.authenticate = () =>
  (req, res, next) => {
    passport.authenticate('http', { session: false }, (err, user, info) => {
      if (err) {
        console.error('❌ Passport auth error:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
      }
      if (!user) {
        console.warn('⚠️ No user authenticated');
        return res.status(401).json({ error: 'Unauthorized' });
      }
      req.user = user;
      next();
    })(req, res, next);
  };
