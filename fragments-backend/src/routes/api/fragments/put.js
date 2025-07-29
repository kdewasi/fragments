// src/routes/api/fragments/put.js

const { Fragment } = require('../../../model/fragment');
const contentType = require('content-type');
const { createSuccessResponse, createErrorResponse } = require('../../../response');

module.exports = async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ Parse and validate Content-Type header
    const { type } = contentType.parse(req);
    if (!Fragment.isSupportedType(type)) {
      return res.status(415).json(createErrorResponse(415, `Unsupported Content-Type: ${type}`));
    }

    // ✅ Ensure request body is a raw Buffer
    if (!Buffer.isBuffer(req.body)) {
      return res.status(400).json(createErrorResponse(400, 'Invalid or missing request body'));
    }

    // ✅ Extract ownerId (either user object or string)
    const user = req.user;
    const ownerId = typeof user === 'object' ? user.email : user;

    // ✅ Check if fragment exists and belongs to user
    let fragment;
    try {
      fragment = await Fragment.byId(ownerId, id);
    } catch {
      return res.status(404).json(createErrorResponse(404, 'Fragment not found'));
    }

    // ✅ Update fragment data
    await fragment.setData(req.body);

    // ✅ Build Location header
    const host = process.env.API_URL || `http://${req.headers.host}`;
    const location = new URL(`/v1/fragments/${fragment.id}`, host);

    res.setHeader('Location', location.href);
    return res.status(200).json(createSuccessResponse({ fragment }));
  } catch (err) {
    console.error('❌ PUT /fragments/:id failed:', err);
    return res.status(500).json(createErrorResponse(500, 'Internal Server Error'));
  }
};
