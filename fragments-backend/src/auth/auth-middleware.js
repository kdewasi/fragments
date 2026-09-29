// src/auth/auth-middleware.js
'use strict';

const passport = require('passport');

const { createErrorResponse } = require('../response');
const { HttpError } = require('../errors');
const hash = require('../hash');
const logger = require('../logger');

/**
 * Build an Express middleware that authenticates with the given Passport
 * strategy and attaches the hashed user id to `req.user`.
 * @param {'bearer' | 'http'} strategyName
 */
module.exports = (strategyName) =>
  function authenticateRequest(req, res, next) {
    function callback(err, email) {
      if (err) {
        logger.warn({ err }, 'Error authenticating user');
        return next(new HttpError(500, 'Unable to authenticate user', { cause: err }));
      }

      if (!email) {
        return res.status(401).json(createErrorResponse(401, 'Unauthorized'));
      }

      // Only a hash of the email is ever stored or logged.
      req.user = hash(email);
      logger.debug({ user: req.user }, 'Authenticated user');
      return next();
    }

    passport.authenticate(strategyName, { session: false }, callback)(req, res, next);
  };
