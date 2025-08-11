# start-project.ps1
# This file provides stable configuration for local development
# It prevents configuration issues that occur after a few hours

param(
    [switch]$NoDocker
)

# Import color functions
function Write-Status { Write-Host "🔄 $($args[0])" -ForegroundColor Cyan }
function Write-Success { Write-Host "✅ $($args[0])" -ForegroundColor Green }
function Write-Warning { Write-Host "⚠️  $($args[0])" -ForegroundColor Yellow }
function Write-Error { Write-Host "❌ $($args[0])" -ForegroundColor Red }

Write-Host "🚀 Starting Fragments Backend with stable configuration..." -ForegroundColor Green
Write-Host ""

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
    docker compose down --remove-orphans
    
    # Build and start containers
    Write-Status "Building and starting containers..."
    docker compose up --build -d
    
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
        Write-Warning "Fragments service is not responding yet, waiting..."
        Start-Sleep -Seconds 10
        
        try {
            Invoke-WebRequest -Uri "http://localhost:8080" -UseBasicParsing | Out-Null
            Write-Success "Fragments service is now running on http://localhost:8080"
        } catch {
            Write-Error "Fragments service failed to start. Check logs with: docker compose logs fragments"
            exit 1
        }
    }
    
    # Check LocalStack
    try {
        $localstackHealth = Invoke-WebRequest -Uri "http://localhost:4566/_localstack/health" -UseBasicParsing
        if ($localstackHealth.Content -match '"s3": "running"') {
            Write-Success "LocalStack S3 is running on http://localhost:4566"
        } else {
            Write-Warning "LocalStack S3 is not ready yet"
        }
    } catch {
        Write-Warning "LocalStack is not responding yet"
    }
    
    # Check DynamoDB Local
    try {
        Invoke-WebRequest -Uri "http://localhost:8000" -UseBasicParsing | Out-Null
        Write-Success "DynamoDB Local is running on http://localhost:8000"
    } catch {
        Write-Warning "DynamoDB Local is not responding yet"
    }
    
    Write-Host ""
    Write-Success "🎉 All services started successfully!"
    Write-Host ""
    Write-Host "📋 Service URLs:" -ForegroundColor Cyan
    Write-Host "   • Fragments API: http://localhost:8080" -ForegroundColor White
    Write-Host "   • LocalStack S3: http://localhost:4566" -ForegroundColor White
    Write-Host "   • DynamoDB Local: http://localhost:8000" -ForegroundColor White
    Write-Host ""
    Write-Host "🔧 Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Run: ./scripts/local-aws-setup.sh" -ForegroundColor White
    Write-Host "   2. Run: npm run test:integration" -ForegroundColor White
    Write-Host ""
    Write-Host "📊 Check status: docker ps" -ForegroundColor Cyan
    Write-Host "📝 View logs: docker compose logs" -ForegroundColor Cyan
} 
