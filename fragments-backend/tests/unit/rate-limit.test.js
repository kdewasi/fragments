const request = require('supertest');

let app;
beforeAll(() => {
  jest.isolateModules(() => {
    process.env.RATE_LIMIT_MAX = '2';
    process.env.RATE_LIMIT_WINDOW_MS = '60000';
    try {
      app = require('../../src/app');
    } finally {
      process.env.RATE_LIMIT_MAX = '10000';
      delete process.env.RATE_LIMIT_WINDOW_MS;
    }
  });
});

describe('rate limiting', () => {
  test('rejects requests over the limit with a JSON 429', async () => {
    await request(app).get('/').expect(200);
    const second = await request(app).get('/');
    expect(second.statusCode).toBe(200);
    expect(second.headers['ratelimit']).toBeDefined();

    const third = await request(app).get('/');
    expect(third.statusCode).toBe(429);
    expect(third.body).toEqual({
      status: 'error',
      error: { code: 429, message: expect.stringMatching(/Too many requests/) },
    });
  });

  test('the health check is never rate limited', async () => {
    for (let i = 0; i < 5; i += 1) {
      await request(app).get('/health').expect(200);
    }
  });
});
