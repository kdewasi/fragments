// POST /v1/fragments
'use strict';

const { Fragment } = require('../../model/fragment');
const { createSuccessResponse } = require('../../response');
const { fragmentLocation, requireFragmentBody } = require('./helpers');

module.exports = async (req, res) => {
  const { type, body } = requireFragmentBody(req);

  const fragment = new Fragment({ ownerId: req.user, type });
  await fragment.setData(body);

  req.log.debug({ fragmentId: fragment.id, type, size: fragment.size }, 'Fragment created');

  res.setHeader('Location', fragmentLocation(req, fragment.id));
  res.status(201).json(createSuccessResponse({ fragment }));
};
