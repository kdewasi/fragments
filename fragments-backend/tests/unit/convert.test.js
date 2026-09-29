const sharp = require('sharp');
const {
  typeForExtension,
  contentTypeFor,
  parseCsv,
  convertFragmentData,
} = require('../../src/model/convert');
const { makeImage } = require('./helpers');

describe('typeForExtension()', () => {
  test('maps known extensions (case-insensitively) and rejects unknown ones', () => {
    expect(typeForExtension('txt')).toBe('text/plain');
    expect(typeForExtension('HTML')).toBe('text/html');
    expect(typeForExtension('yml')).toBe('application/yaml');
    expect(typeForExtension('jpg')).toBe('image/jpeg');
    expect(typeForExtension('exe')).toBeNull();
    expect(typeForExtension(undefined)).toBeNull();
  });
});

describe('contentTypeFor()', () => {
  test('adds a charset to text types only', () => {
    expect(contentTypeFor('text/html')).toBe('text/html; charset=utf-8');
    expect(contentTypeFor('application/json')).toBe('application/json; charset=utf-8');
    expect(contentTypeFor('application/yaml')).toBe('application/yaml');
    expect(contentTypeFor('image/png')).toBe('image/png');
  });
});

describe('parseCsv()', () => {
  test('parses a header row and records', () => {
    expect(parseCsv('a,b\n1,2\n3,4')).toEqual([
      { a: '1', b: '2' },
      { a: '3', b: '4' },
    ]);
  });

  test('handles quotes, escaped quotes, CRLF and a trailing newline', () => {
    expect(parseCsv('name,quote\r\n"Smith, J","He said ""hi"""\r\n')).toEqual([
      { name: 'Smith, J', quote: 'He said "hi"' },
    ]);
  });

  test('fills missing fields with empty strings and skips blank lines', () => {
    expect(parseCsv('a,b,c\n1\n\n2,3')).toEqual([
      { a: '1', b: '', c: '' },
      { a: '2', b: '3', c: '' },
    ]);
  });

  test('returns an empty array for empty input or a header only', () => {
    expect(parseCsv('')).toEqual([]);
    expect(parseCsv('a,b\n')).toEqual([]);
  });
});

describe('convertFragmentData()', () => {
  test('returns the same data for an identical type', async () => {
    const data = Buffer.from('same');
    const out = await convertFragmentData(data, 'text/plain', 'text/plain');
    expect(out.data).toBe(data);
    expect(out.contentType).toBe('text/plain; charset=utf-8');
  });

  test('markdown -> html', async () => {
    const out = await convertFragmentData(Buffer.from('# T'), 'text/markdown', 'text/html');
    expect(out.data.toString()).toContain('<h1>T</h1>');
  });

  test('csv -> json', async () => {
    const out = await convertFragmentData(Buffer.from('x\n1'), 'text/csv', 'application/json');
    expect(JSON.parse(out.data.toString())).toEqual([{ x: '1' }]);
  });

  test('json -> yaml', async () => {
    const out = await convertFragmentData(
      Buffer.from('{"a":[1,2]}'),
      'application/json',
      'application/yaml'
    );
    expect(out.data.toString()).toBe('a:\n  - 1\n  - 2\n');
  });

  test('invalid stored JSON yields a 422', async () => {
    await expect(
      convertFragmentData(Buffer.from('{'), 'application/json', 'application/yaml')
    ).rejects.toMatchObject({ status: 422 });
  });

  test('unsupported text conversions yield a 415', async () => {
    await expect(
      convertFragmentData(Buffer.from('a: 1'), 'application/yaml', 'application/json')
    ).rejects.toMatchObject({ status: 415 });
    await expect(
      convertFragmentData(Buffer.from('x'), 'text/plain', 'image/png')
    ).rejects.toMatchObject({ status: 415 });
  });

  test('image -> image', async () => {
    const png = await makeImage('png');
    const out = await convertFragmentData(png, 'image/png', 'image/webp');
    expect(out.contentType).toBe('image/webp');
    expect((await sharp(out.data).metadata()).format).toBe('webp');
  });

  test('corrupt image data yields a 422', async () => {
    await expect(
      convertFragmentData(Buffer.from('not an image'), 'image/png', 'image/jpeg')
    ).rejects.toMatchObject({ status: 422 });
  });
});
