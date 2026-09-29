# Fragments

A cloud-native microservice for storing, retrieving and converting small pieces of
data ("fragments"): plain text, Markdown, HTML, CSV, JSON, YAML and images.
It has a Node.js/Express API backed by Amazon S3 + DynamoDB, a React PWA front
end, and GitHub Actions pipelines that test everything and deploy the API to
Amazon ECS.

```
fragments/
├── fragments-backend/   Express 5 REST API (Node 24), Jest + Hurl tests, Dockerfile, Compose stack
├── fragments-ui/        React 19 + TypeScript + Vite PWA, Vitest tests, nginx Dockerfile
├── docs/DEPLOYMENT.md   AWS + GitHub setup for the CD pipeline
├── SECURITY.md          Security model and the credential-rotation notice
└── .github/             CI (lint, tests, audit, integration) and CD (ECR + ECS) workflows
```

## How it fits together

```
 Browser (fragments-ui)                       fragments-backend (ECS Fargate, port 8080)
 ┌──────────────────────┐   Bearer ID token   ┌──────────────────────────────────────────┐
 │ React PWA            │ ──────────────────▶ │ helmet · CORS allow-list · rate limit     │
 │ Cognito Hosted UI    │                     │ Passport: Cognito JWT (prod) / Basic (dev)│
 │ IndexedDB offline    │ ◀────────────────── │ /v1/fragments CRUD + .ext conversions     │
 └──────────────────────┘        JSON         │ sharp · markdown-it · js-yaml             │
                                              └───────────┬─────────────────┬────────────┘
                                                          ▼                 ▼
                                                 DynamoDB (metadata)   S3 (fragment bytes)
```

- Users are identified by a SHA-256 hash of their email; the email itself is never stored.
- Every fragment is scoped to its owner. Other users get a 404, not a 403.
- Uploaded data is validated against its declared type (JSON/YAML parse, image
  format sniffing) before it is stored, so conversions never operate on garbage.

## Quick start (local development)

Requirements: Node.js 24 (see `.nvmrc`), npm 10+. Docker is optional.

```bash
# API with in-memory storage and HTTP Basic Auth
cd fragments-backend
npm install
npm run dev            # http://localhost:8080

# UI in a second terminal
cd fragments-ui
npm install
npm run dev            # http://localhost:1234
```

Sign in with one of the test-only users from `fragments-backend/tests/.htpasswd`:

| User                      | Password          |
| ------------------------- | ----------------- |
| `test-user@example.com`   | `test-password-1` |
| `test-user-2@example.com` | `test-password-2` |

These users exist only for local development and automated tests. The
production image contains no `.htpasswd` and refuses to start with Basic Auth
(see [SECURITY.md](SECURITY.md)).

### Full local stack (S3 + DynamoDB emulated)

```bash
cd fragments-backend
docker compose up -d --build       # API + DynamoDB Local + LocalStack S3
./scripts/local-aws-setup.sh       # creates the bucket and table (needs the AWS CLI)
npm run test:integration           # Hurl tests against http://localhost:8080
docker compose down -v
```

## Testing

| What                    | Command (in the package directory)           |
| ----------------------- | -------------------------------------------- |
| Backend lint + format   | `npm run lint && npm run format:check`       |
| Backend unit tests      | `npm test` (coverage: `npm run coverage`)    |
| Backend integration     | `npm run test:integration` (needs [Hurl](https://hurl.dev) and a running API) |
| Frontend lint + types   | `npm run lint && npm run typecheck`          |
| Frontend unit tests     | `npm test`                                   |
| Dependency audit        | `npm run audit:prod` (both packages)         |

The unit suite runs against the in-memory store with the test `.htpasswd`; the
AWS storage layer is covered with mocked SDK clients. Coverage thresholds are
enforced in `jest.config.js`.

## API

All `/v1` routes require authentication. Responses are JSON envelopes:
`{ "status": "ok", ... }` or `{ "status": "error", "error": { "code", "message" } }`.

| Method   | Route                        | Description                                           |
| -------- | ---------------------------- | ----------------------------------------------------- |
| `GET`    | `/`                          | Service metadata (unauthenticated)                    |
| `GET`    | `/health`                    | Health check for load balancers (unauthenticated)     |
| `GET`    | `/v1/fragments[?expand=1]`   | The user's fragment ids, or full metadata with expand |
| `POST`   | `/v1/fragments`              | Create a fragment from the raw request body           |
| `GET`    | `/v1/fragments/:id`          | Fragment data with its stored `Content-Type`          |
| `GET`    | `/v1/fragments/:id/info`     | Fragment metadata                                     |
| `GET`    | `/v1/fragments/:id.:ext`     | Fragment data converted to the type for `.ext`        |
| `PUT`    | `/v1/fragments/:id`          | Replace the data (same type only)                     |
| `DELETE` | `/v1/fragments/:id`          | Delete the fragment                                   |

Supported types: `text/plain`, `text/markdown`, `text/html`, `text/csv`,
`application/json`, `application/yaml`, `image/png`, `image/jpeg`,
`image/webp`, `image/gif`, `image/avif`. Bodies are limited to `MAX_FRAGMENT_SIZE` (5 MB by default).

| Stored type        | Convertible to (`.ext`)                          |
| ------------------ | ------------------------------------------------ |
| `text/markdown`    | `.html`, `.txt`, `.md`                           |
| `text/html`        | `.txt`, `.html`                                  |
| `text/csv`         | `.json`, `.txt`, `.csv`                          |
| `application/json` | `.yaml` / `.yml`, `.txt`, `.json`                |
| `application/yaml` | `.txt`, `.yaml`                                  |
| `image/*`          | `.png`, `.jpg`, `.webp`, `.gif`, `.avif`         |

```bash
AUTH="Authorization: Basic $(printf 'test-user@example.com:test-password-1' | base64)"
curl -s -X POST http://localhost:8080/v1/fragments -H "$AUTH" -H 'Content-Type: text/markdown' -d '# Hello'
curl -s http://localhost:8080/v1/fragments/<id>.html -H "$AUTH"
```

Error codes: `400` invalid body / type mismatch / unknown extension, `401`
unauthenticated, `404` unknown fragment (or another user's), `413` body too
large, `415` unsupported type or conversion, `422` stored data could not be
converted, `429` rate limited.

## Configuration

### Backend (`fragments-backend/.env.example`)

| Variable                                          | Purpose                                                    | Default              |
| ------------------------------------------------- | ---------------------------------------------------------- | -------------------- |
| `PORT`                                            | Listen port                                                | `8080`               |
| `NODE_ENV`                                        | `production` enforces Cognito auth                         | `development`        |
| `LOG_LEVEL`, `LOG_PRETTY`                         | Pino level; pretty output for humans                       | `info` / off in prod |
| `API_URL`                                         | Public URL used in `Location` headers                      | request host         |
| `CORS_ORIGINS`                                    | Comma-separated allowed browser origins                    | any                  |
| `TRUST_PROXY`                                     | Express trust-proxy value (`1` behind an ALB)              | off                  |
| `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS`          | Requests per window per client                             | `300` / `60000`      |
| `MAX_FRAGMENT_SIZE`                               | Largest accepted body                                      | `5mb`                |
| `HTPASSWD_FILE`                                   | Basic Auth users (development only)                        | none                 |
| `AWS_COGNITO_POOL_ID`, `AWS_COGNITO_CLIENT_ID`    | Cognito user pool for Bearer ID tokens (production)        | none                 |
| `AWS_REGION`                                      | Set to use S3 + DynamoDB; empty means in-memory storage    | none                 |
| `AWS_S3_BUCKET_NAME`, `AWS_DYNAMODB_TABLE_NAME`   | Storage names                                              | `fragments`          |
| `AWS_S3_ENDPOINT_URL`, `AWS_DYNAMODB_ENDPOINT_URL`| Alternate endpoints (LocalStack, DynamoDB Local)           | AWS                  |

### Frontend (`fragments-ui/.env.example`)

| Variable                                          | Purpose                                            |
| ------------------------------------------------- | -------------------------------------------------- |
| `VITE_API_URL`                                    | Backend base URL                                   |
| `VITE_AUTH_MODE`                                  | `basic` (development) or `cognito` (production)    |
| `VITE_COGNITO_AUTHORITY`, `VITE_COGNITO_CLIENT_ID`| Required in `cognito` mode                         |
| `VITE_COGNITO_REDIRECT_URI`                       | Defaults to `<origin>/callback`                    |

Vite inlines these at build time; the UI Dockerfile accepts them as `--build-arg`s.

## Deployment

- **CI** (`.github/workflows/ci.yml`) runs on every push and pull request to
  `main`: backend lint/format/unit tests/audit, frontend lint/types/tests/build/audit,
  Dockerfile lint, and the Hurl integration suite against the Compose stack.
  Pushes to `main` also publish the backend image to Docker Hub.
- **CD** (`.github/workflows/cd.yml`) runs on `v*` tags: builds the backend
  image, pushes it to Amazon ECR and deploys it to the ECS service using
  `fragments-backend/deploy/ecs-task-definition.json`, authenticating to AWS
  through GitHub OIDC.

The one-time AWS and GitHub setup (ECR, S3, DynamoDB, Cognito, IAM roles,
repository variables) is described in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## License

Personal project by [Kishan Dewasi](https://github.com/kdewasi); originally built for
CCP555 (Cloud Computing for Programmers) at Seneca Polytechnic. All rights reserved.
