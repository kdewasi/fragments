const { Fragment } = require('../../model/fragment');

module.exports = async (req, res) => {
  const ownerId = req.user;
  const expand = req.query.expand === '1';

  try {
    console.log('📦 ownerId:', ownerId);
    console.log('🧩 expand:', expand);

    const fragments = await Fragment.byUser(ownerId, expand);
    console.log('✅ Retrieved fragments:', fragments);

    res.status(200).json({
      status: 'ok',
      fragments,
    });
  } catch (err) {
    console.error('❌ Error in GET /fragments:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve fragments',
    });
  }
};
