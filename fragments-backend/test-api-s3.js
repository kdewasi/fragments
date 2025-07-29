// test-api-s3.js - Test API endpoints with S3 backend
const http = require('http');

// Test configuration
const config = {
  host: 'localhost',
  port: 8080,
  auth: 'Basic a2Rld2FzaUBteXNlbmVjYS5jYTp0ZXN0',
};

function makeRequest(method, path, data = null, contentType = null, useAuth = true) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: config.host,
      port: config.port,
      path: path,
      method: method,
      headers: {},
    };

    if (useAuth) {
      options.headers['Authorization'] = config.auth;
    }

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

async function testS3API() {
  console.log('🧪 Testing API with S3 Backend...\n');

  try {
    // Test 1: Health check (no auth required)
    console.log('1. Testing health check...');
    const health = await makeRequest('GET', '/v1/health', null, null, false);
    console.log(`✅ Health check: ${health.status} - ${JSON.stringify(health.body)}`);

    // Test 2: Create a fragment
    console.log('\n2. Creating fragment...');
    const testData = 'Hello, S3 API! This is a test fragment.';
    const createResponse = await makeRequest('POST', '/v1/fragments', testData, 'text/plain');
    console.log(`✅ Create fragment: ${createResponse.status}`);

    if (createResponse.status === 201) {
      const fragmentId = createResponse.body.data.fragment.id;
      console.log(`   Fragment ID: ${fragmentId}`);

      // Test 3: Get fragment metadata
      console.log('\n3. Getting fragment metadata...');
      const getResponse = await makeRequest('GET', `/v1/fragments/${fragmentId}`);
      console.log(`✅ Get fragment: ${getResponse.status}`);
      console.log(`   Fragment: ${JSON.stringify(getResponse.body.data.fragment)}`);

      // Test 4: Get fragment data
      console.log('\n4. Getting fragment data...');
      const dataResponse = await makeRequest('GET', `/v1/fragments/${fragmentId}/data`);
      console.log(`✅ Get fragment data: ${dataResponse.status}`);
      console.log(`   Data: ${dataResponse.body}`);

      // Test 5: List fragments
      console.log('\n5. Listing fragments...');
      const listResponse = await makeRequest('GET', '/v1/fragments');
      console.log(`✅ List fragments: ${listResponse.status}`);
      console.log(`   Fragments: ${JSON.stringify(listResponse.body.data.fragments)}`);

      // Test 6: Delete fragment
      console.log('\n6. Deleting fragment...');
      const deleteResponse = await makeRequest('DELETE', `/v1/fragments/${fragmentId}`);
      console.log(`✅ Delete fragment: ${deleteResponse.status}`);

      // Test 7: Verify deletion
      console.log('\n7. Verifying deletion...');
      const verifyResponse = await makeRequest('GET', `/v1/fragments/${fragmentId}`);
      console.log(`✅ Verify deletion: ${verifyResponse.status} (should be 404)`);
    }

    console.log('\n🎉 All API tests completed!');
  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
}

// Run the test
testS3API();
