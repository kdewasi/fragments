// src/model/data/aws/ddbDocClient.js
'use strict';

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

const config = require('../../../config');
const logger = require('../../../logger');

const getCredentials = () => {
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    logger.debug('Using AWS credentials from the environment for DynamoDB');
    return {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      sessionToken: process.env.AWS_SESSION_TOKEN,
    };
  }
  return undefined;
};

if (config.aws.dynamoEndpoint) {
  logger.info({ endpoint: config.aws.dynamoEndpoint }, 'Using alternate DynamoDB endpoint');
}

const ddbClient = new DynamoDBClient({
  region: config.aws.region,
  endpoint: config.aws.dynamoEndpoint || undefined,
  credentials: getCredentials(),
});

// The document client converts between JavaScript values and DynamoDB attributes.
module.exports = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: {
    convertEmptyValues: false,
    removeUndefinedValues: true,
    // Fragment instances are class instances; store them as plain maps
    convertClassInstanceToMap: true,
  },
  unmarshallOptions: { wrapNumbers: false },
});
