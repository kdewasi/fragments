#!/bin/bash

# Lab 9 Complete Setup and Testing Script
echo "🚀 Starting Lab 9 Complete Setup and Testing..."

# Step 1: Start Docker containers
echo "📦 Starting Docker containers..."
docker-compose up -d

# Wait for containers to be ready
echo "⏳ Waiting for containers to be ready..."
sleep 10

# Step 2: Setup local AWS environment
echo "🔧 Setting up local AWS environment..."
./scripts/local-aws-setup.sh

# Step 3: Test S3 backend directly
echo "🧪 Testing S3 backend implementation..."
node test-lab9-complete.js

# Step 4: Run integration tests
echo "🔍 Running integration tests..."
npm run test:integration

# Step 5: Run unit tests
echo "📋 Running unit tests..."
npm test

echo "✅ Lab 9 setup and testing complete!"
echo ""
echo "📊 Next steps:"
echo "1. Check the test results above"
echo "2. If all tests pass, you're ready for submission!"
echo "3. Update your ECS task definition with IAM roles"
echo "4. Deploy to AWS and test with real S3"
