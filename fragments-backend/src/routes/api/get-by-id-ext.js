const { Fragment } = require('../../model/fragment');
const MarkdownIt = require('markdown-it');
const sharp = require('sharp');
const md = new MarkdownIt();

// Helper function to get MIME type from extension
function getTargetType(ext) {
  const extensionMap = {
    txt: 'text/plain',
    html: 'text/html',
    md: 'text/markdown',
    csv: 'text/csv',
    json: 'application/json',
    yaml: 'application/yaml',
    yml: 'application/yaml',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
    avif: 'image/avif',
  };
  return extensionMap[ext.toLowerCase()];
}

module.exports = async (req, res) => {
  const { id, ext } = req.params;

  // ✅ Correctly extract ownerId for both Cognito (object) and Basic Auth (string)
  const ownerId = typeof req.user === 'object' ? req.user.sub || req.user.id : req.user;

  try {
    const fragment = await Fragment.byId(ownerId, id);
    const data = await fragment.getData();

    // Get the target MIME type based on extension
    const targetType = getTargetType(ext);
    if (!targetType) {
      return res.status(400).json({ error: `Unsupported conversion extension: .${ext}` });
    }

    // Check if conversion is supported
    if (!fragment.formats.includes(targetType)) {
      return res.status(415).json({
        error: `Cannot convert ${fragment.type} to ${targetType}`,
      });
    }

    let convertedData;
    let contentType = targetType;

    // Handle text conversions
    if (ext === 'html' && fragment.type === 'text/markdown') {
      const html = md.render(data.toString());
      convertedData = Buffer.from(html);
      contentType = 'text/html; charset=utf-8';
    }
    // Handle JSON/YAML conversions
    else if (ext === 'json' && fragment.type === 'application/yaml') {
      const yaml = require('js-yaml');
      const obj = yaml.load(data.toString());
      convertedData = Buffer.from(JSON.stringify(obj, null, 2));
      contentType = 'application/json';
    } else if (ext === 'yaml' && fragment.type === 'application/json') {
      const yaml = require('js-yaml');
      const obj = JSON.parse(data.toString());
      convertedData = Buffer.from(yaml.dump(obj));
      contentType = 'application/yaml';
    }
    // Handle text to plain text
    else if (ext === 'txt') {
      convertedData = Buffer.from(data.toString());
      contentType = 'text/plain';
    }
    // Handle image conversions using Sharp
    else if (fragment.type.startsWith('image/') && targetType.startsWith('image/')) {
      const imageFormat = ext.toLowerCase();
      convertedData = await sharp(data).toFormat(imageFormat).toBuffer();
      contentType = targetType;
    }
    // No conversion needed, return original
    else {
      convertedData = data;
      contentType = fragment.type;
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', convertedData.length);
    res.status(200).send(convertedData);
  } catch (err) {
    console.error('❌ get-by-id-ext error:', err);
    res.status(404).json({
      status: 'error',
      error: 'Fragment not found or conversion failed',
    });
  }
};
