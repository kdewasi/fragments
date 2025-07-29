// src/model/data/s3/index.js
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} = require('@aws-sdk/client-s3');

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.AWS_S3_ENDPOINT_URL, // For LocalStack
  forcePathStyle: true, // Required for LocalStack
});

const bucketName = process.env.AWS_S3_BUCKET_NAME || 'fragments';

// Helper function to create S3 keys
function createKey(ownerId, id, type = 'data') {
  return `${ownerId}/${id}/${type}`;
}

// Write a fragment's metadata to S3. Returns a Promise<void>
async function writeFragment(fragment) {
  const key = createKey(fragment.ownerId, fragment.id, 'metadata');
  const serialized = JSON.stringify(fragment);

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: serialized,
    ContentType: 'application/json',
  });

  await s3Client.send(command);
}

// Read a fragment's metadata from S3. Returns a Promise<Object>
async function readFragment(ownerId, id) {
  const key = createKey(ownerId, id, 'metadata');

  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const response = await s3Client.send(command);
    const serialized = await response.Body.transformToString();
    return JSON.parse(serialized);
  } catch (error) {
    if (error.name === 'NoSuchKey') {
      return null;
    }
    throw error;
  }
}

// Write a fragment's data buffer to S3. Returns a Promise
async function writeFragmentData(ownerId, id, buffer) {
  const key = createKey(ownerId, id, 'data');

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
  });

  await s3Client.send(command);
}

// Read a fragment's data from S3. Returns a Promise<Buffer>
async function readFragmentData(ownerId, id) {
  const key = createKey(ownerId, id, 'data');

  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const response = await s3Client.send(command);
    return Buffer.from(await response.Body.transformToByteArray());
  } catch (error) {
    if (error.name === 'NoSuchKey') {
      return null;
    }
    throw error;
  }
}

// Get a list of fragment ids/objects for the given user from S3. Returns a Promise
async function listFragments(ownerId, expand = false) {
  const prefix = `${ownerId}/`;

  try {
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
      Delimiter: '/',
    });

    const response = await s3Client.send(command);

    if (!response.Contents) return [];

    // Filter for metadata files and extract fragment IDs
    const fragmentIds = [];
    const fragmentPromises = [];

    for (const object of response.Contents) {
      if (object.Key.endsWith('/metadata')) {
        const id = object.Key.split('/')[1]; // Extract ID from key
        fragmentIds.push(id);

        if (expand) {
          fragmentPromises.push(readFragment(ownerId, id));
        }
      }
    }

    if (expand) {
      return await Promise.all(fragmentPromises);
    }

    return fragmentIds;
  } catch (error) {
    console.error('Error listing fragments:', error);
    return [];
  }
}

// Delete a fragment's metadata and data from S3. Returns a Promise
async function deleteFragment(ownerId, id) {
  const metadataKey = createKey(ownerId, id, 'metadata');
  const dataKey = createKey(ownerId, id, 'data');

  const deletePromises = [
    s3Client.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: metadataKey,
      })
    ),
    s3Client.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: dataKey,
      })
    ),
  ];

  await Promise.all(deletePromises);
}

module.exports = {
  listFragments,
  writeFragment,
  readFragment,
  writeFragmentData,
  readFragmentData,
  deleteFragment,
};
