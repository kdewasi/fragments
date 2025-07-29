# S3 Backend Deployment Guide

## Prerequisites

1. **AWS CLI configured** with appropriate credentials
2. **S3 Bucket created**: `kdewasi-fragments`
3. **IAM Roles created** for ECS task execution

## IAM Role Setup

### 1. Create ECS Task Execution Role

```bash
aws iam create-role --role-name ecsTaskExecutionRole --assume-role-policy-document file://trust-policy.json
aws iam attach-role-policy --role-name ecsTaskExecutionRole --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
```

### 2. Create S3 Access Role

```bash
aws iam create-role --role-name fragments-s3-role --assume-role-policy-document file://trust-policy.json
aws iam put-role-policy --role-name fragments-s3-role --policy-name s3-access --policy-document file://ecs-task-role.json
```

## ECS Deployment

### 1. Build and Push Docker Image

```bash
docker build -t fragments .
docker tag fragments:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/fragments:latest
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/fragments:latest
```

### 2. Update Task Definition

- Replace `ACCOUNT_ID` in `ecs-task-definition.json` with your AWS account ID
- Update the image URI to point to your ECR repository

### 3. Register Task Definition

```bash
aws ecs register-task-definition --cli-input-json file://ecs-task-definition.json
```

### 4. Update Service

```bash
aws ecs update-service --cluster your-cluster --service fragments --task-definition fragments:1
```

## Environment Variables

### Local Development

```bash
export FRAGMENTS_BACKEND=s3
export AWS_S3_BUCKET_NAME=fragments
export AWS_S3_ENDPOINT_URL=http://localhost:4566
```

### Production

```bash
export FRAGMENTS_BACKEND=s3
export AWS_S3_BUCKET_NAME=kdewasi-fragments
export AWS_REGION=us-east-1
```

## Testing

### Local Testing

```bash
# Start LocalStack
docker-compose up -d

# Setup local S3
./scripts/local-aws-setup.sh

# Test S3 backend
node test-s3.js
```

### Production Testing

```bash
# Test with real AWS S3
export FRAGMENTS_BACKEND=s3
export AWS_S3_BUCKET_NAME=kdewasi-fragments
node test-s3.js
```
