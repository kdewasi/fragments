const { Fragment } = require('../../model/fragment');
const { createErrorResponse } = require('../../response');
const logger = require('../../logger');

module.exports = async (req, res, next) => {
  try {
    const ownerId = req.user;
    if (!ownerId) {
      logger.warn('Unauthorized request to GET fragment by id: no user on request');
      return res.status(401).json(createErrorResponse(401, 'Unauthorized'));
    }

    const { id } = req.params;

    let fragment;
    try {
      fragment = await Fragment.byId(ownerId, id);
    } catch {
      return res.status(404).json(createErrorResponse(404, `Fragment ${id} not found`));
    }

    const data = await fragment.getData();

    res.setHeader('Content-Type', fragment.type);
    res.setHeader('Content-Length', data.length);

    logger.debug({ fragmentId: id, ownerId, type: fragment.type }, 'Retrieved fragment data');
    return res.status(200).send(data);
  } catch (err) {
    next(err);
  }
};

