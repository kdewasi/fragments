// src/routes/api/get-by-id-ext.js
const { Fragment } = require('../../model/fragment');
const MarkdownIt = require('markdown-it');
const md = new MarkdownIt();

module.exports = async (req, res) => {
  const { id, ext } = req.params;
  const ownerId = req.user; // set by auth middleware

  try {
    const fragment = await Fragment.byId(ownerId, id);
    const data = await fragment.getData(); // Buffer

    if (ext === 'html') {
      if (fragment.type === 'text/markdown') {
        const markdownText = data.toString();
        const html = md.render(markdownText);
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(html);
      } else {
        return res.status(415).json({ error: 'Only markdown can be converted to HTML' });
      }
    }

    // Fallback: return raw fragment data
    res.setHeader('Content-Type', fragment.type);
    res.status(200).send(data);
  } catch (err) {
    res.status(404).json({ error: 'Fragment not found or invalid extension' });
  }
};
