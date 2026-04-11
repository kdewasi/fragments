const { Fragment } = require('../../model/fragment');
const { createSuccessResponse, createErrorResponse } = require('../../response');
const logger = require('../../logger');

module.exports = async (req, res, next) => {
  const ownerId = req.user;
  const expand = req.query.expand === '1';

  try {
    logger.debug({ ownerId, expand }, 'GET /fragments request');

    const fragments = await Fragment.byUser(ownerId, expand);
    logger.debug({ count: fragments.length }, 'Fragments retrieved');

    res.status(200).json(createSuccessResponse({ fragments }));
  } catch (err) {
    next(err);
  }
};
