const request = require('supertest');
const app = require('../../src/app');

describe('GET /v1/fragments/:id/info', () => {
  const user = 'kishandewasi606@gmail.com';
  const pass = 'Jckzwtjh7d';

  test('unauthenticated requests are denied', () =>
    request(app).get('/v1/fragments/123/info').expect(401));

  test('non-existent fragment returns 500', () =>
    request(app).get('/v1/fragments/non-existent-id/info').auth(user, pass).expect(500));

  test('gets fragment info for existing fragment', async () => {
    // First create a fragment
    const createRes = await request(app)
      .post('/v1/fragments')
      .auth(user, pass)
      .set('Content-Type', 'text/plain')
      .send('Test fragment for info');

    expect(createRes.statusCode).toBe(201);
    const fragmentId = createRes.body.fragment.id;

    // Now get its info
    const infoRes = await request(app).get(`/v1/fragments/${fragmentId}/info`).auth(user, pass);

    expect(infoRes.statusCode).toBe(200);
    expect(infoRes.body.status).toBe('ok');
    expect(infoRes.body.fragment.id).toBe(fragmentId);
    expect(infoRes.body.fragment.type).toBe('text/plain');
    expect(infoRes.body.fragment.size).toBe(22);
  });
});
