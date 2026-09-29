# fragments-backend

Express 5 REST API for the Fragments service. See the
[repository README](../README.md) for the API reference and configuration, and
[docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md) for AWS deployment.

```bash
npm install
cp .env.example .env     # optional; defaults work for local development
npm run dev              # http://localhost:8080 (memory storage, Basic Auth)

npm run lint && npm run format:check
npm test                 # Jest unit tests
npm run coverage
npm run test:integration # Hurl tests against a running API (docker compose up -d --build)
```

Layout:

```
src/
├── index.js          server bootstrap, graceful shutdown
├── app.js            middleware (helmet, CORS, logging, rate limit), routes, error handler
├── config.js         all environment variables in one place
├── auth/             strategy selection: Cognito (production) or Basic Auth (development)
├── model/
│   ├── fragment.js   Fragment class (types, conversions matrix, persistence)
│   ├── validate.js   content validation on write (JSON, YAML, images)
│   ├── convert.js    conversions (markdown-it, js-yaml, CSV parser, sharp)
│   └── data/         storage backends: memory/ and aws/ (S3 + DynamoDB)
└── routes/fragments  one handler per route
deploy/               ECS task definition and IAM policy templates
tests/unit            Jest (supertest, mocked AWS SDK)
tests/integration     Hurl files + fixtures
```
