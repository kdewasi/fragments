import { afterEach, describe, expect, it, vi } from 'vitest';

const loadConfig = async () => {
  vi.resetModules();
  return (await import('./config')).config;
};

describe('config', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('defaults to Basic Auth against localhost', async () => {
    vi.stubEnv('VITE_AUTH_MODE', '');
    vi.stubEnv('VITE_API_URL', '');
    const config = await loadConfig();
    expect(config.authMode).toBe('basic');
    expect(config.apiBaseUrl).toBe('http://localhost:8080');
  });

  it('strips trailing slashes from the API URL', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com///');
    expect((await loadConfig()).apiBaseUrl).toBe('https://api.example.com');
  });

  it('requires the Cognito settings in cognito mode', async () => {
    vi.stubEnv('VITE_AUTH_MODE', 'cognito');
    vi.stubEnv('VITE_COGNITO_AUTHORITY', '');
    vi.stubEnv('VITE_COGNITO_CLIENT_ID', '');
    await expect(loadConfig()).rejects.toThrow(/VITE_COGNITO_AUTHORITY/);

    vi.stubEnv('VITE_COGNITO_AUTHORITY', 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_x');
    vi.stubEnv('VITE_COGNITO_CLIENT_ID', 'client');
    const config = await loadConfig();
    expect(config.authMode).toBe('cognito');
    expect(config.cognito.redirectUri).toBe(`${window.location.origin}/callback`);
  });

  it('rejects an unknown auth mode', async () => {
    vi.stubEnv('VITE_AUTH_MODE', 'magic');
    await expect(loadConfig()).rejects.toThrow(/Unsupported VITE_AUTH_MODE/);
  });
});
