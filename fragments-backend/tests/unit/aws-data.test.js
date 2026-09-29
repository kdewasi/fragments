// Exercise the S3 + DynamoDB storage layer against mocked AWS SDK clients.
process.env.AWS_REGION = 'us-east-1';
process.env.AWS_S3_BUCKET_NAME = 'test-bucket';
process.env.AWS_DYNAMODB_TABLE_NAME = 'test-table';

const { mockClient } = require('aws-sdk-client-mock');
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');
const {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  DeleteCommand,
} = require('@aws-sdk/lib-dynamodb');

const s3Mock = mockClient(S3Client);
const ddbMock = mockClient(DynamoDBDocumentClient);

const aws = require('../../src/model/data/aws');
const data = require('../../src/model/data');

beforeEach(() => {
  s3Mock.reset();
  ddbMock.reset();
});

describe('storage backend selection', () => {
  test('uses the AWS backend when AWS_REGION is set', () => {
    expect(data).toBe(aws);
  });
});

describe('DynamoDB metadata', () => {
  const fragment = {
    id: 'f1',
    ownerId: 'o1',
    type: 'text/plain',
    size: 2,
    created: 'c',
    updated: 'u',
  };

  test('writeFragment() puts the item', async () => {
    ddbMock.on(PutCommand).resolves({});
    await aws.writeFragment({ ...fragment, toJSON: () => fragment });
    const call = ddbMock.commandCalls(PutCommand)[0];
    expect(call.args[0].input).toEqual({ TableName: 'test-table', Item: fragment });
  });

  test('writeFragment() wraps errors', async () => {
    ddbMock.on(PutCommand).rejects(new Error('boom'));
    await expect(aws.writeFragment(fragment)).rejects.toThrow(/unable to write/);
  });

  test('readFragment() returns the item or undefined', async () => {
    ddbMock.on(GetCommand, { Key: { ownerId: 'o1', id: 'f1' } }).resolves({ Item: fragment });
    ddbMock.on(GetCommand, { Key: { ownerId: 'o1', id: 'missing' } }).resolves({});
    expect(await aws.readFragment('o1', 'f1')).toEqual(fragment);
    expect(await aws.readFragment('o1', 'missing')).toBeUndefined();
  });

  test('readFragment() wraps errors', async () => {
    ddbMock.on(GetCommand).rejects(new Error('boom'));
    await expect(aws.readFragment('o1', 'f1')).rejects.toThrow(/unable to read/);
  });

  test('listFragments() returns ids, following pagination', async () => {
    ddbMock
      .on(QueryCommand)
      .resolvesOnce({ Items: [{ id: 'a' }], LastEvaluatedKey: { ownerId: 'o1', id: 'a' } })
      .resolvesOnce({ Items: [{ id: 'b' }] });
    expect(await aws.listFragments('o1')).toEqual(['a', 'b']);
    const inputs = ddbMock.commandCalls(QueryCommand).map((c) => c.args[0].input);
    expect(inputs[0].ProjectionExpression).toBe('id');
    expect(inputs[1].ExclusiveStartKey).toEqual({ ownerId: 'o1', id: 'a' });
  });

  test('listFragments(expand) returns full items and handles an empty result', async () => {
    ddbMock
      .on(QueryCommand)
      .resolvesOnce({ Items: [fragment] })
      .resolvesOnce({});
    expect(await aws.listFragments('o1', true)).toEqual([fragment]);
    expect(await aws.listFragments('o1', true)).toEqual([]);
    expect(
      ddbMock.commandCalls(QueryCommand)[0].args[0].input.ProjectionExpression
    ).toBeUndefined();
  });

  test('listFragments() wraps errors', async () => {
    ddbMock.on(QueryCommand).rejects(new Error('boom'));
    await expect(aws.listFragments('o1')).rejects.toThrow(/unable to list/);
  });
});

describe('S3 data', () => {
  test('writeFragmentData() puts the object under ownerId/id', async () => {
    s3Mock.on(PutObjectCommand).resolves({});
    await aws.writeFragmentData('o1', 'f1', Buffer.from('hi'));
    const input = s3Mock.commandCalls(PutObjectCommand)[0].args[0].input;
    expect(input.Bucket).toBe('test-bucket');
    expect(input.Key).toBe('o1/f1');
    expect(input.Body).toEqual(Buffer.from('hi'));
  });

  test('writeFragmentData() wraps errors', async () => {
    s3Mock.on(PutObjectCommand).rejects(new Error('boom'));
    await expect(aws.writeFragmentData('o1', 'f1', Buffer.from('hi'))).rejects.toThrow(
      /unable to upload/
    );
  });

  test('readFragmentData() returns a Buffer', async () => {
    s3Mock.on(GetObjectCommand).resolves({
      Body: { transformToByteArray: async () => new Uint8Array([104, 105]) },
    });
    const buffer = await aws.readFragmentData('o1', 'f1');
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.toString()).toBe('hi');
  });

  test('readFragmentData() wraps errors', async () => {
    s3Mock.on(GetObjectCommand).rejects(new Error('NoSuchKey'));
    await expect(aws.readFragmentData('o1', 'f1')).rejects.toThrow(/unable to read/);
  });
});

describe('deleteFragment()', () => {
  test('deletes metadata and data together', async () => {
    ddbMock.on(DeleteCommand).resolves({});
    s3Mock.on(DeleteObjectCommand).resolves({});
    await aws.deleteFragment('o1', 'f1');
    expect(ddbMock.commandCalls(DeleteCommand)[0].args[0].input.Key).toEqual({
      ownerId: 'o1',
      id: 'f1',
    });
    expect(s3Mock.commandCalls(DeleteObjectCommand)[0].args[0].input.Key).toBe('o1/f1');
  });

  test('wraps errors', async () => {
    ddbMock.on(DeleteCommand).resolves({});
    s3Mock.on(DeleteObjectCommand).rejects(new Error('boom'));
    await expect(aws.deleteFragment('o1', 'f1')).rejects.toThrow(/unable to delete/);
  });
});
