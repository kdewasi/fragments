const request = require('supertest');
const app = require('../../src/app');
const { user, pass, user2, pass2 } = require('./helpers');

describe('GET /v1/fragments', () => {
  test('unauthenticated requests are denied', () => request(app).get('/v1/fragments').expect(401));

  test('incorrect credentials are denied', () =>
    request(app).get('/v1/fragments').auth('invalid@example.com', 'wrongpassword').expect(401));

  test('authenticated users get a fragments array', async () => {
    const res = await request(app).get('/v1/fragments').auth(user, pass);
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(Array.isArray(res.body.fragments)).toBe(true);
  });

  test('returns ids by default and full metadata with expand=1', async () => {
    const created = await request(app)
      .post('/v1/fragments')
      .auth(user, pass)
      .set('Content-Type', 'text/plain')
      .send('list me');
    const { id } = created.body.fragment;

    const ids = await request(app).get('/v1/fragments').auth(user, pass);
    expect(ids.body.fragments).toContain(id);

    const expanded = await request(app).get('/v1/fragments?expand=1').auth(user, pass);
    const match = expanded.body.fragments.find((f) => f.id === id);
    expect(match).toEqual(expect.objectContaining({ id, type: 'text/plain', size: 7 }));
  });

  test("a user cannot see another user's fragments", async () => {
    const created = await request(app)
      .post('/v1/fragments')
      .auth(user, pass)
      .set('Content-Type', 'text/plain')
      .send('private');
    const { id } = created.body.fragment;

    const other = await request(app).get('/v1/fragments').auth(user2, pass2);
    expect(other.body.fragments).not.toContain(id);

    await request(app).get(`/v1/fragments/${id}`).auth(user2, pass2).expect(404);
    await request(app).get(`/v1/fragments/${id}/info`).auth(user2, pass2).expect(404);
  });
});

describe('GET /v1/fragments/:id', () => {
  test('unauthenticated requests are denied', () =>
    request(app).get('/v1/fragments/abc').expect(401));

  test('unknown fragment returns 404 in the standard error shape', async () => {
    const res = await request(app).get('/v1/fragments/does-not-exist').auth(user, pass);
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      status: 'error',
      error: { code: 404, message: expect.stringMatching(/not found/i) },
    });
  });

  test('returns the raw data with the stored Content-Type (charset preserved)', async () => {
    const created = await request(app)
      .post('/v1/fragments')
      .auth(user, pass)
      .set('Content-Type', 'text/plain; charset=utf-8')
      .send('héllo');
    const { id } = created.body.fragment;

    const res = await request(app).get(`/v1/fragments/${id}`).auth(user, pass);
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('text/plain; charset=utf-8');
    expect(res.text).toBe('héllo');
  });
});

describe('GET /v1/fragments/:id/info', () => {
  test('unauthenticated requests are denied', () =>
    request(app).get('/v1/fragments/123/info').expect(401));

  test('non-existent fragment returns 404', () =>
    request(app).get('/v1/fragments/non-existent-id/info').auth(user, pass).expect(404));

  test('returns metadata for an existing fragment', async () => {
    const created = await request(app)
      .post('/v1/fragments')
      .auth(user, pass)
      .set('Content-Type', 'text/plain')
      .send('Test fragment for info');
    const { id } = created.body.fragment;

    const res = await request(app).get(`/v1/fragments/${id}/info`).auth(user, pass);
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.fragment).toEqual(
      expect.objectContaining({ id, type: 'text/plain', size: 22, ownerId: expect.any(String) })
    );
    expect(res.body.fragment.ownerId).not.toContain('@');
  });
});
