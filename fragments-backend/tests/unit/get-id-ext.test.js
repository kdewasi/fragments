const request = require('supertest');
const app = require('../../src/app');

describe('GET /v1/fragments/:id.html', () => {
  const user = 'kishandewasi606@gmail.com';
  const pass = 'Jckzwtjh7d';

  let fragmentId;

  beforeAll(async () => {
    // First, create a Markdown fragment
    const res = await request(app)
      .post('/v1/fragments')
      .auth(user, pass)
      .set('Content-Type', 'text/markdown')
      .send('# Hello Markdown');

    expect(res.statusCode).toBe(201);
    fragmentId = res.body.fragment.id;
  });

  test('converts Markdown fragment to HTML successfully', async () => {
    const res = await request(app).get(`/v1/fragments/${fragmentId}.html`).auth(user, pass);

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('text/html; charset=utf-8');
    expect(res.text).toContain('<h1>Hello Markdown</h1>');
  });
});
