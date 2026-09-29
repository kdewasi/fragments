const request = require('supertest');
const app = require('../../src/app');
const { user, pass, user2, pass2 } = require('./helpers');

describe('DELETE /v1/fragments/:id', () => {
  let fragmentId;

  beforeAll(async () => {
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

  test("another user's fragment returns 404 and is not deleted", async () => {
    await request(app).delete(`/v1/fragments/${fragmentId}`).auth(user2, pass2).expect(404);
    await request(app).get(`/v1/fragments/${fragmentId}`).auth(user, pass).expect(200);
  });

  test('authenticated user can delete a fragment', async () => {
    const res = await request(app).delete(`/v1/fragments/${fragmentId}`).auth(user, pass);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  test('deleted fragment is no longer accessible', () =>
    request(app).get(`/v1/fragments/${fragmentId}`).auth(user, pass).expect(404));

  test('deleted fragment is not in the fragments list', async () => {
    const res = await request(app).get('/v1/fragments').auth(user, pass);
    expect(res.statusCode).toBe(200);
    expect(res.body.fragments).not.toContain(fragmentId);
  });
});
