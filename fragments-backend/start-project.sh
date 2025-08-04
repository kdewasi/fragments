#!/bin/bash

# Comprehensive startup script for Fragments Backend
# This script handles all setup and prevents configuration issues

set -e  # Exit on any error

echo "🚀 Starting Fragments Backend Project..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found, creating default configuration..."
    cat > .env << 'EOF'
# Environment Configuration for Fragments Backend
# This file prevents configuration issues that occur after a few hours

# ===========================================
# AUTHENTICATION CONFIGURATION
# ===========================================
# Use Basic Auth for development (prevents Cognito issues)
HTPASSWD_FILE=tests/.htpasswd

# ===========================================
# SERVER CONFIGURATION
# ===========================================
PORT=8080
LOG_LEVEL=debug
API_URL=http://localhost:8080

# ===========================================
# AWS CONFIGURATION
# ===========================================
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=fragments
AWS_DYNAMODB_TABLE_NAME=fragments

# ===========================================
# LOCALSTACK CONFIGURATION (for local development)
# ===========================================
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_SESSION_TOKEN=test
AWS_S3_ENDPOINT_URL=http://localhost:4566
AWS_DYNAMODB_ENDPOINT_URL=http://localhost:8000

# ===========================================
# COGNITO CONFIGURATION (commented out to force Basic Auth)
# ===========================================
# Uncomment these lines if you want to use Cognito instead of Basic Auth
# AWS_COGNITO_POOL_ID=us-east-1_t6yugxIK2
# AWS_COGNITO_CLIENT_ID=7dbkmbrk3lrcv3202ln86do2u0

# ===========================================
# NODE ENVIRONMENT
# ===========================================
NODE_ENV=development
EOF
    print_success ".env file created with stable configuration"
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker Desktop and try again."
    exit 1
fi

print_status "Docker is running"

# Check if we want to use Docker or direct Node.js
if [ "$1" = "--no-docker" ]; then
    print_status "Starting with Node.js directly (no Docker)"
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        print_status "Installing dependencies..."
        npm install
    fi
    
    # Start the application
    print_status "Starting application with stable configuration..."
    npm start
    
else
    print_status "Starting with Docker Compose"
    
    # Stop any existing containers
    print_status "Stopping existing containers..."
    docker-compose down --remove-orphans
    
    # Build and start containers
    print_status "Building and starting containers..."
    docker-compose up --build -d
    
    # Wait for services to be ready
    print_status "Waiting for services to be ready..."
    sleep 10
    
    # Check if services are healthy
    print_status "Checking service health..."
    
    # Check fragments service
    if curl -f http://localhost:8080 > /dev/null 2>&1; then
        print_success "Fragments service is running on http://localhost:8080"
    else
        print_warning "Fragments service may not be ready yet, checking logs..."
        docker-compose logs fragments
    fi
    
    # Check LocalStack
    if curl -f http://localhost:4566/_localstack/health > /dev/null 2>&1; then
        print_success "LocalStack is running on http://localhost:4566"
    else
        print_warning "LocalStack may not be ready yet"
    fi
    
    # Check DynamoDB Local
    if curl -f http://localhost:8000 > /dev/null 2>&1; then
        print_success "DynamoDB Local is running on http://localhost:8000"
    else
        print_warning "DynamoDB Local may not be ready yet"
    fi
    
    print_success "All services started successfully!"
    print_status "You can now run tests with: npm run test:integration"
    print_status "View logs with: docker-compose logs -f"
fi 
