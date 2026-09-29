# Deploying Fragments to AWS

The CD workflow (`.github/workflows/cd.yml`) builds the backend image, pushes it
to Amazon ECR and updates an ECS Fargate service every time a `v*` tag is
pushed. This document lists the one-time setup it relies on. Replace the
placeholder values (`<...>`) with your own; the IAM policy templates in
`fragments-backend/deploy/iam/` use `${VAR}` placeholders you can fill with `envsubst`.

## 1. AWS resources

Everything below assumes one region (for example `us-east-1`) and one account
id (`<ACCOUNT_ID>`).

**Storage**

```bash
aws s3api create-bucket --bucket <BUCKET> --region us-east-1
aws s3api put-public-access-block --bucket <BUCKET> \
  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
aws s3api put-bucket-encryption --bucket <BUCKET> \
  --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

aws dynamodb create-table --table-name <TABLE> \
  --attribute-definitions AttributeName=ownerId,AttributeType=S AttributeName=id,AttributeType=S \
  --key-schema AttributeName=ownerId,KeyType=HASH AttributeName=id,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST
```

**Container registry and logs**

```bash
aws ecr create-repository --repository-name fragments --image-scanning-configuration scanOnPush=true
aws logs create-log-group --log-group-name /ecs/fragments
```

**Cognito**

Create a user pool with email sign-in and an app client with:

- Authorization code grant, scopes `openid email profile`, no client secret (public SPA client)
- Callback URL `https://<UI_HOST>/callback` (and `http://localhost:1234/callback` for local use)
- Sign-out URL `https://<UI_HOST>`
- A Hosted UI domain

Note the pool id (`us-east-1_xxxxxxxxx`) and client id.

**IAM roles**

| Role                    | Trust policy                                   | Permissions                                                                 |
| ----------------------- | ---------------------------------------------- | --------------------------------------------------------------------------- |
| ECS task execution role | `deploy/iam/ecs-task-trust-policy.json`         | `AmazonECSTaskExecutionRolePolicy` + `logs:CreateLogGroup` on `/ecs/fragments` |
| ECS task role           | `deploy/iam/ecs-task-trust-policy.json`         | `deploy/iam/ecs-task-role-policy.json` (the bucket and table only)          |
| GitHub deploy role      | `deploy/iam/github-oidc-trust-policy.json`      | `deploy/iam/github-deploy-policy.json`                                      |

```bash
cd fragments-backend/deploy/iam
export AWS_ACCOUNT_ID=<ACCOUNT_ID> AWS_REGION=us-east-1 AWS_S3_BUCKET_NAME=<BUCKET> AWS_DYNAMODB_TABLE_NAME=<TABLE>

aws iam create-role --role-name fragments-task-execution --assume-role-policy-document file://ecs-task-trust-policy.json
aws iam attach-role-policy --role-name fragments-task-execution \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

aws iam create-role --role-name fragments-task --assume-role-policy-document file://ecs-task-trust-policy.json
envsubst < ecs-task-role-policy.json > /tmp/task-policy.json
aws iam put-role-policy --role-name fragments-task --policy-name fragments-data --policy-document file:///tmp/task-policy.json

# GitHub OIDC provider (once per account) and the deploy role
aws iam create-open-id-connect-provider --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com
export ECS_EXECUTION_ROLE_ARN=arn:aws:iam::$AWS_ACCOUNT_ID:role/fragments-task-execution
export ECS_TASK_ROLE_ARN=arn:aws:iam::$AWS_ACCOUNT_ID:role/fragments-task
envsubst < github-oidc-trust-policy.json > /tmp/gh-trust.json
envsubst < github-deploy-policy.json > /tmp/gh-policy.json
aws iam create-role --role-name fragments-github-deploy --assume-role-policy-document file:///tmp/gh-trust.json
aws iam put-role-policy --role-name fragments-github-deploy --policy-name fragments-deploy --policy-document file:///tmp/gh-policy.json
```

The OIDC trust policy only allows workflows running for tags `v*` of
`kdewasi/fragments`; edit the `sub` condition if you fork the repository.

**ECS**

Create a Fargate cluster, an Application Load Balancer with a target group on
port `8080` whose health check path is `/health`, and a service that uses the
`fragments` task family. Register the first task definition by hand:

```bash
cd fragments-backend
export ECR_IMAGE=<ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/fragments:latest \
       API_URL=https://<API_HOST> CORS_ORIGINS=https://<UI_HOST> \
       AWS_COGNITO_POOL_ID=<POOL_ID> AWS_COGNITO_CLIENT_ID=<CLIENT_ID>
envsubst < deploy/ecs-task-definition.json > /tmp/task-def.json
aws ecs register-task-definition --cli-input-json file:///tmp/task-def.json
aws ecs create-service --cluster <CLUSTER> --service-name <SERVICE> --task-definition fragments \
  --desired-count 1 --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[<SUBNETS>],securityGroups=[<SG>],assignPublicIp=ENABLED}" \
  --load-balancers targetGroupArn=<TG_ARN>,containerName=fragments,containerPort=8080
```

Put the ALB behind HTTPS (ACM certificate) so tokens are never sent in clear
text; the API sets `TRUST_PROXY=1` to read client IPs from `X-Forwarded-For`.

## 2. GitHub configuration

Repository → Settings → Secrets and variables → Actions.

**Variables** (all required by `cd.yml` unless noted):

| Variable                  | Example                                                              |
| ------------------------- | -------------------------------------------------------------------- |
| `AWS_REGION`              | `us-east-1`                                                          |
| `AWS_ROLE_TO_ASSUME`      | `arn:aws:iam::<ACCOUNT_ID>:role/fragments-github-deploy`             |
| `ECS_CLUSTER`             | `fragments-cluster`                                                  |
| `ECS_SERVICE`             | `fragments-service`                                                  |
| `ECS_EXECUTION_ROLE_ARN`  | `arn:aws:iam::<ACCOUNT_ID>:role/fragments-task-execution`            |
| `ECS_TASK_ROLE_ARN`       | `arn:aws:iam::<ACCOUNT_ID>:role/fragments-task`                      |
| `AWS_S3_BUCKET_NAME`      | `<BUCKET>`                                                           |
| `AWS_DYNAMODB_TABLE_NAME` | `<TABLE>`                                                            |
| `AWS_COGNITO_POOL_ID`     | `us-east-1_xxxxxxxxx`                                                |
| `AWS_COGNITO_CLIENT_ID`   | `xxxxxxxxxxxxxxxxxxxxxxxxxx`                                         |
| `API_URL`                 | `https://<API_HOST>`                                                 |
| `CORS_ORIGINS`            | `https://<UI_HOST>` (optional; empty allows any origin)              |

**Secrets**:

| Secret                                                          | Used by                                                    |
| --------------------------------------------------------------- | ---------------------------------------------------------- |
| `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`                          | `ci.yml` image publish on pushes to `main`                 |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`| Only if you cannot use OIDC (leave `AWS_ROLE_TO_ASSUME` empty) |

Creating a `production` environment (Settings → Environments) lets you require
a manual approval before each deployment.

## 3. Releasing

```bash
cd fragments-backend
npm version minor          # bumps package.json and creates the v* tag
git push origin main --follow-tags
```

Watch the `cd` workflow. When it finishes:

```bash
curl -s https://<API_HOST>/health
aws logs tail /ecs/fragments --follow
```

## 4. Deploying the UI

The UI is a static bundle. Build it with the production values and host it on
any static host (S3 + CloudFront, Amplify Hosting, or the nginx image):

```bash
cd fragments-ui
docker build -t fragments-ui \
  --build-arg VITE_API_URL=https://<API_HOST> \
  --build-arg VITE_AUTH_MODE=cognito \
  --build-arg VITE_COGNITO_AUTHORITY=https://cognito-idp.us-east-1.amazonaws.com/<POOL_ID> \
  --build-arg VITE_COGNITO_CLIENT_ID=<CLIENT_ID> .
docker run -p 8080:8080 fragments-ui
```

Make sure the UI origin is listed in the API's `CORS_ORIGINS` and registered
as a callback URL in the Cognito app client.

## 5. Local emulation

```bash
cd fragments-backend
docker compose up -d --build
./scripts/local-aws-setup.sh
npm run test:integration
```

`docker-compose.yml` runs the API against DynamoDB Local and LocalStack S3 with
the test users mounted read-only; nothing in it is suitable for production.

## Demo environment on Vercel

A lightweight alternative to AWS for showing the project: the API runs as a
Vercel Function (`fragments-backend/api/index.js`, routed by
`fragments-backend/vercel.json`) with Vercel Blob as storage, and the UI is a
static Vite site. Authentication is HTTP Basic with the test users from
`fragments-backend/tests/.htpasswd`, which `vercel.json` bundles into the
function. The API refuses Basic Auth under `NODE_ENV=production`, so the demo
runs with `NODE_ENV=demo`.

**Option A: GitHub Actions (`deploy-vercel.yml`)**

1. Create an account token at https://vercel.com/account/tokens and store it as
   the repository secret `VERCEL_TOKEN`.
2. In the Vercel dashboard create a Blob store (Storage → Create → Blob, access
   *private*) and store its read-write token as the secret
   `VERCEL_BLOB_READ_WRITE_TOKEN`.
3. Set the repository variable `VERCEL_TEAM` to your team slug (for example
   `kishan-dewasis-projects`).
4. Run the *deploy-vercel* workflow. The first run creates the projects
   `fragments-api` and `fragments-ui`; copy their production domains into the
   variables `DEMO_API_URL` and `DEMO_UI_URL` and run it once more so CORS and
   the UI's API URL use the stable domains.

**Option B: Vercel dashboard**

Import `kdewasi/fragments` twice:

| Project         | Root directory      | Framework | Environment variables                                                                                                                                     |
| --------------- | ------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fragments-api` | `fragments-backend` | Other     | `NODE_ENV=demo`, `LOG_PRETTY=false`, `HTPASSWD_FILE=tests/.htpasswd`, `TRUST_PROXY=1`, `MAX_FRAGMENT_SIZE=4mb`, `RATE_LIMIT_MAX=120`, `API_URL`, `CORS_ORIGINS` |
| `fragments-ui`  | `fragments-ui`      | Vite      | `VITE_API_URL=https://<api domain>`, `VITE_AUTH_MODE=basic`                                                                                               |

Connect a private Blob store to `fragments-api` (Storage tab); Vercel injects
`BLOB_READ_WRITE_TOKEN` and the API switches to Blob storage automatically.
Set `API_URL` to the API's own production URL and `CORS_ORIGINS` to the UI's.

**Option C: from Claude Code with the Vercel connector**

The connector must be authorized with an account that can create projects in
the team; a read-only or restricted token can list projects but not create
them. Once that is in place, the projects, Blob store, environment variables
and deployments can all be driven from the session.
