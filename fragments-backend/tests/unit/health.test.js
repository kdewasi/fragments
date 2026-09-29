const request = require('supertest');
const app = require('../../src/app');
const { version, author } = require('../../package.json');

describe('GET /', () => {
  test('returns 200 with author, githubUrl and version', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.headers['cache-control']).toEqual('no-cache');
    expect(res.body.status).toEqual('ok');
    expect(res.body.author).toEqual(author);
    expect(res.body.githubUrl.startsWith('https://github.com/')).toBe(true);
    expect(res.body.version).toEqual(version);
  });
});

describe('GET /health', () => {
  test('returns 200 with uptime and timestamp', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.headers['cache-control']).toEqual('no-cache');
    expect(res.body.status).toEqual('ok');
    expect(typeof res.body.uptime).toBe('number');
    expect(Date.parse(res.body.timestamp)).not.toBeNaN();
  });

  test('sets security headers and a request id', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  test('echoes a well-formed client request id and replaces a bad one', async () => {
    const good = await request(app).get('/health').set('X-Request-Id', 'trace-123');
    expect(good.headers['x-request-id']).toBe('trace-123');

    const bad = await request(app).get('/health').set('X-Request-Id', 'not valid <script>');
    expect(bad.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });
});
