// Shared helpers for the unit tests
const sharp = require('sharp');

// Test-only users defined in tests/.htpasswd
const user = 'test-user@example.com';
const pass = 'test-password-1';
const user2 = 'test-user-2@example.com';
const pass2 = 'test-password-2';

const makeImage = (format, size = 4) =>
  sharp({ create: { width: size, height: size, channels: 3, background: '#ff0000' } })
    .toFormat(format)
    .toBuffer();

// superagent only buffers text/JSON bodies; use this parser for binary responses
const binaryParser = (res, callback) => {
  const chunks = [];
  res.on('data', (chunk) => chunks.push(chunk));
  res.on('end', () => callback(null, Buffer.concat(chunks)));
};

module.exports = { user, pass, user2, pass2, makeImage, binaryParser };
