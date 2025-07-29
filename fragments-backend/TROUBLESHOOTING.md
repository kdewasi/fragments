# Troubleshooting Integration Tests

## Common Issues with `npm run test:integration`

### Issue 1: Server Not Running

**Error**: Connection refused or timeout
**Solution**:

```bash
# Start the server first
docker-compose up -d
# Wait for server to be ready
sleep 10
# Then run integration tests
npm run test:integration
```

### Issue 2: LocalStack Not Running

**Error**: S3 bucket not found
**Solution**:

```bash
# Start LocalStack
docker-compose up -d localstack
# Setup local S3
./scripts/local-aws-setup.sh
# Start the fragments server
docker-compose up -d fragments
```

### Issue 3: Hurl Not Installed

**Error**: Command not found
**Solution**:

```bash
# Install hurl globally
npm install -g @orangeopensource/hurl
# Or use npx
npx hurl --test tests/integration/lab-9-s3.hurl
```

### Issue 4: Authentication Issues

**Error**: 401 Unauthorized
**Solution**:

- Check if the server is using the correct authentication
- Verify the Basic Auth credentials in the test file

### Issue 5: Environment Variables Not Set

**Error**: AWS_REGION not set
**Solution**:

```bash
# Set environment variables
export AWS_REGION=us-east-1
export AWS_S3_BUCKET_NAME=fragments
export AWS_S3_ENDPOINT_URL=http://localhost:4566
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_SESSION_TOKEN=test
```

## Step-by-Step Testing Process

### 1. Start All Services

```bash
cd fragments-backend
docker-compose up -d
```

### 2. Setup LocalStack

```bash
./scripts/local-aws-setup.sh
```

### 3. Test Individual Files

```bash
# Test health check first
npx hurl --test tests/integration/health-check.hurl

# Test the main S3 integration test
npx hurl --test tests/integration/lab-9-s3.hurl
```

### 4. Run All Integration Tests

```bash
npm run test:integration
```

## Debugging Commands

### Check Server Status

```bash
# Check if containers are running
docker-compose ps

# Check server logs
docker-compose logs fragments

# Check LocalStack logs
docker-compose logs localstack
```

### Check S3 Bucket

```bash
# List S3 buckets
aws --endpoint-url=http://localhost:4566 s3 ls

# List contents of fragments bucket
aws --endpoint-url=http://localhost:4566 s3 ls s3://fragments
```

### Test API Manually

```bash
# Test health endpoint
curl http://localhost:8080/

# Test fragments endpoint
curl -X POST http://localhost:8080/v1/fragments \
  -H "Authorization: Basic a2Rld2FzaUBteXNlbmVjYS5jYTp0ZXN0" \
  -H "Content-Type: text/plain" \
  -d "Hello S3!"
```

## Expected Output

When everything is working correctly, you should see:

```
tests/integration/lab-9-s3.hurl: Success (4 request(s) in XXX ms)
--------------------------------------------------------------------------------
Executed files:    1
Executed requests: 4 (XX.X/s)
Succeeded files:   1 (100.0%)
Failed files:      0 (0.0%)
Duration:          XXX ms
```

## Common Error Messages

- **"Connection refused"**: Server not running
- **"NoSuchBucket"**: LocalStack S3 bucket not created
- **"401 Unauthorized"**: Authentication issue
- **"404 Not Found"**: Endpoint not found or fragment deleted
- **"500 Internal Server Error"**: Server error, check logs
