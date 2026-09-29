const request = require('supertest');
const hash = require('../../src/hash');

const mockVerify = jest.fn();
jest.mock('aws-jwt-verify', () => ({
  CognitoJwtVerifier: {
    create: jest.fn(() => ({
      hydrate: jest.fn().mockResolvedValue(undefined),
      verify: mockVerify,
    })),
  },
}));

// Build the app with Cognito configured (the verifier itself is mocked above)
let app;
beforeAll(() => {
  jest.isolateModules(() => {
    const saved = { ...process.env };
    delete process.env.HTPASSWD_FILE;
    process.env.AWS_COGNITO_POOL_ID = 'us-east-1_testpool';
    process.env.AWS_COGNITO_CLIENT_ID = 'test-client-id';
    try {
      app = require('../../src/app');
    } finally {
      process.env = saved;
    }
  });
});

beforeEach(() => mockVerify.mockReset());

describe('Cognito bearer authentication', () => {
  test('requests without a bearer token are rejected', async () => {
    const res = await request(app).get('/v1/fragments');
    expect(res.statusCode).toBe(401);
    expect(mockVerify).not.toHaveBeenCalled();
  });

  test('Basic credentials are not accepted when Cognito is configured', async () => {
    const res = await request(app).get('/v1/fragments').auth('test-user@example.com', 'x');
    expect(res.statusCode).toBe(401);
  });

  test('a valid ID token authenticates the user by hashed email', async () => {
    mockVerify.mockResolvedValue({ email: 'someone@example.com', token_use: 'id' });
    const create = await request(app)
      .post('/v1/fragments')
      .set('Authorization', 'Bearer valid.jwt.token')
      .set('Content-Type', 'text/plain')
      .send('via cognito');
    expect(mockVerify).toHaveBeenCalledWith('valid.jwt.token');
    expect(create.statusCode).toBe(201);
    expect(create.body.fragment.ownerId).toBe(hash('someone@example.com'));
  });

  test('an invalid token is rejected with 401', async () => {
    mockVerify.mockRejectedValue(new Error('Token expired'));
    const res = await request(app)
      .get('/v1/fragments')
      .set('Authorization', 'Bearer expired.jwt.token');
    expect(res.statusCode).toBe(401);
    expect(res.body.error.message).toBe('Unauthorized');
  });

  test('a token without an email claim is rejected', async () => {
    mockVerify.mockResolvedValue({ sub: 'abc', token_use: 'id' });
    const res = await request(app)
      .get('/v1/fragments')
      .set('Authorization', 'Bearer no.email.claim');
    expect(res.statusCode).toBe(401);
  });
});
