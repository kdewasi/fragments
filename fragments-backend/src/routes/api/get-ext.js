const { Fragment } = require('../../model/fragment');
const markdownIt = require('markdown-it');
const md = markdownIt();

module.exports = async (req, res) => {
  const ownerId = req.user;
  const [id, ext] = req.params.id.split('.');

  try {
    const fragment = await Fragment.byId(ownerId, id);
    const data = await fragment.getData();

    if (fragment.type === 'text/markdown' && ext === 'html') {
      const html = md.render(data.toString());
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(html);
    }

    res.status(415).json({
      status: 'error',
      message: 'Unsupported conversion. Only .md to .html is supported in Assignment 2.',
    });
  } catch (err) {
    res.status(404).json({
      status: 'error',
      message: 'Fragment not found or conversion failed',
    });
  }
};
