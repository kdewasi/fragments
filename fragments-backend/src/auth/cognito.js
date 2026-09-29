// src/auth/cognito.js
// Bearer-token authentication using Amazon Cognito ID tokens. The JWT is verified
// against the user pool's JWKS (downloaded and cached at startup).
'use strict';

const BearerStrategy = require('passport-http-bearer').Strategy;
const { CognitoJwtVerifier } = require('aws-jwt-verify');

const logger = require('../logger');
const authorize = require('./auth-middleware');

module.exports = function createCognitoAuth({ userPoolId, clientId }) {
  if (!(userPoolId && clientId)) {
    throw new Error('missing expected env vars: AWS_COGNITO_POOL_ID, AWS_COGNITO_CLIENT_ID');
  }

  logger.info({ userPoolId }, 'Using AWS Cognito for auth');

  const verifier = CognitoJwtVerifier.create({
    userPoolId,
    clientId,
    // We expect an ID token (it carries the email claim), not an access token.
    tokenUse: 'id',
  });

  // Warm the JWKS cache so the first request does not pay for the download.
  verifier
    .hydrate()
    .then(() => logger.info('Cognito JWKS cached'))
    .catch((err) => logger.error({ err }, 'Unable to cache Cognito JWKS'));

  return {
    strategy: () =>
      new BearerStrategy(async (token, done) => {
        try {
          const payload = await verifier.verify(token);
          if (!payload.email) {
            logger.warn('Rejected token without an email claim');
            return done(null, false);
          }
          return done(null, payload.email);
        } catch (err) {
          // Log the reason, never the token itself.
          logger.warn({ reason: err.message }, 'Rejected bearer token');
          return done(null, false);
        }
      }),
    authenticate: () => authorize('bearer'),
  };
};
