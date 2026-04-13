# Fragments — Data Fragment Archive & Conversion Engine

A full-stack cloud-native microservice for creating, storing, converting, and managing data fragments (text, images, JSON, YAML). Built with Node.js, React, TypeScript, and deployed on AWS.

## Architecture

```
fragments/
├── fragments-backend/     # Express.js REST API (Node.js)
├── fragments-ui-next/     # React + TypeScript + Vite frontend (NEXUS UI)
├── fragments-ui/          # Legacy vanilla JS frontend
└── README_Assignment3.md  # Assignment checklist
```

### System Diagram

```
┌─────────────────┐       ┌─────────────────────────────────┐
│  fragments-ui   │       │       fragments-backend          │
│  React + Vite   │──────>│       Express.js API             │
│  Port 1234      │       │       Port 8080                  │
└─────────────────┘       │                                   │
                          │  ┌───────────┐  ┌──────────────┐ │
                          │  │ Amazon S3  │  │ DynamoDB     │ │
                          │  │ (data)     │  │ (metadata)   │ │
                          │  └───────────┘  └──────────────┘ │
                          │                                   │
                          │  Auth: Cognito (prod) / Basic (dev)│
                          └─────────────────────────────────┘
```

## Features

### Backend API
- **Full CRUD** — Create, Read, Update, Delete fragments via REST API
- **11 supported types** — `text/plain`, `text/markdown`, `text/html`, `text/csv`, `application/json`, `application/yaml`, `image/png`, `image/jpeg`, `image/webp`, `image/gif`, `image/avif`
- **Format conversion** — Convert between compatible types (Markdown to HTML, JSON to YAML, PNG to JPEG, etc.)
- **Image processing** — Format conversion via [Sharp](https://sharp.pixelplumbing.com/)
- **Dual auth** — AWS Cognito (production) + HTTP Basic Auth (development)
- **Pluggable storage** — In-memory (dev), AWS S3 + DynamoDB (production)
- **Structured logging** — Pino with request IDs
- **Graceful shutdown** — Clean process termination handling

### Frontend (NEXUS UI)
- **React 19 + TypeScript** — Fully typed, modern React with hooks
- **NEXUS design system** — Custom sci-fi dark theme with glassmorphism, neon mint accents, animated grid backgrounds
- **Full CRUD UI** — Create, view, edit, delete fragments from the browser
- **Image upload** — Drag-and-drop file upload with preview
- **Format conversion** — Visual converter with inline preview and download
- **Fragment inspector** — Split-panel detail view with metadata grid
- **Live stats** — Header shows fragment count, total size, types in use
- **PWA / Offline** — Service Worker + IndexedDB caching for offline access
- **Dual auth** — Cognito OAuth redirect (production) + Basic Auth form (development)

### Infrastructure
- **Docker** — Multi-stage Dockerfiles for both backend and frontend
- **Docker Compose** — Full local stack (API + DynamoDB Local + LocalStack S3)
- **CI** — GitHub Actions: lint, unit tests, integration tests (Hurl), Docker Hub push
- **CD** — GitHub Actions: ECR push + ECS deploy on git tags
- **AWS** — S3, DynamoDB, ECS, ECR, Cognito, CloudWatch

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js, Express 4, Passport |
| **Frontend** | React 19, TypeScript 6, Vite 8 |
| **Auth** | AWS Cognito (OAuth/OIDC), HTTP Basic Auth |
| **Storage** | Amazon S3 (data), DynamoDB (metadata) |
| **Images** | Sharp (format conversion) |
| **Testing** | Jest (unit, 80+ tests), Hurl (integration, 10 test suites) |
| **CI/CD** | GitHub Actions, Docker Hub, Amazon ECR/ECS |
| **Fonts** | Outfit, Manrope, JetBrains Mono |
| **Design** | Glassmorphism, CSS Grid, CSS animations |

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- Docker & Docker Compose (optional, for AWS-backed storage)

### Quick Start (Development)

```bash
# 1. Clone the repo
git clone https://github.com/kdewasi/fragments.git
cd fragments

# 2. Start the backend (in-memory storage, Basic Auth)
cd fragments-backend
npm install
npm run dev

# 3. Start the frontend (in a new terminal)
cd fragments-ui-next
npm install
npm run dev
```

- **Backend**: http://localhost:8080
- **Frontend**: http://localhost:1234
- **Health check**: http://localhost:8080/health

### Test Credentials (Basic Auth)

```
Email:    kishandewasi606@gmail.com
Password: Jckzwtjh7d
```

### Running with Docker Compose (AWS-backed storage)

```bash
cd fragments-backend
docker compose up -d
```

This starts:
- `fragments` API server on port 8080
- `dynamodb-local` on port 8000
- `localstack` (S3) on port 4566

## API Reference

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/v1/fragments` | List user's fragments |
| `POST` | `/v1/fragments` | Create a new fragment |
| `GET` | `/v1/fragments/:id` | Get fragment data |
| `GET` | `/v1/fragments/:id/info` | Get fragment metadata |
| `PUT` | `/v1/fragments/:id` | Update fragment data |
| `DELETE` | `/v1/fragments/:id` | Delete a fragment |
| `GET` | `/v1/fragments/:id.ext` | Get converted fragment |

### Conversion Matrix

| Source Type | Convertible To |
|-------------|---------------|
| `text/markdown` | HTML, Plain Text |
| `text/html` | Plain Text |
| `text/csv` | Plain Text, JSON |
| `application/json` | YAML, Plain Text |
| `application/yaml` | Plain Text |
| `image/*` | PNG, JPEG, WebP, GIF, AVIF |

### Example: Create a Fragment

```bash
curl -X POST http://localhost:8080/v1/fragments \
  -H "Authorization: Basic $(echo -n 'user@example.com:password' | base64)" \
  -H "Content-Type: text/markdown" \
  -d "# Hello World"
```

### Example: Convert Fragment

```bash
curl http://localhost:8080/v1/fragments/<id>.html \
  -H "Authorization: Basic <token>"
```

## Testing

### Unit Tests

```bash
cd fragments-backend
npm test              # Run all 80+ tests
npm run coverage      # Run with coverage report (86%+ statements)
```

### Integration Tests

```bash
cd fragments-backend
docker compose up -d          # Start local AWS services
npm run test:integration      # Run Hurl integration tests
```

## Deployment

### Docker Build

```bash
# Backend
cd fragments-backend
docker build -t fragments-backend .

# Frontend
cd fragments-ui-next
docker build -t fragments-ui .
```

### AWS Deployment

The project deploys via GitHub Actions:

1. **CI** (on push to `main`): Lint, unit tests, integration tests, Docker Hub push
2. **CD** (on git tags `v*`): Build + push to ECR, deploy to ECS

See `.github/workflows/ci.yml` and `.github/workflows/cd.yml`.

### Environment Variables

#### Backend

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `8080` |
| `LOG_LEVEL` | Pino log level | `debug` |
| `HTPASSWD_FILE` | Path to .htpasswd for Basic Auth | `tests/.htpasswd` |
| `AWS_REGION` | Enables AWS storage when set | — |
| `AWS_S3_BUCKET_NAME` | S3 bucket for fragment data | `fragments` |
| `AWS_DYNAMODB_TABLE_NAME` | DynamoDB table for metadata | `fragments` |
| `AWS_COGNITO_POOL_ID` | Cognito User Pool ID | — |
| `AWS_COGNITO_CLIENT_ID` | Cognito App Client ID | — |

#### Frontend

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:8080` |
| `VITE_AUTH_MODE` | `basic` or `cognito` | `basic` |
| `VITE_COGNITO_AUTHORITY` | Cognito authority URL | — |
| `VITE_COGNITO_CLIENT_ID` | Cognito client ID | — |

## Project Structure

```
fragments-backend/
├── src/
│   ├── index.js              # Server bootstrap + graceful shutdown
│   ├── app.js                # Express app + middleware
│   ├── auth/                 # Cognito + Basic Auth strategies
│   ├── model/
│   │   ├── fragment.js       # Fragment class + conversion logic
│   │   └── data/             # Pluggable storage (memory / AWS)
│   └── routes/api/           # REST API route handlers
├── tests/
│   ├── unit/                 # Jest unit tests (13 suites, 80+ tests)
│   └── integration/          # Hurl integration tests (10 suites)
├── Dockerfile                # Multi-stage Docker build
├── docker-compose.yml        # Full local stack
└── .github/workflows/        # CI/CD pipelines

fragments-ui-next/
├── src/
│   ├── App.tsx               # Root component + auth routing
│   ├── config.ts             # Environment config (API URL, auth mode)
│   ├── components/
│   │   ├── LoginForm/        # Auth screen (Basic + Cognito)
│   │   └── FragmentDashboard/# Main dashboard (CRUD + convert)
│   ├── hooks/
│   │   ├── useAuth.ts        # Auth state (dual mode)
│   │   └── useFragments.ts   # Fragment CRUD + offline cache
│   ├── services/
│   │   ├── api.client.ts     # Typed API client
│   │   ├── auth.service.ts   # Basic Auth
│   │   ├── cognito.service.ts# Cognito OAuth
│   │   └── offline.service.ts# IndexedDB + Service Worker
│   └── types/                # TypeScript interfaces
├── public/
│   ├── sw.js                 # Service Worker
│   └── manifest.json         # PWA manifest
├── Dockerfile                # Multi-stage Docker build
└── nginx.conf                # Nginx SPA routing
```

## Screenshots

The NEXUS UI features a sci-fi data terminal aesthetic:

- **Login**: Deep space background with floating ambient orbs, glassmorphism card, pulsing status indicators
- **Dashboard**: Dense header with live stats, animated grid background, split-panel layout with fragment inspector
- **Fragment table**: Colored type tags, monospaced IDs, inline actions
- **Inspector**: Metadata grid, content viewer, format converter, danger zone

## License

This project was built for **CCP555 — Cloud Computing for Programmers** at Seneca Polytechnic.

## Author

**Kishan Dewasi** — [@kdewasi](https://github.com/kdewasi)
