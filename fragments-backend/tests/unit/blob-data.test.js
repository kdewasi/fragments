// Exercise the Vercel Blob storage layer against a mocked SDK.
process.env.FRAGMENTS_STORAGE = 'blob';

jest.mock('@vercel/blob', () => ({
  put: jest.fn(),
  get: jest.fn(),
  list: jest.fn(),
  del: jest.fn(),
}));

const sdk = require('@vercel/blob');
const blob = require('../../src/model/data/blob');
const data = require('../../src/model/data');

const streamOf = (content) => new Response(content).body;
const fragment = {
  id: 'f1',
  ownerId: 'o1',
  type: 'text/plain',
  size: 2,
  created: 'c',
  updated: 'u',
};

beforeEach(() => {
  sdk.put.mockReset();
  sdk.get.mockReset();
  sdk.list.mockReset();
  sdk.del.mockReset();
});

describe('storage backend selection', () => {
  test('uses the Blob backend when FRAGMENTS_STORAGE=blob', () => {
    expect(data).toBe(blob);
  });
});

describe('metadata', () => {
  test('writeFragment() stores private JSON under fragments/<owner>/<id>.meta.json', async () => {
    sdk.put.mockResolvedValue({});
    await blob.writeFragment({ ...fragment, toJSON: () => fragment });
    expect(sdk.put).toHaveBeenCalledWith(
      'fragments/o1/f1.meta.json',
      JSON.stringify(fragment),
      expect.objectContaining({ access: 'private', allowOverwrite: true, addRandomSuffix: false })
    );
  });

  test('readFragment() parses the stored JSON or returns undefined when missing', async () => {
    sdk.get.mockResolvedValueOnce({ stream: streamOf(JSON.stringify(fragment)) });
    expect(await blob.readFragment('o1', 'f1')).toEqual(fragment);
    expect(sdk.get).toHaveBeenCalledWith(
      'fragments/o1/f1.meta.json',
      expect.objectContaining({ access: 'private', useCache: false })
    );

    sdk.get.mockResolvedValueOnce(null);
    expect(await blob.readFragment('o1', 'missing')).toBeUndefined();
  });

  test('wraps SDK errors', async () => {
    sdk.put.mockRejectedValue(new Error('boom'));
    await expect(blob.writeFragment(fragment)).rejects.toThrow(/unable to write/);
    sdk.get.mockRejectedValue(new Error('boom'));
    await expect(blob.readFragment('o1', 'f1')).rejects.toThrow(/unable to read/);
  });
});

describe('data', () => {
  test('writeFragmentData() stores the bytes as a private blob', async () => {
    sdk.put.mockResolvedValue({});
    await blob.writeFragmentData('o1', 'f1', Buffer.from('hi'));
    const [pathname, body, options] = sdk.put.mock.calls[0];
    expect(pathname).toBe('fragments/o1/f1.data');
    expect(body).toEqual(Buffer.from('hi'));
    expect(options).toMatchObject({ access: 'private', contentType: 'application/octet-stream' });
  });

  test('readFragmentData() returns a Buffer and fails when the blob is missing', async () => {
    sdk.get.mockResolvedValueOnce({ stream: streamOf('hi') });
    const buffer = await blob.readFragmentData('o1', 'f1');
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.toString()).toBe('hi');

    sdk.get.mockResolvedValueOnce(null);
    await expect(blob.readFragmentData('o1', 'f1')).rejects.toThrow(/unable to read/);
    sdk.get.mockRejectedValueOnce(new Error('boom'));
    await expect(blob.readFragmentData('o1', 'f1')).rejects.toThrow(/unable to read/);
  });

  test('writeFragmentData() wraps SDK errors', async () => {
    sdk.put.mockRejectedValue(new Error('boom'));
    await expect(blob.writeFragmentData('o1', 'f1', Buffer.from('x'))).rejects.toThrow(
      /unable to upload/
    );
  });
});

describe('listFragments()', () => {
  test('returns ids from metadata blob names, following pagination', async () => {
    sdk.list
      .mockResolvedValueOnce({
        blobs: [{ pathname: 'fragments/o1/a.meta.json' }, { pathname: 'fragments/o1/a.data' }],
        hasMore: true,
        cursor: 'next',
      })
      .mockResolvedValueOnce({ blobs: [{ pathname: 'fragments/o1/b.meta.json' }], hasMore: false });
    expect(await blob.listFragments('o1')).toEqual(['a', 'b']);
    expect(sdk.list.mock.calls[0][0]).toMatchObject({ prefix: 'fragments/o1/' });
    expect(sdk.list.mock.calls[1][0]).toMatchObject({ prefix: 'fragments/o1/', cursor: 'next' });
  });

  test('expands to full metadata and skips blobs that vanished', async () => {
    sdk.list.mockResolvedValue({
      blobs: [
        { pathname: 'fragments/o1/f1.meta.json' },
        { pathname: 'fragments/o1/gone.meta.json' },
      ],
      hasMore: false,
    });
    sdk.get
      .mockResolvedValueOnce({ stream: streamOf(JSON.stringify(fragment)) })
      .mockResolvedValueOnce(null);
    expect(await blob.listFragments('o1', true)).toEqual([fragment]);
  });

  test('wraps SDK errors', async () => {
    sdk.list.mockRejectedValue(new Error('boom'));
    await expect(blob.listFragments('o1')).rejects.toThrow(/unable to list/);
  });
});

describe('deleteFragment()', () => {
  test('deletes both blobs in one call', async () => {
    sdk.del.mockResolvedValue(undefined);
    await blob.deleteFragment('o1', 'f1');
    expect(sdk.del).toHaveBeenCalledWith(['fragments/o1/f1.meta.json', 'fragments/o1/f1.data']);
  });

  test('wraps SDK errors', async () => {
    sdk.del.mockRejectedValue(new Error('boom'));
    await expect(blob.deleteFragment('o1', 'f1')).rejects.toThrow(/unable to delete/);
  });
});
