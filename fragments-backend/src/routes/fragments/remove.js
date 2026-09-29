// DELETE /v1/fragments/:id
'use strict';

const { Fragment } = require('../../model/fragment');
const { createSuccessResponse } = require('../../response');

module.exports = async (req, res) => {
  const { id } = req.params;

  // Ensures the fragment exists and belongs to this user (404 otherwise)
  await Fragment.byId(req.user, id);
  await Fragment.delete(req.user, id);

  req.log.debug({ fragmentId: id }, 'Fragment deleted');

  res.status(200).json(createSuccessResponse());
};
