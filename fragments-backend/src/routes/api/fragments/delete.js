// src/routes/api/fragments/delete.js

const { Fragment } = require('../../../model/fragment');
const { createSuccessResponse, createErrorResponse } = require('../../../response');
const logger = require('../../../logger');

module.exports = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = req.user;
    const ownerId = typeof user === 'object' ? user.email : user;

    try {
      await Fragment.byId(ownerId, id);
    } catch {
      return res.status(404).json(createErrorResponse(404, `Fragment ${id} not found`));
    }

    await Fragment.delete(ownerId, id);

    logger.debug({ fragmentId: id, ownerId }, 'Fragment deleted');
    return res.status(200).json(createSuccessResponse({ status: 'ok' }));
  } catch (err) {
    next(err);
  }
};

