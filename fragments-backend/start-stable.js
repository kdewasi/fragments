#!/usr/bin/env node

/**
 * Stable startup script for Fragments Backend
 * This script ensures proper environment configuration and prevents issues
 * that occur after a few hours of running the project.
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

console.log('🚀 Starting Fragments Backend with stable configuration...');

// Load environment variables from .env file
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  console.log('✅ Loading environment variables from .env file');
  dotenv.config({ path: envPath });
} else {
  console.log('⚠️  No .env file found, using default configuration');
}

// Set default environment variables if not present
const defaults = {
  PORT: '8080',
  LOG_LEVEL: 'debug',
  HTPASSWD_FILE: 'tests/.htpasswd',
  AWS_REGION: 'us-east-1',
  AWS_S3_BUCKET_NAME: 'fragments',
  AWS_DYNAMODB_TABLE_NAME: 'fragments',
  NODE_ENV: 'development',
};

// Apply defaults
Object.entries(defaults).forEach(([key, value]) => {
  if (!process.env[key]) {
    process.env[key] = value;
    console.log(`🔧 Set default ${key}=${value}`);
  }
});

// Ensure we're using Basic Auth for development
if (!process.env.AWS_COGNITO_POOL_ID && !process.env.AWS_COGNITO_CLIENT_ID) {
  console.log('🔐 Using Basic Auth for development (more stable)');
} else {
  console.log('🔐 Using Cognito for authentication');
}

// Validate critical environment variables
const required = ['HTPASSWD_FILE', 'AWS_REGION'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

console.log('✅ Environment configuration validated');
console.log(`🌍 Server will start on port ${process.env.PORT}`);
console.log(`📝 Log level: ${process.env.LOG_LEVEL}`);
console.log(`🔐 Auth method: ${process.env.HTPASSWD_FILE ? 'Basic Auth' : 'Cognito'}`);

// Start the application
console.log('🚀 Starting application...');
require('./src/index.js');
