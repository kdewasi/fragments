const request = require('supertest');
const sharp = require('sharp');
const yaml = require('js-yaml');
const app = require('../../src/app');
const { user, pass, makeImage, binaryParser } = require('./helpers');

const create = (type, body) =>
  request(app).post('/v1/fragments').auth(user, pass).set('Content-Type', type).send(body);

describe('GET /v1/fragments/:id.:ext', () => {
  test('unauthenticated requests are denied', () =>
    request(app).get('/v1/fragments/abc.html').expect(401));

  test('unknown fragment returns 404', () =>
    request(app).get('/v1/fragments/nope.html').auth(user, pass).expect(404));

  test('unknown extension returns 400', async () => {
    const { body } = await create('text/plain', 'Test');
    const res = await request(app).get(`/v1/fragments/${body.fragment.id}.exe`).auth(user, pass);
    expect(res.statusCode).toBe(400);
    expect(res.body.error.message).toMatch(/Unsupported conversion extension/);
  });

  test('unsupported conversion returns 415', async () => {
    const { body } = await create('text/plain', 'Plain text');
    const res = await request(app).get(`/v1/fragments/${body.fragment.id}.json`).auth(user, pass);
    expect(res.statusCode).toBe(415);
    expect(res.body.error.message).toMatch(/Cannot convert text\/plain to application\/json/);
  });

  test('converts Markdown to HTML', async () => {
    const { body } = await create('text/markdown', '# Hello\n**World**');
    const res = await request(app).get(`/v1/fragments/${body.fragment.id}.html`).auth(user, pass);
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('text/html; charset=utf-8');
    expect(res.text).toContain('<h1>Hello</h1>');
    expect(res.text).toContain('<strong>World</strong>');
  });

  test('escapes raw HTML embedded in Markdown', async () => {
    const { body } = await create('text/markdown', 'hi <script>alert(1)</script>');
    const res = await request(app).get(`/v1/fragments/${body.fragment.id}.html`).auth(user, pass);
    expect(res.text).not.toContain('<script>');
    expect(res.text).toContain('&lt;script&gt;');
  });

  test('converts Markdown to plain text', async () => {
    const { body } = await create('text/markdown', '# Test');
    const res = await request(app).get(`/v1/fragments/${body.fragment.id}.txt`).auth(user, pass);
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('text/plain; charset=utf-8');
    expect(res.text).toBe('# Test');
  });

  test('returns the same type when the extension matches', async () => {
    const { body } = await create('text/markdown', '# Same');
    const res = await request(app).get(`/v1/fragments/${body.fragment.id}.md`).auth(user, pass);
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('text/markdown; charset=utf-8');
    expect(res.text).toBe('# Same');
  });

  test('converts HTML to plain text', async () => {
    const { body } = await create('text/html', '<p>hi</p>');
    const res = await request(app).get(`/v1/fragments/${body.fragment.id}.txt`).auth(user, pass);
    expect(res.statusCode).toBe(200);
    expect(res.text).toBe('<p>hi</p>');
  });

  test('converts CSV to JSON', async () => {
    const { body } = await create('text/csv', 'name,age\nAda,36\n"Smith, John",41\n');
    const res = await request(app).get(`/v1/fragments/${body.fragment.id}.json`).auth(user, pass);
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('application/json; charset=utf-8');
    expect(res.body).toEqual([
      { name: 'Ada', age: '36' },
      { name: 'Smith, John', age: '41' },
    ]);
  });

  test('converts JSON to YAML (.yaml and .yml)', async () => {
    const { body } = await create('application/json', '{"name":"test","value":123}');
    for (const ext of ['yaml', 'yml']) {
      const res = await request(app)
        .get(`/v1/fragments/${body.fragment.id}.${ext}`)
        .auth(user, pass);
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('application/yaml');
      expect(yaml.load(res.text)).toEqual({ name: 'test', value: 123 });
    }
  });

  test('converts JSON to plain text', async () => {
    const { body } = await create('application/json', '{"a":1}');
    const res = await request(app).get(`/v1/fragments/${body.fragment.id}.txt`).auth(user, pass);
    expect(res.statusCode).toBe(200);
    expect(res.text).toBe('{"a":1}');
  });

  test('converts YAML to plain text but not to JSON', async () => {
    const { body } = await create('application/yaml', 'a: 1');
    await request(app).get(`/v1/fragments/${body.fragment.id}.txt`).auth(user, pass).expect(200);
    await request(app).get(`/v1/fragments/${body.fragment.id}.json`).auth(user, pass).expect(415);
  });

  test.each([
    ['jpg', 'image/jpeg', 'jpeg'],
    ['jpeg', 'image/jpeg', 'jpeg'],
    ['webp', 'image/webp', 'webp'],
    ['gif', 'image/gif', 'gif'],
    ['png', 'image/png', 'png'],
  ])('converts a PNG image to .%s', async (ext, mime, format) => {
    const png = await makeImage('png');
    const { body } = await create('image/png', png);
    const res = await request(app)
      .get(`/v1/fragments/${body.fragment.id}.${ext}`)
      .auth(user, pass)
      .buffer(true)
      .parse(binaryParser);
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe(mime);
    const meta = await sharp(res.body).metadata();
    expect(meta.format).toBe(format);
    expect(meta.width).toBe(4);
  });

  test('converts a JPEG image to AVIF', async () => {
    const jpeg = await makeImage('jpeg');
    const { body } = await create('image/jpeg', jpeg);
    const res = await request(app)
      .get(`/v1/fragments/${body.fragment.id}.avif`)
      .auth(user, pass)
      .buffer(true)
      .parse(binaryParser);
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('image/avif');
    const meta = await sharp(res.body).metadata();
    expect(['avif', 'heif']).toContain(meta.format);
  });

  test('images cannot be converted to text', async () => {
    const png = await makeImage('png');
    const { body } = await create('image/png', png);
    await request(app).get(`/v1/fragments/${body.fragment.id}.txt`).auth(user, pass).expect(415);
  });
});
