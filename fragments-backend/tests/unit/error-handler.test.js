const request = require('supertest');
const app = require('../../src/app');

describe('Central Error Handler', () => {
  test('returns 404 with standardized error shape for unknown routes', async () => {
    const res = await request(app).get('/nonexistent-route');
    expect(res.statusCode).toBe(404);
    expect(res.body.status).toBe('error');
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe(404);
    expect(res.body.error.message).toMatch(/not found/i);
  });

  test('returns 401 for unauthenticated requests to protected routes', async () => {
    const res = await request(app).get('/v1/fragments');
    expect(res.statusCode).toBe(401);
    expect(res.body.status).toBe('error');
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe(401);
  });

  test('error response shape is always { status, error: { code, message } }', async () => {
    const res = await request(app).get('/this/does/not/exist');
    expect(res.body).toEqual(
      expect.objectContaining({
        status: 'error',
        error: expect.objectContaining({
          code: expect.any(Number),
          message: expect.any(String),
        }),
      })
    );
  });

  test('returns 415 for unsupported Content-Type on authenticated POST', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .auth('kishandewasi606@gmail.com', 'Jckzwtjh7d')
      .set('Content-Type', 'application/octet-stream')
      .send('test');

    expect(res.statusCode).toBe(415);
    expect(res.body.status).toBe('error');
    expect(res.body.error.code).toBe(415);
  });
});
