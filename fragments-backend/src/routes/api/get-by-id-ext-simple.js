const { Fragment } = require('../../model/fragment');

// Simple version without heavy dependencies for testing
module.exports = async (req, res) => {
  const { id, ext } = req.params;

  // Correctly extract ownerId for both Cognito (object) and Basic Auth (string)
  const ownerId = typeof req.user === 'object' ? req.user.sub || req.user.id : req.user;

  try {
    const fragment = await Fragment.byId(ownerId, id);
    const data = await fragment.getData();

    // For now, just return the original data for any extension
    // This is a simplified version to test server startup

    res.setHeader('Content-Type', fragment.type);
    res.setHeader('Content-Length', data.length);
    res.status(200).send(data);
  } catch (err) {
    console.error('❌ get-by-id-ext error:', err);
    res.status(404).json({
      status: 'error',
      error: 'Fragment not found',
    });
  }
};
