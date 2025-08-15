const request = require('supertest');
const app = require('../../src/app');

describe('Format Conversions', () => {
  const user = 'kishandewasi606@gmail.com';
  const pass = 'Jckzwtjh7d';

  test('converts markdown to HTML', async () => {
    // Create markdown fragment
    const createRes = await request(app)
      .post('/v1/fragments')
      .auth(user, pass)
      .set('Content-Type', 'text/markdown')
      .send('# Hello\n**World**');

    expect(createRes.statusCode).toBe(201);
    const fragmentId = createRes.body.fragment.id;

    // Convert to HTML
    const convertRes = await request(app).get(`/v1/fragments/${fragmentId}.html`).auth(user, pass);

    expect(convertRes.statusCode).toBe(200);
    expect(convertRes.headers['content-type']).toContain('text/html');
    expect(convertRes.text).toContain('<h1>Hello</h1>');
    expect(convertRes.text).toContain('<strong>World</strong>');
  });

  test('converts markdown to plain text', async () => {
    // Create markdown fragment
    const createRes = await request(app)
      .post('/v1/fragments')
      .auth(user, pass)
      .set('Content-Type', 'text/markdown')
      .send('# Test');

    expect(createRes.statusCode).toBe(201);
    const fragmentId = createRes.body.fragment.id;

    // Convert to plain text
    const convertRes = await request(app).get(`/v1/fragments/${fragmentId}.txt`).auth(user, pass);

    expect(convertRes.statusCode).toBe(200);
    expect(convertRes.headers['content-type']).toBe('text/plain');
  });

  test('rejects unsupported conversions', async () => {
    // Create plain text fragment
    const createRes = await request(app)
      .post('/v1/fragments')
      .auth(user, pass)
      .set('Content-Type', 'text/plain')
      .send('Plain text');

    expect(createRes.statusCode).toBe(201);
    const fragmentId = createRes.body.fragment.id;

    // Try unsupported conversion
    const convertRes = await request(app).get(`/v1/fragments/${fragmentId}.json`).auth(user, pass);

    expect(convertRes.statusCode).toBe(415);
  });

  test('handles invalid extensions', async () => {
    // Create fragment
    const createRes = await request(app)
      .post('/v1/fragments')
      .auth(user, pass)
      .set('Content-Type', 'text/plain')
      .send('Test');

    expect(createRes.statusCode).toBe(201);
    const fragmentId = createRes.body.fragment.id;

    // Try invalid extension
    const convertRes = await request(app)
      .get(`/v1/fragments/${fragmentId}.invalid`)
      .auth(user, pass);

    expect(convertRes.statusCode).toBe(400);
  });
});
