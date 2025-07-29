const request = require('supertest');
const app = require('../../src/app');

describe('PUT /v1/fragments/:id', () => {
  const user = 'kishandewasi606@gmail.com';
  const pass = 'Jckzwtjh7d';

  let fragmentId;

  beforeAll(async () => {
    // Create a fragment to update
    const res = await request(app)
      .post('/v1/fragments')
      .auth(user, pass)
      .set('Content-Type', 'text/plain')
      .send('Original content');

    expect(res.statusCode).toBe(201);
    fragmentId = res.body.fragment.id;
  });

  test('unauthenticated requests are denied', () =>
    request(app)
      .put(`/v1/fragments/${fragmentId}`)
      .set('Content-Type', 'text/plain')
      .send('updated content')
      .expect(401));

  test('unsupported content-type is rejected', () =>
    request(app)
      .put(`/v1/fragments/${fragmentId}`)
      .auth(user, pass)
      .set('Content-Type', 'application/octet-stream')
      .send('test')
      .expect(415));

  test('non-existent fragment returns 404', () =>
    request(app)
      .put('/v1/fragments/non-existent-id')
      .auth(user, pass)
      .set('Content-Type', 'text/plain')
      .send('updated content')
      .expect(404));

  test('authenticated user can update a fragment', async () => {
    const res = await request(app)
      .put(`/v1/fragments/${fragmentId}`)
      .auth(user, pass)
      .set('Content-Type', 'text/plain')
      .send('Updated content!');

    expect(res.statusCode).toBe(200);
    expect(res.headers.location).toMatch(/\/v1\/fragments\/.+/);
    expect(res.body.status).toBe('ok');
    expect(res.body.fragment.id).toBe(fragmentId);
    expect(res.body.fragment.type).toBe('text/plain');
    expect(res.body.fragment.size).toBe(16); // "Updated content!" length
  });

  test('fragment data is actually updated', async () => {
    const res = await request(app).get(`/v1/fragments/${fragmentId}`).auth(user, pass);

    expect(res.statusCode).toBe(200);
    expect(res.text).toBe('Updated content!');
  });
});
