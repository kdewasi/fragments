const { Fragment } = require('../../model/fragment');
const contentType = require('content-type');
const { createSuccessResponse, createErrorResponse } = require('../../response');

module.exports = async (req, res) => {
  try {
    // Validate content-type header
    const { type } = contentType.parse(req);
    if (!Fragment.isSupportedType(type)) {
      return res.status(415).json(createErrorResponse(415, 'Unsupported Content-Type'));
    }

    // Validate body
    if (!Buffer.isBuffer(req.body)) {
      return res.status(400).json(createErrorResponse(400, 'Invalid or missing fragment body'));
    }

    // Create fragment
    const fragment = new Fragment({
      ownerId: req.user, // req.user is hashed email
      type,
      size: req.body.length,
    });

    await fragment.setData(req.body);

    // Build Location header
    const host = process.env.API_URL || `http://${req.headers.host}`;
    const location = new URL(`/v1/fragments/${fragment.id}`, host);

    res.setHeader('Location', location.href);
    return res.status(201).json(createSuccessResponse({ fragment }));
  } catch (err) {
    console.error('❌ POST /fragments failed:', err.message);
    return res.status(500).json(createErrorResponse(500, 'Internal Server Error'));
  }
};
