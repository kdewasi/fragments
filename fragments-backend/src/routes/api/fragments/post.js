// src/routes/api/fragments/post.js

const { Fragment } = require('../../../model/fragment');
const { createSuccessResponse, createErrorResponse } = require('../../../response');
const logger = require('../../../logger');

module.exports = async (req, res, next) => {
  try {
    const contentTypeHeader = req.get('Content-Type');
    if (!contentTypeHeader) {
      return res.status(400).json(createErrorResponse(400, 'Content-Type header is required'));
    }

    if (!Fragment.isSupportedType(contentTypeHeader)) {
      return res
        .status(415)
        .json(createErrorResponse(415, `Unsupported Content-Type: ${contentTypeHeader}`));
    }

    if (!Buffer.isBuffer(req.body)) {
      return res.status(400).json(createErrorResponse(400, 'Invalid or missing request body'));
    }

    const user = req.user;
    const ownerId = typeof user === 'object' ? user.email : user;

    const fragment = new Fragment({ ownerId, type: contentTypeHeader, size: req.body.length });
    await fragment.setData(req.body);

    const host = process.env.API_URL || `http://${req.headers.host}`;
    const location = new URL(`/v1/fragments/${fragment.id}`, host);

    logger.debug({ fragmentId: fragment.id, type: contentTypeHeader, size: req.body.length }, 'Fragment created');

    res.setHeader('Location', location.href);
    return res.status(201).json(createSuccessResponse({ fragment }));
  } catch (err) {
    next(err);
  }
};

