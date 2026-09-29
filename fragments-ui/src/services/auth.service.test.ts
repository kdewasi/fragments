import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { basicAuthorization, encodeBasicAuth, signInBasic, validateSession } from './auth.service';

describe('encodeBasicAuth()', () => {
  it('base64-encodes username:password', () => {
    expect(encodeBasicAuth({ username: 'a@b.c', password: 'p' })).toBe(btoa('a@b.c:p'));
    expect(basicAuthorization({ username: 'a@b.c', password: 'p' })).toBe(`Basic ${btoa('a@b.c:p')}`);
  });

  it('handles non-ASCII passwords as UTF-8', () => {
    const encoded = encodeBasicAuth({ username: 'u', password: 'pässwörd' });
    expect(new TextDecoder().decode(Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0)))).toBe(
      'u:pässwörd'
    );
  });
});

describe('sign-in and session validation', () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('signInBasic() returns the user when the backend accepts the credentials', async () => {
    fetchMock.mockResolvedValue(new Response('{"status":"ok","fragments":[]}', { status: 200 }));
    const user = await signInBasic('http://api', { username: 'me@example.com', password: 'pw' });
    expect(user).toEqual({
      username: 'me@example.com',
      email: 'me@example.com',
      authorization: `Basic ${btoa('me@example.com:pw')}`,
    });
    expect(fetchMock).toHaveBeenCalledWith('http://api/v1/fragments', {
      headers: { Authorization: `Basic ${btoa('me@example.com:pw')}` },
    });
  });

  it('signInBasic() rejects bad credentials and other failures distinctly', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 401 }));
    await expect(signInBasic('http://api', { username: 'u', password: 'x' })).rejects.toThrow(
      'Invalid credentials'
    );
    fetchMock.mockResolvedValueOnce(new Response('', { status: 503 }));
    await expect(signInBasic('http://api', { username: 'u', password: 'x' })).rejects.toThrow(
      'Sign-in failed (503)'
    );
  });

  it('validateSession() restores the username from a valid stored header', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }));
    const user = await validateSession('http://api', `Basic ${btoa('me@example.com:pw')}`);
    expect(user?.username).toBe('me@example.com');
  });

  it('validateSession() returns null for missing, malformed or rejected values', async () => {
    expect(await validateSession('http://api', null)).toBeNull();
    expect(await validateSession('http://api', 'Bearer abc')).toBeNull();
    fetchMock.mockResolvedValue(new Response('', { status: 401 }));
    expect(await validateSession('http://api', `Basic ${btoa('u:p')}`)).toBeNull();
  });
});
