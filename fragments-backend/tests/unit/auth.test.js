// The auth module picks a strategy at load time, so each case loads it fresh.
jest.mock('aws-jwt-verify', () => ({
  CognitoJwtVerifier: {
    create: jest.fn(() => ({ hydrate: jest.fn().mockResolvedValue(undefined), verify: jest.fn() })),
  },
}));

const loadAuth = (env) => {
  let result;
  let error;
  jest.isolateModules(() => {
    const saved = { ...process.env };
    // Start from a clean auth-related environment
    delete process.env.HTPASSWD_FILE;
    delete process.env.AWS_COGNITO_POOL_ID;
    delete process.env.AWS_COGNITO_CLIENT_ID;
    delete process.env.NODE_ENV;
    Object.assign(process.env, env);
    try {
      result = require('../../src/auth');
    } catch (err) {
      error = err;
    } finally {
      process.env = saved;
    }
  });
  if (error) throw error;
  return result;
};

describe('auth strategy selection', () => {
  test('uses Basic Auth when HTPASSWD_FILE is set outside production', () => {
    const auth = loadAuth({ NODE_ENV: 'test', HTPASSWD_FILE: 'tests/.htpasswd' });
    expect(typeof auth.strategy).toBe('function');
    expect(typeof auth.authenticate).toBe('function');
    expect(auth.strategy().name).toBe('http');
  });

  test('falls back to the test .htpasswd in development when nothing is configured', () => {
    const auth = loadAuth({ NODE_ENV: 'development' });
    expect(auth.strategy().name).toBe('http');
  });

  test('uses Cognito when the pool and client ids are set', () => {
    const auth = loadAuth({
      NODE_ENV: 'production',
      AWS_COGNITO_POOL_ID: 'us-east-1_abc',
      AWS_COGNITO_CLIENT_ID: 'client',
    });
    expect(auth.strategy().name).toBe('bearer');
  });

  test('refuses Basic Auth in production', () => {
    expect(() => loadAuth({ NODE_ENV: 'production', HTPASSWD_FILE: 'tests/.htpasswd' })).toThrow(
      /not allowed when NODE_ENV=production/
    );
  });

  test('refuses to start in production with no auth configured', () => {
    expect(() => loadAuth({ NODE_ENV: 'production' })).toThrow(/No authentication configured/);
  });

  test('refuses both Cognito and Basic Auth at once', () => {
    expect(() =>
      loadAuth({
        HTPASSWD_FILE: 'tests/.htpasswd',
        AWS_COGNITO_POOL_ID: 'pool',
        AWS_COGNITO_CLIENT_ID: 'client',
      })
    ).toThrow(/Only one is allowed/);
  });

  test('refuses a missing .htpasswd file', () => {
    expect(() => loadAuth({ NODE_ENV: 'test', HTPASSWD_FILE: 'tests/.does-not-exist' })).toThrow(
      /not found/
    );
  });

  test('cognito factory validates its arguments', () => {
    const createCognitoAuth = require('../../src/auth/cognito');
    expect(() => createCognitoAuth({})).toThrow(/missing expected env vars/);
  });
});
