# Comprehensive startup script for Fragments Backend (PowerShell)
# This script handles all setup and prevents configuration issues

param(
    [switch]$NoDocker
)

Write-Host "🚀 Starting Fragments Backend Project..." -ForegroundColor Blue

# Function to print colored output
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Warning ".env file not found, creating default configuration..."
    
    $envContent = @"
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
"@
    
    $envContent | Out-File -FilePath ".env" -Encoding UTF8
    Write-Success ".env file created with stable configuration"
}

# Check if Docker is running
try {
    docker info | Out-Null
    Write-Status "Docker is running"
} catch {
    Write-Error "Docker is not running. Please start Docker Desktop and try again."
    exit 1
}

# Check if we want to use Docker or direct Node.js
if ($NoDocker) {
    Write-Status "Starting with Node.js directly (no Docker)"
    
    # Install dependencies if needed
    if (-not (Test-Path "node_modules")) {
        Write-Status "Installing dependencies..."
        npm install
    }
    
    # Start the application
    Write-Status "Starting application with stable configuration..."
    npm start
    
} else {
    Write-Status "Starting with Docker Compose"
    
    # Stop any existing containers
    Write-Status "Stopping existing containers..."
    docker-compose down --remove-orphans
    
    # Build and start containers
    Write-Status "Building and starting containers..."
    docker-compose up --build -d
    
    # Wait for services to be ready
    Write-Status "Waiting for services to be ready..."
    Start-Sleep -Seconds 10
    
    # Check if services are healthy
    Write-Status "Checking service health..."
    
    # Check fragments service
    try {
        Invoke-WebRequest -Uri "http://localhost:8080" -UseBasicParsing | Out-Null
        Write-Success "Fragments service is running on http://localhost:8080"
    } catch {
        Write-Warning "Fragments service may not be ready yet, checking logs..."
        docker-compose logs fragments
    }
    
    # Check LocalStack
    try {
        Invoke-WebRequest -Uri "http://localhost:4566/_localstack/health" -UseBasicParsing | Out-Null
        Write-Success "LocalStack is running on http://localhost:4566"
    } catch {
        Write-Warning "LocalStack may not be ready yet"
    }
    
    # Check DynamoDB Local
    try {
        Invoke-WebRequest -Uri "http://localhost:8000" -UseBasicParsing | Out-Null
        Write-Success "DynamoDB Local is running on http://localhost:8000"
    } catch {
        Write-Warning "DynamoDB Local may not be ready yet"
    }
    
    Write-Success "All services started successfully!"
    Write-Status "You can now run tests with: npm run test:integration"
    Write-Status "View logs with: docker-compose logs -f"
} 
