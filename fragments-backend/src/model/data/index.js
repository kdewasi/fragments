// src/model/data/index.js
// Storage backend selection: AWS (S3 + DynamoDB) when a region is configured,
// otherwise an in-memory store for development and unit tests.
'use strict';

const config = require('../../config');

module.exports = config.aws.region ? require('./aws') : require('./memory');
