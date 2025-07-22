// src/routes/api/get-ext.js
const { Fragment } = require('../../model/fragment');

module.exports = async (req, res) => {
  const ownerId = req.user;

  try {
    const fragments = await Fragment.byUser(ownerId, true); // expand = true
    res.status(200).json({
      status: 'ok',
      fragments,
    });
  } catch {
    res.status(500).json({ status: 'error', message: 'Could not retrieve fragments' });
  }
};
