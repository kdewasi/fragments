const { validateFragmentData } = require('../../src/model/validate');
const { ValidationError } = require('../../src/errors');
const { makeImage } = require('./helpers');

describe('validateFragmentData()', () => {
  test('requires a Buffer', async () => {
    await expect(validateFragmentData('text/plain', 'string')).rejects.toBeInstanceOf(
      ValidationError
    );
  });

  test('accepts any bytes for text types', async () => {
    await expect(
      validateFragmentData('text/plain', Buffer.from([0xff, 0xfe]))
    ).resolves.toBeUndefined();
    await expect(validateFragmentData('text/csv', Buffer.from('a,b'))).resolves.toBeUndefined();
  });

  test('validates JSON', async () => {
    await expect(
      validateFragmentData('application/json', Buffer.from('{"ok":true}'))
    ).resolves.toBeUndefined();
    await expect(validateFragmentData('application/json', Buffer.from('{'))).rejects.toThrow(
      /valid JSON/
    );
  });

  test('validates YAML', async () => {
    await expect(
      validateFragmentData('application/yaml', Buffer.from('a: 1\nb: [1, 2]'))
    ).resolves.toBeUndefined();
    await expect(validateFragmentData('application/yaml', Buffer.from('a: [1, 2'))).rejects.toThrow(
      /valid YAML/
    );
  });

  test('validates images against their declared type', async () => {
    const png = await makeImage('png');
    const webp = await makeImage('webp');
    await expect(validateFragmentData('image/png', png)).resolves.toBeUndefined();
    await expect(validateFragmentData('image/webp', webp)).resolves.toBeUndefined();
    await expect(validateFragmentData('image/jpeg', png)).rejects.toThrow(
      /Image data is png but Content-Type is image\/jpeg/
    );
    await expect(validateFragmentData('image/gif', Buffer.from('nope'))).rejects.toThrow(
      /valid image/
    );
  });
});
