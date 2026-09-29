// GET /v1/fragments/:id.:ext  -> fragment data converted to the type for `ext`
'use strict';

const { Fragment } = require('../../model/fragment');
const { typeForExtension, convertFragmentData } = require('../../model/convert');
const { HttpError } = require('../../errors');

module.exports = async (req, res) => {
  const { id, ext } = req.params;

  const targetType = typeForExtension(ext);
  if (!targetType) throw new HttpError(400, `Unsupported conversion extension: .${ext}`);

  const fragment = await Fragment.byId(req.user, id);
  if (!fragment.formats.includes(targetType)) {
    throw new HttpError(415, `Cannot convert ${fragment.mimeType} to ${targetType}`);
  }

  const data = await fragment.getData();
  const converted = await convertFragmentData(data, fragment.mimeType, targetType);

  req.log.debug({ fragmentId: id, from: fragment.mimeType, to: targetType }, 'Fragment converted');

  res.setHeader('Content-Type', converted.contentType);
  res.status(200).send(converted.data);
};
