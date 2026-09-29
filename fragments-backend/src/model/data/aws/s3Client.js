// src/model/data/aws/s3Client.js
'use strict';

const { S3Client } = require('@aws-sdk/client-s3');

const config = require('../../../config');
const logger = require('../../../logger');

// Explicit credentials are only needed for LocalStack/MinIO or a laptop. In AWS
// the SDK picks up the ECS task role automatically.
const getCredentials = () => {
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    logger.debug('Using AWS credentials from the environment for S3');
    return {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      sessionToken: process.env.AWS_SESSION_TOKEN,
    };
  }
  return undefined;
};

if (config.aws.s3Endpoint) {
  logger.info({ endpoint: config.aws.s3Endpoint }, 'Using alternate S3 endpoint');
}

module.exports = new S3Client({
  region: config.aws.region,
  credentials: getCredentials(),
  endpoint: config.aws.s3Endpoint || undefined,
  // Path-style keys work with S3, LocalStack and MinIO alike
  forcePathStyle: true,
});
