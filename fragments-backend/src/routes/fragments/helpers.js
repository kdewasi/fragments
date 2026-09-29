// src/routes/fragments/helpers.js
'use strict';

const config = require('../../config');
const { Fragment } = require('../../model/fragment');
const { HttpError } = require('../../errors');

/** Absolute URL of a fragment, preferring the configured public API_URL. */
function fragmentLocation(req, id) {
  const base = config.apiUrl || `${req.protocol}://${req.get('host')}`;
  return new URL(`/v1/fragments/${id}`, base).href;
}

/** Validate the Content-Type header and raw body of a POST/PUT request. */
function requireFragmentBody(req) {
  const type = req.get('Content-Type');
  if (!type) throw new HttpError(400, 'Content-Type header is required');
  if (!Fragment.isSupportedType(type)) {
    throw new HttpError(415, `Unsupported Content-Type: ${type}`);
  }
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    throw new HttpError(400, 'Request body is empty or could not be read');
  }
  return { type, body: req.body };
}

module.exports = { fragmentLocation, requireFragmentBody };
