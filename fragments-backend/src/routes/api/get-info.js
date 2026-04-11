const { createSuccessResponse, createErrorResponse } = require('../../response');
const { Fragment } = require('../../model/fragment');
const logger = require('../../logger');

module.exports = async (req, res, next) => {
  try {
    const ownerId = req.user;
    if (!ownerId) {
      logger.warn('Unauthorized request to fragment info: no user on request');
      return res.status(401).json(createErrorResponse(401, 'Unauthorized'));
    }

    const { id } = req.params;

    let fragment;
    try {
      fragment = await Fragment.byId(ownerId, id);
    } catch {
      return res.status(404).json(createErrorResponse(404, `Fragment ${id} not found`));
    }

    logger.debug({ fragmentId: id, ownerId }, 'Retrieved fragment info');
    return res.status(200).json(
      createSuccessResponse({
        fragment: fragment.toJSON(),
      })
    );
  } catch (err) {
    next(err);
  }
};
