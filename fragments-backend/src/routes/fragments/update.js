// PUT /v1/fragments/:id -> replace a fragment's data (type must not change)
'use strict';

const contentType = require('content-type');

const { Fragment } = require('../../model/fragment');
const { createSuccessResponse } = require('../../response');
const { HttpError } = require('../../errors');
const { fragmentLocation, requireFragmentBody } = require('./helpers');

module.exports = async (req, res) => {
  const { id } = req.params;
  const { type, body } = requireFragmentBody(req);

  const fragment = await Fragment.byId(req.user, id);

  if (contentType.parse(type).type !== fragment.mimeType) {
    throw new HttpError(
      400,
      `Content-Type ${type} does not match the existing fragment type ${fragment.mimeType}`
    );
  }

  await fragment.setData(body);

  req.log.debug({ fragmentId: id, size: fragment.size }, 'Fragment updated');

  res.setHeader('Location', fragmentLocation(req, fragment.id));
  res.status(200).json(createSuccessResponse({ fragment }));
};
