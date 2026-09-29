import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiClient, FragmentsApiError } from './api.client';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('api client', () => {
  const api = createApiClient({ baseUrl: 'http://api.test' });
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('lists fragments with the Authorization header and expand flag', async () => {
    fetchMock.mockResolvedValue(json({ status: 'ok', fragments: ['a', 'b'] }));
    const res = await api.listFragments('Basic abc', true);
    expect(res.fragments).toEqual(['a', 'b']);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/v1/fragments?expand=1',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Basic abc' }) })
    );
  });

  it('creates a fragment with the given Content-Type', async () => {
    fetchMock.mockResolvedValue(json({ status: 'ok', fragment: { id: '1' } }, 201));
    const res = await api.createFragment('Bearer t', '# hi', 'text/markdown');
    expect(res.fragment.id).toBe('1');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test/v1/fragments');
    expect(init).toMatchObject({
      method: 'POST',
      body: '# hi',
      headers: { Authorization: 'Bearer t', 'Content-Type': 'text/markdown' },
    });
  });

  it('URL-encodes ids and extensions', async () => {
    fetchMock.mockResolvedValue(new Response('x', { status: 200 }));
    await api.convertFragment('Basic a', 'id with space', 'html');
    expect(fetchMock.mock.calls[0][0]).toBe('http://api.test/v1/fragments/id%20with%20space.html');
  });

  it('maps JSON API errors to FragmentsApiError', async () => {
    fetchMock.mockResolvedValue(
      json({ status: 'error', error: { code: 404, message: 'Fragment x not found' } }, 404)
    );
    const promise = api.getFragmentInfo('Basic a', 'x');
    await expect(promise).rejects.toBeInstanceOf(FragmentsApiError);
    await expect(promise).rejects.toMatchObject({ status: 404, apiMessage: 'Fragment x not found' });
  });

  it('maps non-JSON failures to FragmentsApiError with the HTTP status', async () => {
    fetchMock.mockResolvedValue(
      new Response('boom', { status: 502, statusText: 'Bad Gateway', headers: { 'Content-Type': 'text/plain' } })
    );
    await expect(api.getFragmentData('Basic a', 'x')).rejects.toMatchObject({ status: 502 });
  });

  it('returns the raw Response for fragment data', async () => {
    const raw = new Response('hello', { status: 200, headers: { 'Content-Type': 'text/plain' } });
    fetchMock.mockResolvedValue(raw);
    const res = await api.getFragmentData('Basic a', 'id');
    expect(res).toBe(raw);
    expect(await res.text()).toBe('hello');
  });

  it('deletes a fragment', async () => {
    fetchMock.mockResolvedValue(json({ status: 'ok' }));
    await api.deleteFragment('Basic a', 'id');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'DELETE' });
  });
});
