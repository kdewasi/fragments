#!/bin/bash

# Deploy frontend to S3 static website
BUCKET_NAME="fragments-ui-static"

echo "🚀 Deploying Frontend to S3 Static Website..."

# Build the frontend
echo "📦 Building frontend..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Build completed"

# Create S3 bucket if it doesn't exist
echo "🪣 Creating S3 bucket: $BUCKET_NAME"
aws s3 mb s3://$BUCKET_NAME --region us-east-1 2>/dev/null

# Configure bucket for static website hosting
echo "🌐 Configuring static website hosting..."
aws s3 website s3://$BUCKET_NAME --index-document index.html --error-document index.html

# Upload files to S3
echo "📤 Uploading files to S3..."
aws s3 sync dist/ s3://$BUCKET_NAME --delete

if [ $? -eq 0 ]; then
    echo "✅ Upload completed"
    
    # Get the website URL
    WEBSITE_URL=$(aws s3api get-bucket-website --bucket $BUCKET_NAME --query 'WebsiteEndpoint' --output text)
    echo "🌐 Frontend deployed to: http://$WEBSITE_URL"
    echo "🔗 You can now test your production backend!"
else
    echo "❌ Upload failed"
    exit 1
fi
