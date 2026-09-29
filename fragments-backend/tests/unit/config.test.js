// Loads src/config.js in an isolated module registry with a given environment
const loadConfig = (env) => {
  let config;
  jest.isolateModules(() => {
    const saved = { ...process.env };
    for (const key of Object.keys(env)) {
      if (env[key] === undefined) delete process.env[key];
      else process.env[key] = env[key];
    }
    try {
      config = require('../../src/config');
    } finally {
      process.env = saved;
    }
  });
  return config;
};

describe('config', () => {
  test('defaults for development', () => {
    const config = loadConfig({
      NODE_ENV: undefined,
      PORT: undefined,
      LOG_LEVEL: undefined,
      LOG_PRETTY: undefined,
      CORS_ORIGINS: undefined,
      TRUST_PROXY: undefined,
      AWS_REGION: undefined,
      RATE_LIMIT_MAX: undefined,
      RATE_LIMIT_WINDOW_MS: undefined,
    });
    expect(config.nodeEnv).toBe('development');
    expect(config.isProduction).toBe(false);
    expect(config.port).toBe(8080);
    expect(config.logLevel).toBe('debug');
    expect(config.logPretty).toBe(true);
    expect(config.corsOrigins).toEqual([]);
    expect(config.trustProxy).toBe(false);
    expect(config.aws.region).toBeNull();
    expect(config.rateLimit).toEqual({ windowMs: 60000, limit: 300 });
  });

  test('defaults for production', () => {
    const config = loadConfig({
      NODE_ENV: 'production',
      LOG_LEVEL: undefined,
      LOG_PRETTY: undefined,
    });
    expect(config.isProduction).toBe(true);
    expect(config.logLevel).toBe('info');
    expect(config.logPretty).toBe(false);
  });

  test('parses lists, booleans and trust proxy values', () => {
    expect(loadConfig({ CORS_ORIGINS: 'https://a.com, https://b.com ,' }).corsOrigins).toEqual([
      'https://a.com',
      'https://b.com',
    ]);
    expect(loadConfig({ LOG_PRETTY: 'yes' }).logPretty).toBe(true);
    expect(loadConfig({ LOG_PRETTY: '0' }).logPretty).toBe(false);
    expect(loadConfig({ TRUST_PROXY: '1' }).trustProxy).toBe(1);
    expect(loadConfig({ TRUST_PROXY: 'true' }).trustProxy).toBe(true);
    expect(loadConfig({ TRUST_PROXY: 'loopback' }).trustProxy).toBe('loopback');
    expect(loadConfig({ RATE_LIMIT_MAX: '5', RATE_LIMIT_WINDOW_MS: '1000' }).rateLimit).toEqual({
      windowMs: 1000,
      limit: 5,
    });
  });
});
