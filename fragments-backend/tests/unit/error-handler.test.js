const request = require('supertest');
const app = require('../../src/app');
const { Fragment } = require('../../src/model/fragment');
const { user, pass } = require('./helpers');

describe('Error handling', () => {
  test('unknown routes return 404 in the standard error shape', async () => {
    const res = await request(app).get('/nonexistent-route');
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ status: 'error', error: { code: 404, message: 'not found' } });
  });

  test('protected routes return 401 without credentials', async () => {
    const res = await request(app).get('/v1/fragments');
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ status: 'error', error: { code: 401, message: 'Unauthorized' } });
  });

  test('unsupported Content-Type on POST returns 415', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .auth(user, pass)
      .set('Content-Type', 'application/octet-stream')
      .send('test');
    expect(res.statusCode).toBe(415);
    expect(res.body.status).toBe('error');
    expect(res.body.error.code).toBe(415);
  });

  test('unexpected errors return a generic 500 without internal details', async () => {
    const spy = jest
      .spyOn(Fragment, 'byUser')
      .mockRejectedValueOnce(new Error('DynamoDB exploded: secret detail'));
    const res = await request(app).get('/v1/fragments').auth(user, pass);
    spy.mockRestore();

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      status: 'error',
      error: { code: 500, message: 'Internal Server Error' },
    });
    expect(JSON.stringify(res.body)).not.toContain('secret detail');
  });

  test('errors with a status code keep their message', async () => {
    const err = new Error('teapot');
    err.status = 418;
    const spy = jest.spyOn(Fragment, 'byUser').mockRejectedValueOnce(err);
    const res = await request(app).get('/v1/fragments').auth(user, pass);
    spy.mockRestore();

    expect(res.statusCode).toBe(418);
    expect(res.body.error).toEqual({ code: 418, message: 'teapot' });
  });
});
