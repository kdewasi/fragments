require('dotenv').config();
const express = require('express');
const app = express();
const { version, author } = require('../package.json');

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache');
  next();
});

app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    author,
    githubUrl: 'https://github.com/kdewasi/fragments',
    version,
  });
});

// ✅ Add API routes
app.use('/', require('./routes'));

module.exports = app;
