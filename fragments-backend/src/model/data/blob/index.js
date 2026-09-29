// src/model/data/blob/index.js
// Storage backend on Vercel Blob (private access). Used by the Vercel demo
// deployment, where S3/DynamoDB are not available. Each fragment is two blobs:
//   fragments/<ownerId>/<id>.meta.json   metadata
//   fragments/<ownerId>/<id>.data        raw bytes
'use strict';

const { put, get, list, del } = require('@vercel/blob');

const logger = require('../../../logger');

const PREFIX = 'fragments';
const META_SUFFIX = '.meta.json';
const DATA_SUFFIX = '.data';

const metaKey = (ownerId, id) => `${PREFIX}/${ownerId}/${id}${META_SUFFIX}`;
const dataKey = (ownerId, id) => `${PREFIX}/${ownerId}/${id}${DATA_SUFFIX}`;

const writeOptions = { access: 'private', addRandomSuffix: false, allowOverwrite: true };
// Bypass the CDN cache so a read right after an overwrite sees the new bytes
const readOptions = { access: 'private', useCache: false };

async function readBuffer(pathname) {
  const result = await get(pathname, readOptions);
  if (!result || !result.stream) return null;
  return Buffer.from(await new Response(result.stream).arrayBuffer());
}

async function writeFragment(fragment) {
  const item = fragment.toJSON ? fragment.toJSON() : fragment;
  try {
    await put(metaKey(item.ownerId, item.id), JSON.stringify(item), {
      ...writeOptions,
      contentType: 'application/json',
    });
  } catch (err) {
    logger.error({ err, id: item.id }, 'Error writing fragment metadata to Blob');
    throw new Error('unable to write fragment metadata', { cause: err });
  }
}

async function readFragment(ownerId, id) {
  try {
    const buffer = await readBuffer(metaKey(ownerId, id));
    return buffer ? JSON.parse(buffer.toString('utf8')) : undefined;
  } catch (err) {
    logger.error({ err, id }, 'Error reading fragment metadata from Blob');
    throw new Error('unable to read fragment metadata', { cause: err });
  }
}

async function writeFragmentData(ownerId, id, data) {
  try {
    await put(dataKey(ownerId, id), data, {
      ...writeOptions,
      contentType: 'application/octet-stream',
    });
  } catch (err) {
    logger.error({ err, id }, 'Error writing fragment data to Blob');
    throw new Error('unable to upload fragment data', { cause: err });
  }
}

async function readFragmentData(ownerId, id) {
  let buffer;
  try {
    buffer = await readBuffer(dataKey(ownerId, id));
  } catch (err) {
    logger.error({ err, id }, 'Error reading fragment data from Blob');
    throw new Error('unable to read fragment data', { cause: err });
  }
  if (!buffer) throw new Error('unable to read fragment data');
  return buffer;
}

// Lists a user's fragment ids (from the metadata blob names), following pagination.
async function listFragments(ownerId, expand = false) {
  const prefix = `${PREFIX}/${ownerId}/`;
  const ids = [];
  try {
    let cursor;
    do {
      const page = await list({ prefix, cursor, limit: 1000 });
      for (const blob of page.blobs) {
        if (blob.pathname.endsWith(META_SUFFIX)) {
          ids.push(blob.pathname.slice(prefix.length, -META_SUFFIX.length));
        }
      }
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
  } catch (err) {
    logger.error({ err }, 'Error listing fragments from Blob');
    throw new Error('unable to list fragments', { cause: err });
  }

  if (!expand) return ids;
  const items = await Promise.all(ids.map((id) => readFragment(ownerId, id)));
  return items.filter(Boolean);
}

async function deleteFragment(ownerId, id) {
  try {
    await del([metaKey(ownerId, id), dataKey(ownerId, id)]);
  } catch (err) {
    logger.error({ err, id }, 'Error deleting fragment from Blob');
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
