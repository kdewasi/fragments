const request = require('supertest');
const app = require('../../src/app');
const { user, pass, makeImage } = require('./helpers');

describe('POST /v1/fragments', () => {
  test('unauthenticated requests are denied', () =>
    request(app)
      .post('/v1/fragments')
      .set('Content-Type', 'text/plain')
      .send('test fragment')
      .expect(401));

  test('unsupported content-type is rejected with 415', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .auth(user, pass)
      .set('Content-Type', 'application/octet-stream')
      .send('test');
    expect(res.statusCode).toBe(415);
    expect(res.body.error.message).toMatch(/Unsupported Content-Type/);
  });

  test('missing Content-Type is rejected with 400', async () => {
    const res = await request(app).post('/v1/fragments').auth(user, pass);
    expect(res.statusCode).toBe(400);
  });

  test('empty body is rejected with 400', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .auth(user, pass)
      .set('Content-Type', 'text/plain')
      .send('');
    expect(res.statusCode).toBe(400);
    expect(res.body.error.message).toMatch(/empty/i);
  });

  test('authenticated user can create a plain text fragment', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .auth(user, pass)
      .set('Content-Type', 'text/plain')
      .send('Hello, world!');

    expect(res.statusCode).toBe(201);
    expect(res.headers.location).toMatch(/^http:\/\/.+\/v1\/fragments\/[0-9a-f-]{36}$/);
    expect(res.body.status).toBe('ok');
    expect(res.body.fragment).toEqual(
      expect.objectContaining({
        id: expect.stringMatching(/^[0-9a-f-]{36}$/),
        type: 'text/plain',
        size: 13,
        ownerId: expect.stringMatching(/^[0-9a-f]{64}$/),
      })
    );
    expect(Date.parse(res.body.fragment.created)).not.toBeNaN();
  });

  test.each([
    ['text/markdown', '# Title'],
    ['text/html', '<p>hi</p>'],
    ['text/csv', 'a,b\n1,2'],
    ['application/json', '{"a":1}'],
    ['application/yaml', 'a: 1'],
  ])('accepts %s', async (type, body) => {
    const res = await request(app)
      .post('/v1/fragments')
      .auth(user, pass)
      .set('Content-Type', type)
      .send(body);
    expect(res.statusCode).toBe(201);
    expect(res.body.fragment.type).toBe(type);
    expect(res.body.fragment.size).toBe(Buffer.byteLength(body));
  });

  test('rejects invalid JSON with 400', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .auth(user, pass)
      .set('Content-Type', 'application/json')
      .send('{not json');
    expect(res.statusCode).toBe(400);
    expect(res.body.error.message).toMatch(/valid JSON/);
  });

  test('rejects invalid YAML with 400', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .auth(user, pass)
      .set('Content-Type', 'application/yaml')
      .send('key: [unclosed');
    expect(res.statusCode).toBe(400);
    expect(res.body.error.message).toMatch(/valid YAML/);
  });

  test('accepts a real PNG image', async () => {
    const png = await makeImage('png');
    const res = await request(app)
      .post('/v1/fragments')
      .auth(user, pass)
      .set('Content-Type', 'image/png')
      .send(png);
    expect(res.statusCode).toBe(201);
    expect(res.body.fragment.type).toBe('image/png');
    expect(res.body.fragment.size).toBe(png.length);
  });

  test('rejects bytes that are not an image', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .auth(user, pass)
      .set('Content-Type', 'image/png')
      .send(Buffer.from('definitely not a png'));
    expect(res.statusCode).toBe(400);
    expect(res.body.error.message).toMatch(/valid image/);
  });

  test('rejects an image whose format does not match the Content-Type', async () => {
    const png = await makeImage('png');
    const res = await request(app)
      .post('/v1/fragments')
      .auth(user, pass)
      .set('Content-Type', 'image/jpeg')
      .send(png);
    expect(res.statusCode).toBe(400);
    expect(res.body.error.message).toMatch(/png/);
  });
});

describe('POST /v1/fragments size limit', () => {
  test('bodies over MAX_FRAGMENT_SIZE are rejected with 413', async () => {
    let smallApp;
    jest.isolateModules(() => {
      process.env.MAX_FRAGMENT_SIZE = '1kb';
      try {
        smallApp = require('../../src/app');
      } finally {
        delete process.env.MAX_FRAGMENT_SIZE;
      }
    });

    const res = await request(smallApp)
      .post('/v1/fragments')
      .auth(user, pass)
      .set('Content-Type', 'text/plain')
      .send('x'.repeat(2048));
    expect(res.statusCode).toBe(413);
    expect(res.body.status).toBe('error');
    expect(res.body.error.code).toBe(413);
  });
});

describe('Location header', () => {
  test('uses API_URL when configured', async () => {
    let configuredApp;
    jest.isolateModules(() => {
      process.env.API_URL = 'https://api.example.com';
      try {
        configuredApp = require('../../src/app');
      } finally {
        delete process.env.API_URL;
      }
    });

    const res = await request(configuredApp)
      .post('/v1/fragments')
      .auth(user, pass)
      .set('Content-Type', 'text/plain')
      .send('located');
    expect(res.statusCode).toBe(201);
    expect(res.headers.location).toMatch(/^https:\/\/api\.example\.com\/v1\/fragments\/.+$/);
  });
});
