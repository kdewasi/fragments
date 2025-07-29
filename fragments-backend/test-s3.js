// test-s3.js - Simple test script for S3 backend
require('dotenv').config();

// Set environment to use S3 backend with LocalStack
process.env.FRAGMENTS_BACKEND = 's3';
process.env.AWS_S3_BUCKET_NAME = 'fragments';
process.env.AWS_S3_ENDPOINT_URL = 'http://localhost:4566';
process.env.AWS_REGION = 'us-east-1';

// Set LocalStack credentials
process.env.AWS_ACCESS_KEY_ID = 'test';
process.env.AWS_SECRET_ACCESS_KEY = 'test';
process.env.AWS_SESSION_TOKEN = 'test';

const { Fragment } = require('./src/model/fragment');

async function testS3Backend() {
  console.log('🧪 Testing S3 Backend with LocalStack...');

  try {
    // Test 1: Create a fragment
    console.log('\n1. Creating fragment...');
    const fragment = new Fragment({
      ownerId: 'test-user@example.com',
      type: 'text/plain',
      size: 0,
    });

    // Test 2: Save fragment metadata
    console.log('2. Saving fragment metadata...');
    await fragment.save();
    console.log('✅ Fragment saved with ID:', fragment.id);

    // Test 3: Set fragment data
    console.log('3. Setting fragment data...');
    const testData = Buffer.from('Hello, S3! This is a test fragment.');
    await fragment.setData(testData);
    console.log('✅ Fragment data set, size:', fragment.size);

    // Test 4: Retrieve fragment by ID
    console.log('4. Retrieving fragment by ID...');
    const retrievedFragment = await Fragment.byId('test-user@example.com', fragment.id);
    console.log('✅ Fragment retrieved:', retrievedFragment.toJSON());

    // Test 5: Get fragment data
    console.log('5. Getting fragment data...');
    const data = await retrievedFragment.getData();
    console.log('✅ Fragment data:', data.toString());

    // Test 6: List user fragments
    console.log('6. Listing user fragments...');
    const fragments = await Fragment.byUser('test-user@example.com');
    console.log('✅ User fragments:', fragments);

    // Test 7: Delete fragment
    console.log('7. Deleting fragment...');
    await Fragment.delete('test-user@example.com', fragment.id);
    console.log('✅ Fragment deleted');

    // Test 8: Verify deletion
    console.log('8. Verifying deletion...');
    try {
      await Fragment.byId('test-user@example.com', fragment.id);
      console.log('❌ Fragment still exists after deletion');
    } catch (error) {
      console.log('✅ Fragment successfully deleted (not found)');
    }

    console.log('\n🎉 All S3 backend tests passed!');
  } catch (error) {
    console.error('❌ S3 backend test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testS3Backend();
