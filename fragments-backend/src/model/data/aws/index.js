// src/model/data/aws/index.js
// Fragment metadata lives in DynamoDB (ownerId + id), fragment data in S3 (ownerId/id).
'use strict';

const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { PutCommand, GetCommand, QueryCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const s3Client = require('./s3Client');
const ddbDocClient = require('./ddbDocClient');
const config = require('../../../config');
const logger = require('../../../logger');

const TableName = config.aws.dynamoTable;
const Bucket = config.aws.s3Bucket;
const objectKey = (ownerId, id) => `${ownerId}/${id}`;

async function writeFragment(fragment) {
  const params = { TableName, Item: fragment.toJSON ? fragment.toJSON() : fragment };
  try {
    await ddbDocClient.send(new PutCommand(params));
  } catch (err) {
    logger.error({ err, TableName, id: fragment.id }, 'Error writing fragment to DynamoDB');
    throw new Error('unable to write fragment metadata', { cause: err });
  }
}

async function readFragment(ownerId, id) {
  const params = { TableName, Key: { ownerId, id } };
  try {
    const data = await ddbDocClient.send(new GetCommand(params));
    return data?.Item;
  } catch (err) {
    logger.error({ err, TableName, id }, 'Error reading fragment from DynamoDB');
    throw new Error('unable to read fragment metadata', { cause: err });
  }
}

async function writeFragmentData(ownerId, id, data) {
  const params = { Bucket, Key: objectKey(ownerId, id), Body: data };
  try {
    await s3Client.send(new PutObjectCommand(params));
  } catch (err) {
    logger.error({ err, Bucket, Key: params.Key }, 'Error uploading fragment data to S3');
    throw new Error('unable to upload fragment data', { cause: err });
  }
}

async function readFragmentData(ownerId, id) {
  const params = { Bucket, Key: objectKey(ownerId, id) };
  try {
    const data = await s3Client.send(new GetObjectCommand(params));
    return Buffer.from(await data.Body.transformToByteArray());
  } catch (err) {
    logger.error({ err, Bucket, Key: params.Key }, 'Error reading fragment data from S3');
    throw new Error('unable to read fragment data', { cause: err });
  }
}

// Returns ids only, or full metadata objects when `expand` is true. Follows
// DynamoDB pagination so users with many fragments get a complete list.
async function listFragments(ownerId, expand = false) {
  const params = {
    TableName,
    KeyConditionExpression: 'ownerId = :ownerId',
    ExpressionAttributeValues: { ':ownerId': ownerId },
  };
  if (!expand) params.ProjectionExpression = 'id';

  const items = [];
  try {
    let ExclusiveStartKey;
    do {
      const data = await ddbDocClient.send(new QueryCommand({ ...params, ExclusiveStartKey }));
      items.push(...(data?.Items || []));
      ExclusiveStartKey = data?.LastEvaluatedKey;
    } while (ExclusiveStartKey);
  } catch (err) {
    logger.error({ err, TableName }, 'Error listing fragments from DynamoDB');
    throw new Error('unable to list fragments', { cause: err });
  }

  return expand ? items : items.map((item) => item.id);
}

async function deleteFragment(ownerId, id) {
  try {
    await Promise.all([
      ddbDocClient.send(new DeleteCommand({ TableName, Key: { ownerId, id } })),
      s3Client.send(new DeleteObjectCommand({ Bucket, Key: objectKey(ownerId, id) })),
    ]);
  } catch (err) {
    logger.error({ err, id }, 'Error deleting fragment');
    throw new Error('unable to delete fragment', { cause: err });
  }
}

module.exports = {
  listFragments,
  writeFragment,
  readFragment,
  writeFragmentData,
  readFragmentData,
  deleteFragment,
};
