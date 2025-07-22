const { Fragment } = require('../../model/fragment');
const MarkdownIt = require('markdown-it');
const md = new MarkdownIt();

module.exports = async (req, res) => {
  const { id, ext } = req.params;

  // ✅ Correctly extract ownerId for both Cognito (object) and Basic Auth (string)
  const ownerId = typeof req.user === 'object' ? req.user.sub || req.user.id : req.user;

  try {
    const fragment = await Fragment.byId(ownerId, id);
    const data = await fragment.getData();

    if (ext === 'html' && fragment.type === 'text/markdown') {
      const html = md.render(data.toString());
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(html);
    }

    if (ext === 'html') {
      return res.status(415).json({ error: 'Only markdown can be converted to HTML' });
    }

    res.setHeader('Content-Type', fragment.type);
    res.status(200).send(data);
  } catch (err) {
    console.error('❌ get-by-id-ext error:', err);
    res.status(404).json({
      status: 'error',
      error: 'Fragment not found or invalid extension',
    });
  }
};
