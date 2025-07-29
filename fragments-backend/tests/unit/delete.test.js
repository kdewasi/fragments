const request = require('supertest');
const app = require('../../src/app');

describe('DELETE /v1/fragments/:id', () => {
  const user = 'kishandewasi606@gmail.com';
  const pass = 'Jckzwtjh7d';

  let fragmentId;

  beforeAll(async () => {
    // Create a fragment to delete
    const res = await request(app)
      .post('/v1/fragments')
      .auth(user, pass)
      .set('Content-Type', 'text/plain')
      .send('Content to delete');

    expect(res.statusCode).toBe(201);
    fragmentId = res.body.fragment.id;
  });

  test('unauthenticated requests are denied', () =>
    request(app).delete(`/v1/fragments/${fragmentId}`).expect(401));

  test('non-existent fragment returns 404', () =>
    request(app).delete('/v1/fragments/non-existent-id').auth(user, pass).expect(404));

  test('authenticated user can delete a fragment', async () => {
    const res = await request(app).delete(`/v1/fragments/${fragmentId}`).auth(user, pass);

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('deleted fragment is no longer accessible', async () => {
    const res = await request(app).get(`/v1/fragments/${fragmentId}`).auth(user, pass);

    expect(res.statusCode).toBe(404);
  });

  test('deleted fragment is not in user fragments list', async () => {
    const res = await request(app).get('/v1/fragments').auth(user, pass);

    expect(res.statusCode).toBe(200);
    expect(res.body.fragments).not.toContainEqual(expect.objectContaining({ id: fragmentId }));
  });
});
