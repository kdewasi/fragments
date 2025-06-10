const { randomUUID } = require('crypto');
const contentType = require('content-type');

const {
  readFragment,
  writeFragment,
  readFragmentData,
  writeFragmentData,
  listFragments,
  deleteFragment,
} = require('./data/index');

const supportedTypes = [
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
];

class Fragment {
  constructor({ id = randomUUID(), ownerId, created = new Date().toISOString(), updated = new Date().toISOString(), type, size = 0 }) {
  if (!ownerId) throw new Error('ownerId is required');
  if (!type) throw new Error('type is required');
  if (!Fragment.isSupportedType(type)) throw new Error(`Unsupported type: ${type}`);
  if (typeof size !== 'number') throw new Error('size must be a number');
  if (size < 0) throw new Error('size must be non-negative');

  this.id = id;
  this.ownerId = ownerId;
  this.created = created;
  this.updated = updated;
  this.type = type;
  this.size = size;
}


  static isSupportedType(value) {
    try {
      const { type } = contentType.parse(value);
      return supportedTypes.includes(type);
    } catch {
      return false;
    }
  }

  get mimeType() {
    return contentType.parse(this.type).type;
  }

  get isText() {
    return this.mimeType.startsWith('text/');
  }

  get formats() {
    const conversionMap = {
      'text/plain': ['text/plain'],
      'text/markdown': ['text/markdown', 'text/html', 'text/plain'],
      'text/html': ['text/html', 'text/plain'],
      'text/csv': ['text/csv', 'text/plain', 'application/json'],
      'application/json': ['application/json', 'application/yaml', 'text/plain'],
      'application/yaml': ['application/yaml', 'text/plain'],
      'image/png': ['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/gif'],
      'image/jpeg': ['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/gif'],
      'image/webp': ['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/gif'],
      'image/gif': ['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/gif'],
      'image/avif': ['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/gif'],
    };
    return conversionMap[this.mimeType] || [];
  }

  static async byUser(ownerId, expand = false) {
    const results = await listFragments(ownerId, expand);
    return expand ? results.map((data) => new Fragment(data)) : results;
  }

  static async byId(ownerId, id) {
  const data = await readFragment(ownerId, id);
  if (!data) {
    throw new Error('Fragment not found');
  }
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

  async setData(data) {
    if (!Buffer.isBuffer(data)) {
      throw new Error('Data must be a Buffer');
    }

    this.size = data.length;
    this.updated = new Date().toISOString();

    await writeFragmentData(this.ownerId, this.id, data);
    await writeFragment(this);
  }
}

module.exports.Fragment = Fragment;
