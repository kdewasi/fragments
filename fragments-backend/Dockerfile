# syntax=docker/dockerfile:1

# ── Stage 1: install production dependencies ────────────────────────────────
FROM node:24-slim AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

# ── Stage 2: minimal runtime image ──────────────────────────────────────────
FROM node:24-slim

LABEL org.opencontainers.image.title="fragments" \
      org.opencontainers.image.description="Fragments microservice API" \
      org.opencontainers.image.source="https://github.com/kdewasi/fragments"

ENV NODE_ENV=production \
    PORT=8080 \
    NPM_CONFIG_LOGLEVEL=warn

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src

# Never run as root inside the container
USER node

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8080/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Run node directly (not via npm) so signals reach the process for graceful shutdown
CMD ["node", "src/index.js"]
