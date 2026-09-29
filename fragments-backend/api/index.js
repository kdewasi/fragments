// Vercel serverless entry point. vercel.json rewrites every request here and
// the Express app routes it. Storage is Vercel Blob when BLOB_READ_WRITE_TOKEN
// is present (see src/config.js); nothing here is used by the Docker/ECS build.
'use strict';

module.exports = require('../src/app');
