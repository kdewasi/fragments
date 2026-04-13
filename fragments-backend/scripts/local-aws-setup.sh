#!/bin/sh

# Setup steps for working with LocalStack and DynamoDB local instead of AWS.
# Assumes aws cli is installed and LocalStack and DynamoDB local are running.

# ── Configuration ──────────────────────────────────────────────────────────
LOCALSTACK_URL="${LOCALSTACK_URL:-http://localhost:4566}"
DYNAMODB_URL="${DYNAMODB_URL:-http://localhost:8000}"
S3_BUCKET="${AWS_S3_BUCKET_NAME:-fragments}"
DYNAMO_TABLE="${AWS_DYNAMODB_TABLE_NAME:-fragments}"
TIMEOUT_SECONDS=60

# ── AWS credentials for LocalStack ─────────────────────────────────────────
echo "Setting AWS environment variables for LocalStack"
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_SESSION_TOKEN=test
export AWS_DEFAULT_REGION=us-east-1

# ── Wait for LocalStack S3 with timeout ────────────────────────────────────
echo "Waiting for LocalStack S3 at ${LOCALSTACK_URL} (timeout: ${TIMEOUT_SECONDS}s)..."
ELAPSED=0
until curl --silent --max-time 5 "${LOCALSTACK_URL}/_localstack/health" | grep '"s3": "\(running\|available\)"' > /dev/null 2>&1; do
  if [ "$ELAPSED" -ge "$TIMEOUT_SECONDS" ]; then
    echo ""
    echo "ERROR: LocalStack S3 failed to become ready within ${TIMEOUT_SECONDS}s"
    echo ""
    echo "── Diagnostic: LocalStack health endpoint ──"
    curl --silent --max-time 5 "${LOCALSTACK_URL}/_localstack/health" || echo "(no response)"
    echo ""
    echo "── Diagnostic: Docker container status ──"
    docker ps -a --filter "name=localstack" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "(docker not available)"
    echo ""
    echo "── Diagnostic: LocalStack container logs (last 50 lines) ──"
    LOCALSTACK_CONTAINER=$(docker ps -aq --filter "name=localstack" 2>/dev/null | head -1)
    if [ -n "$LOCALSTACK_CONTAINER" ]; then
      docker logs --tail 50 "$LOCALSTACK_CONTAINER" 2>&1
    else
      echo "(no localstack container found)"
    fi
    exit 1
  fi
  sleep 2
  ELAPSED=$((ELAPSED + 2))
  printf "."
done
echo ""
echo "LocalStack S3 ready (took ~${ELAPSED}s)"

# ── Wait for DynamoDB local with timeout ───────────────────────────────────
echo "Waiting for DynamoDB local at ${DYNAMODB_URL}..."
ELAPSED=0
until curl --silent --max-time 5 "${DYNAMODB_URL}" > /dev/null 2>&1; do
  if [ "$ELAPSED" -ge "$TIMEOUT_SECONDS" ]; then
    echo ""
    echo "ERROR: DynamoDB local failed to become ready within ${TIMEOUT_SECONDS}s"
    echo ""
    echo "── Diagnostic: Docker container status ──"
    docker ps -a --filter "name=dynamodb" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "(docker not available)"
    DYNAMO_CONTAINER=$(docker ps -aq --filter "name=dynamodb" 2>/dev/null | head -1)
    if [ -n "$DYNAMO_CONTAINER" ]; then
      echo "── Diagnostic: DynamoDB container logs (last 50 lines) ──"
      docker logs --tail 50 "$DYNAMO_CONTAINER" 2>&1
    fi
    exit 1
  fi
  sleep 2
  ELAPSED=$((ELAPSED + 2))
  printf "."
done
echo ""
echo "DynamoDB local ready (took ~${ELAPSED}s)"

# ── Create S3 bucket ──────────────────────────────────────────────────────
echo "Creating LocalStack S3 bucket: ${S3_BUCKET}"
aws --endpoint-url="${LOCALSTACK_URL}" s3api create-bucket --bucket "${S3_BUCKET}" 2>&1 || true

# ── Create DynamoDB table ─────────────────────────────────────────────────
echo "Creating DynamoDB table: ${DYNAMO_TABLE}"
aws --endpoint-url="${DYNAMODB_URL}" \
  dynamodb create-table \
    --table-name "${DYNAMO_TABLE}" \
    --attribute-definitions \
        AttributeName=ownerId,AttributeType=S \
        AttributeName=id,AttributeType=S \
    --key-schema \
        AttributeName=ownerId,KeyType=HASH \
        AttributeName=id,KeyType=RANGE \
    --provisioned-throughput \
        ReadCapacityUnits=10,WriteCapacityUnits=5 \
  2>&1 || true

# Wait for table to be active
echo "Waiting for DynamoDB table to be active..."
aws --endpoint-url="${DYNAMODB_URL}" dynamodb wait table-exists --table-name "${DYNAMO_TABLE}"

echo "Local AWS resources ready."
