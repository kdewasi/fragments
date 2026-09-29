// GET /v1/fragments/:id  -> raw fragment data with its stored Content-Type
'use strict';

const { Fragment } = require('../../model/fragment');

module.exports = async (req, res) => {
  const fragment = await Fragment.byId(req.user, req.params.id);
  const data = await fragment.getData();

  // setHeader (not res.type) so the stored type is sent verbatim
  res.setHeader('Content-Type', fragment.type);
  res.status(200).send(data);
};
