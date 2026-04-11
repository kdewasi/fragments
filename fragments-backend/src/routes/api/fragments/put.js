// src/routes/api/fragments/put.js

const { Fragment } = require('../../../model/fragment');
const contentType = require('content-type');
const { createSuccessResponse, createErrorResponse } = require('../../../response');
const logger = require('../../../logger');

module.exports = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { type } = contentType.parse(req);
    if (!Fragment.isSupportedType(type)) {
      return res.status(415).json(createErrorResponse(415, `Unsupported Content-Type: ${type}`));
    }

    if (!Buffer.isBuffer(req.body)) {
      return res.status(400).json(createErrorResponse(400, 'Invalid or missing request body'));
    }

    const user = req.user;
    const ownerId = typeof user === 'object' ? user.email : user;

    let fragment;
    try {
      fragment = await Fragment.byId(ownerId, id);
    } catch {
      return res.status(404).json(createErrorResponse(404, `Fragment ${id} not found`));
    }

    await fragment.setData(req.body);

    const host = process.env.API_URL || `http://${req.headers.host}`;
    const location = new URL(`/v1/fragments/${fragment.id}`, host);

    logger.debug({ fragmentId: id, type, size: req.body.length }, 'Fragment updated');

    res.setHeader('Location', location.href);
    return res.status(200).json(createSuccessResponse({ fragment }));
  } catch (err) {
    next(err);
  }
};

