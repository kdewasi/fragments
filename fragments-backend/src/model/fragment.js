// src/model/fragment.js
'use strict';

const { randomUUID } = require('node:crypto');
const contentType = require('content-type');

const { NotFoundError } = require('../errors');
const { validateFragmentData } = require('./validate');
const {
  readFragment,
  writeFragment,
  readFragmentData,
  writeFragmentData,
  listFragments,
  deleteFragment,
} = require('./data');

const SUPPORTED_TYPES = Object.freeze([
  'text/plain',
  'text/markdown',
  'text/html',
  'text/csv',
  'application/json',
  'application/yaml',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/avif',
]);

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'];

// Which types each stored type can be converted to (including itself)
const CONVERSIONS = Object.freeze({
  'text/plain': ['text/plain'],
  'text/markdown': ['text/markdown', 'text/html', 'text/plain'],
  'text/html': ['text/html', 'text/plain'],
  'text/csv': ['text/csv', 'text/plain', 'application/json'],
  'application/json': ['application/json', 'application/yaml', 'text/plain'],
  'application/yaml': ['application/yaml', 'text/plain'],
  'image/png': IMAGE_TYPES,
  'image/jpeg': IMAGE_TYPES,
  'image/webp': IMAGE_TYPES,
  'image/gif': IMAGE_TYPES,
  'image/avif': IMAGE_TYPES,
});

class Fragment {
  constructor({
    id = randomUUID(),
    ownerId,
    created = new Date().toISOString(),
    updated = new Date().toISOString(),
    type,
    size = 0,
  }) {
    if (!ownerId) throw new Error('ownerId is required');
    if (!type) throw new Error('type is required');
    if (!Fragment.isSupportedType(type)) throw new Error(`Unsupported type: ${type}`);
    if (typeof size !== 'number' || !Number.isInteger(size)) {
      throw new Error('size must be an integer');
    }
    if (size < 0) throw new Error('size must be non-negative');

    this.id = id;
    this.ownerId = ownerId;
    this.created = created;
    this.updated = updated;
    this.type = type;
    this.size = size;
  }

  static get supportedTypes() {
    return SUPPORTED_TYPES;
  }

  /** True when the given Content-Type (optionally with parameters) is supported. */
  static isSupportedType(value) {
    try {
      const { type } = contentType.parse(value);
      return SUPPORTED_TYPES.includes(type);
    } catch {
      return false;
    }
  }

  /** The stored type without parameters, e.g. text/plain */
  get mimeType() {
    return contentType.parse(this.type).type;
  }

  get isText() {
    return this.mimeType.startsWith('text/');
  }

  /** MIME types this fragment can be converted to */
  get formats() {
    return CONVERSIONS[this.mimeType] || [];
  }

  /** List a user's fragment ids, or full fragments when `expand` is true. */
  static async byUser(ownerId, expand = false) {
    const items = (await listFragments(ownerId, expand)) || [];
    if (!expand) return items;
    return items.map((item) => new Fragment(item));
  }

  /** Load a fragment; throws NotFoundError when it does not exist for this user. */
  static async byId(ownerId, id) {
    const data = await readFragment(ownerId, id);
    if (!data) throw new NotFoundError(`Fragment ${id} not found`);
    return new Fragment(data);
  }

  static delete(ownerId, id) {
    return deleteFragment(ownerId, id);
  }

  save() {
    this.updated = new Date().toISOString();
    return writeFragment(this);
  }

  getData() {
    return readFragmentData(this.ownerId, this.id);
  }

  /** Validate and store new data for this fragment, updating size and timestamp. */
  async setData(data) {
    if (!Buffer.isBuffer(data)) throw new Error('Data must be a Buffer');
    await validateFragmentData(this.mimeType, data);

    this.size = data.length;
    this.updated = new Date().toISOString();

    await writeFragmentData(this.ownerId, this.id, data);
    await writeFragment(this);
  }

  toJSON() {
    return {
      id: this.id,
      ownerId: this.ownerId,
      created: this.created,
      updated: this.updated,
      type: this.type,
      size: this.size,
    };
  }
}

module.exports.Fragment = Fragment;
