// src/model/data/index.js
// Storage backend selection (see config.storage):
//   aws    - S3 + DynamoDB (production on ECS)
//   blob   - Vercel Blob (the Vercel demo deployment)
//   memory - in-process (development and unit tests)
'use strict';

const config = require('../../config');

const backends = {
  aws: () => require('./aws'),
  blob: () => require('./blob'),
  memory: () => require('./memory'),
};

module.exports = backends[config.storage]();
