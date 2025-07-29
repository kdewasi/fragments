// src/routes/api/fragments/delete.js

const { Fragment } = require('../../../model/fragment');
const { createSuccessResponse, createErrorResponse } = require('../../../response');

module.exports = async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ Extract ownerId (either user object or string)
    const user = req.user;
    const ownerId = typeof user === 'object' ? user.email : user;

    // ✅ Check if fragment exists and belongs to user
    try {
      await Fragment.byId(ownerId, id);
    } catch {
      return res.status(404).json(createErrorResponse(404, 'Fragment not found'));
    }

    // ✅ Delete the fragment
    await Fragment.delete(ownerId, id);

    return res.status(200).json(createSuccessResponse({ status: 'ok' }));
  } catch (err) {
    console.error('❌ DELETE /fragments/:id failed:', err);
    return res.status(500).json(createErrorResponse(500, 'Internal Server Error'));
  }
};
