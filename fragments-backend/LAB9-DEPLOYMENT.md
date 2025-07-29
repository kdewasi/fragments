# Lab 9 Deployment Guide

## Prerequisites ✅

- [x] AWS CLI configured
- [x] S3 bucket `kdewasi-fragments` created
- [x] IAM role `LabRole` with S3 permissions
- [x] ECS cluster running

## Step 1: Local Testing

### Run Complete Test Suite

```bash
# Make the setup script executable
chmod +x setup-lab9.sh

# Run the complete setup and testing
./setup-lab9.sh
```

### Manual Testing (if needed)

```bash
# Start containers
docker-compose up -d

# Setup local S3
./scripts/local-aws-setup.sh

# Test S3 backend
node test-lab9-complete.js

# Run integration tests
npm run test:integration
```

## Step 2: Update ECS Task Definition

### 1. Update the task definition

- Replace `ACCOUNT_ID` in `ecs-task-definition-lab9.json` with your AWS account ID
- Update the image URI to point to your ECR repository

### 2. Register the new task definition

```bash
aws ecs register-task-definition --cli-input-json file://ecs-task-definition-lab9.json
```

### 3. Update your ECS service

```bash
aws ecs update-service --cluster your-cluster-name --service fragments --task-definition fragments:latest
```

## Step 3: Deploy to Production

### 1. Update version

```bash
npm version 0.9.0
```

### 2. Build and push Docker image

```bash
docker build -t fragments .
docker tag fragments:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/fragments:latest
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/fragments:latest
```

### 3. Push to GitHub

```bash
git add .
git commit -m "Lab 9: S3 integration complete"
git push origin main --tags
```

## Step 4: Test Production Deployment

### 1. Update fragments-ui

Update the API URL in `fragments-ui/src/api.js` to point to your ECS deployment.

### 2. Test fragment creation

- Open the fragments-ui
- Create a new fragment
- Verify it appears in the AWS S3 console

## Step 5: Submission Requirements

### Screenshots Required:

1. ✅ Integration test passing with LocalStack
2. ✅ fragments-ui creating fragment using ECS deployment
3. ✅ AWS S3 Console showing fragment object
4. [OPTIONAL] MinIO console screenshot

### Files to Submit:

1. ✅ Link to `tests/integration/lab-9-s3.hurl` in GitHub repo
2. ✅ All implementation files in `src/model/data/aws/`
3. ✅ Updated `src/model/data/index.js`

## Verification Checklist

- [ ] LocalStack testing passes
- [ ] Integration tests pass
- [ ] Unit tests pass (69/69)
- [ ] ECS deployment successful
- [ ] S3 integration working in production
- [ ] fragments-ui can create fragments
- [ ] Fragments appear in S3 console

## Troubleshooting

### If LocalStack tests fail:

1. Check if containers are running: `docker-compose ps`
2. Restart containers: `docker-compose down && docker-compose up -d`
3. Recreate S3 bucket: `aws --endpoint-url=http://localhost:4566 s3api create-bucket --bucket fragments`

### If ECS deployment fails:

1. Check IAM role permissions
2. Verify task definition is correct
3. Check CloudWatch logs for errors

### If S3 integration fails:

1. Verify `AWS_REGION` is set
2. Check `AWS_S3_BUCKET_NAME` is correct
3. Ensure IAM role has S3 permissions
