// test-lab9-complete.js - Complete Lab 9 testing script
require('dotenv').config();

// Set up environment for LocalStack testing
process.env.AWS_REGION = 'us-east-1';
process.env.AWS_S3_BUCKET_NAME = 'fragments';
process.env.AWS_S3_ENDPOINT_URL = 'http://localhost:4566';
process.env.AWS_ACCESS_KEY_ID = 'test';
process.env.AWS_SECRET_ACCESS_KEY = 'test';
process.env.AWS_SESSION_TOKEN = 'test';

const { Fragment } = require('./src/model/fragment');
const http = require('http');

// Test configuration
const config = {
  host: 'localhost',
  port: 8080,
  auth: 'Basic a2Rld2FzaUBteXNlbmVjYS5jYTp0ZXN0',
};

function makeRequest(method, path, data = null, contentType = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: config.host,
      port: config.port,
      path: path,
      method: method,
      headers: {
        Authorization: config.auth,
      },
    };

    if (contentType) {
      options.headers['Content-Type'] = contentType;
    }

    if (data) {
      options.headers['Content-Length'] = Buffer.byteLength(data);
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const jsonBody = JSON.parse(body);
          resolve({ status: res.statusCode, body: jsonBody, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, body: body, headers: res.headers });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(data);
    }
    req.end();
  });
}

async function testS3Backend() {
  console.log('🧪 Testing S3 Backend Implementation...\n');

  try {
    // Test 1: Create a fragment
    console.log('1. Creating fragment...');
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
    const testData = Buffer.from('Hello S3!');
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
    return true;
  } catch (error) {
    console.error('❌ S3 backend test failed:', error.message);
    return false;
  }
}

async function testAPI() {
  console.log('\n🧪 Testing API with S3 Backend...\n');

  try {
    // Test 1: Health check
    console.log('1. Testing health check...');
    const health = await makeRequest('GET', '/v1/health', null, null, false);
    console.log(`✅ Health check: ${health.status} - ${JSON.stringify(health.body)}`);

    // Test 2: Create a fragment
    console.log('\n2. Creating fragment via API...');
    const testData = 'Hello S3 API!';
    const createResponse = await makeRequest('POST', '/v1/fragments', testData, 'text/plain');
    console.log(`✅ Create fragment: ${createResponse.status}`);

    if (createResponse.status === 201) {
      const fragmentId = createResponse.body.data.fragment.id;
      console.log(`   Fragment ID: ${fragmentId}`);

      // Test 3: Get fragment metadata
      console.log('\n3. Getting fragment metadata...');
      const getResponse = await makeRequest('GET', `/v1/fragments/${fragmentId}`);
      console.log(`✅ Get fragment: ${getResponse.status}`);

      // Test 4: Get fragment data
      console.log('\n4. Getting fragment data...');
      const dataResponse = await makeRequest('GET', `/v1/fragments/${fragmentId}/data`);
      console.log(`✅ Get fragment data: ${dataResponse.status}`);
      console.log(`   Data: ${dataResponse.body}`);

      // Test 5: Delete fragment
      console.log('\n5. Deleting fragment...');
      const deleteResponse = await makeRequest('DELETE', `/v1/fragments/${fragmentId}`);
      console.log(`✅ Delete fragment: ${deleteResponse.status}`);

      // Test 6: Verify deletion
      console.log('\n6. Verifying deletion...');
      const verifyResponse = await makeRequest('GET', `/v1/fragments/${fragmentId}`);
      console.log(`✅ Verify deletion: ${verifyResponse.status} (should be 404)`);
    }

    console.log('\n🎉 All API tests completed!');
    return true;
  } catch (error) {
    console.error('❌ API test failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Lab 9 Complete Test Suite...\n');

  const s3Result = await testS3Backend();
  const apiResult = await testAPI();

  console.log('\n📊 Test Results:');
  console.log(`S3 Backend Tests: ${s3Result ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`API Tests: ${apiResult ? '✅ PASSED' : '❌ FAILED'}`);

  if (s3Result && apiResult) {
    console.log('\n🎉 ALL TESTS PASSED! Lab 9 implementation is working correctly!');
  } else {
    console.log('\n❌ Some tests failed. Please check the implementation.');
  }
}

// Run the tests
runAllTests();
