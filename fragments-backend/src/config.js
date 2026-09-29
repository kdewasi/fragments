// src/config.js
// The only place where environment variables are read. Everything else imports
// this module so that configuration is validated once and easy to reason about.
'use strict';

const parseBoolean = (value, fallback) => {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const parseList = (value) =>
  (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

// Express' "trust proxy" setting accepts a boolean, a hop count or a list of
// addresses/subnets. Behind an AWS ALB the right value is `1` (one hop).
const parseTrustProxy = (value) => {
  if (value === undefined || value === '') return false;
  if (/^\d+$/.test(value)) return Number(value);
  if (['true', 'false'].includes(value.toLowerCase())) return value.toLowerCase() === 'true';
  return value;
};

const env = process.env;
const nodeEnv = env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';
const isTest = nodeEnv === 'test';

// Storage backend: explicit FRAGMENTS_STORAGE, else inferred from the environment
const STORAGE_BACKENDS = ['memory', 'aws', 'blob'];
const resolveStorage = () => {
  const explicit = env.FRAGMENTS_STORAGE;
  if (explicit) {
    if (!STORAGE_BACKENDS.includes(explicit)) {
      throw new Error(`FRAGMENTS_STORAGE must be one of ${STORAGE_BACKENDS.join(', ')}`);
    }
    return explicit;
  }
  if (env.AWS_REGION) return 'aws';
  if (env.BLOB_READ_WRITE_TOKEN) return 'blob';
  return 'memory';
};

const config = {
  nodeEnv,
  isProduction,
  isTest,

  port: Number(env.PORT) || 8080,

  // Logging
  logLevel: env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  logPretty: parseBoolean(env.LOG_PRETTY, !isProduction && !isTest),

  // Public URL of this API, used to build Location headers (e.g. https://api.example.com)
  apiUrl: env.API_URL || null,

  // Reverse-proxy awareness (needed for correct client IPs behind an ALB)
  trustProxy: parseTrustProxy(env.TRUST_PROXY),

  // Comma-separated list of allowed browser origins. Empty means "any origin".
  corsOrigins: parseList(env.CORS_ORIGINS),

  // Maximum accepted fragment body size (any value accepted by the `bytes` package)
  maxFragmentSize: env.MAX_FRAGMENT_SIZE || '5mb',

  rateLimit: {
    windowMs: Number(env.RATE_LIMIT_WINDOW_MS) || 60_000,
    limit: Number(env.RATE_LIMIT_MAX) || 300,
  },

  auth: {
    // HTTP Basic Auth (development and tests only)
    htpasswdFile: env.HTPASSWD_FILE || null,
    // Amazon Cognito (production)
    cognitoPoolId: env.AWS_COGNITO_POOL_ID || null,
    cognitoClientId: env.AWS_COGNITO_CLIENT_ID || null,
  },

  // 'memory' | 'aws' | 'blob'
  storage: resolveStorage(),

  aws: {
    // Region for the S3 + DynamoDB backend
    region: env.AWS_REGION || null,
    s3Bucket: env.AWS_S3_BUCKET_NAME || 'fragments',
    dynamoTable: env.AWS_DYNAMODB_TABLE_NAME || 'fragments',
    // Alternate endpoints for LocalStack / DynamoDB Local
    s3Endpoint: env.AWS_S3_ENDPOINT_URL || null,
    dynamoEndpoint: env.AWS_DYNAMODB_ENDPOINT_URL || null,
  },
};

module.exports = config;
