// src/model/convert.js
// Conversions between supported fragment types.
'use strict';

const MarkdownIt = require('markdown-it');
const yaml = require('js-yaml');
const sharp = require('sharp');

const { HttpError } = require('../errors');

// Raw HTML inside Markdown is escaped (html: false) so converted output is safe to render.
const md = new MarkdownIt({ html: false, linkify: false });

const EXTENSION_TO_TYPE = {
  txt: 'text/plain',
  md: 'text/markdown',
  html: 'text/html',
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

const SHARP_FORMAT = {
  'image/png': 'png',
  'image/jpeg': 'jpeg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

const TEXT_TYPES = new Set([
  'text/plain',
  'text/markdown',
  'text/html',
  'text/csv',
  'application/json',
]);

/** Map a file extension (without the dot) to a MIME type, or null. */
function typeForExtension(ext) {
  return EXTENSION_TO_TYPE[String(ext || '').toLowerCase()] || null;
}

/** Content-Type header to send for a converted result. */
function contentTypeFor(mimeType) {
  return TEXT_TYPES.has(mimeType) ? `${mimeType}; charset=utf-8` : mimeType;
}

/**
 * Minimal CSV parser (RFC 4180 style: comma separated, optional double-quoted
 * fields with "" escapes, CRLF or LF line endings). The first row is the header.
 * @returns {Array<Record<string, string>>}
 */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const [header, ...records] = rows.filter((r) => !(r.length === 1 && r[0] === ''));
  if (!header) return [];
  return records.map((record) =>
    Object.fromEntries(header.map((name, index) => [name, record[index] ?? '']))
  );
}

/**
 * Convert fragment data from one supported type to another.
 * @param {Buffer} data
 * @param {string} fromType MIME type of `data` (no parameters)
 * @param {string} toType   target MIME type (no parameters)
 * @returns {Promise<{ data: Buffer, contentType: string }>}
 */
async function convertFragmentData(data, fromType, toType) {
  const result = (buffer) => ({ data: buffer, contentType: contentTypeFor(toType) });

  if (fromType === toType) return result(data);

  const fromImage = fromType.startsWith('image/');
  const toImage = toType.startsWith('image/');

  if (fromImage && toImage) {
    try {
      const converted = await sharp(data).toFormat(SHARP_FORMAT[toType]).toBuffer();
      return result(converted);
    } catch (err) {
      throw new HttpError(422, 'Image data could not be converted', { cause: err });
    }
  }

  if (fromImage || toImage) {
    throw new HttpError(415, `Cannot convert ${fromType} to ${toType}`);
  }

  const text = data.toString('utf8');

  // Any text-like type can be served verbatim as plain text
  if (toType === 'text/plain') return result(data);

  try {
    if (fromType === 'text/markdown' && toType === 'text/html') {
      return result(Buffer.from(md.render(text), 'utf8'));
    }
    if (fromType === 'text/csv' && toType === 'application/json') {
      return result(Buffer.from(JSON.stringify(parseCsv(text), null, 2), 'utf8'));
    }
    if (fromType === 'application/json' && toType === 'application/yaml') {
      return result(Buffer.from(yaml.dump(JSON.parse(text)), 'utf8'));
    }
  } catch (err) {
    throw new HttpError(422, `Fragment data could not be converted to ${toType}`, { cause: err });
  }

  throw new HttpError(415, `Cannot convert ${fromType} to ${toType}`);
}

module.exports = { typeForExtension, contentTypeFor, parseCsv, convertFragmentData };
