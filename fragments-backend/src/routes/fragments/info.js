// GET /v1/fragments/:id/info -> fragment metadata
'use strict';

const { Fragment } = require('../../model/fragment');
const { createSuccessResponse } = require('../../response');

module.exports = async (req, res) => {
  const fragment = await Fragment.byId(req.user, req.params.id);
  res.status(200).json(createSuccessResponse({ fragment }));
};
