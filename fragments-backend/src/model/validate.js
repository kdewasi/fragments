// src/model/validate.js
// Validates that a fragment's bytes really are what its Content-Type claims.
// Rejecting bad data on write means every later read/convert can trust it.
'use strict';

const sharp = require('sharp');
const yaml = require('js-yaml');

const { ValidationError } = require('../errors');

// sharp reports AVIF images as "heif"
const IMAGE_FORMATS = {
  'image/png': ['png'],
  'image/jpeg': ['jpeg', 'jpg'],
  'image/webp': ['webp'],
  'image/gif': ['gif'],
  'image/avif': ['avif', 'heif'],
};

async function validateFragmentData(mimeType, data) {
  if (!Buffer.isBuffer(data)) {
    throw new ValidationError('Fragment data must be a Buffer');
  }

  if (mimeType === 'application/json') {
    try {
      JSON.parse(data.toString('utf8'));
    } catch {
      throw new ValidationError('Fragment data is not valid JSON');
    }
    return;
  }

  if (mimeType === 'application/yaml') {
    try {
      yaml.load(data.toString('utf8'));
    } catch {
      throw new ValidationError('Fragment data is not valid YAML');
    }
    return;
  }

  if (IMAGE_FORMATS[mimeType]) {
    let metadata;
    try {
      metadata = await sharp(data).metadata();
    } catch {
      throw new ValidationError('Fragment data is not a valid image');
    }
    if (!IMAGE_FORMATS[mimeType].includes(metadata.format)) {
      throw new ValidationError(`Image data is ${metadata.format} but Content-Type is ${mimeType}`);
    }
  }
}

module.exports = { validateFragmentData };
