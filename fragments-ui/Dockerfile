# syntax=docker/dockerfile:1

# ── Stage 1: build the static bundle ────────────────────────────────────────
FROM node:24-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

# Vite inlines VITE_* variables at build time; pass them as --build-arg
ARG VITE_API_URL=http://localhost:8080
ARG VITE_AUTH_MODE=basic
ARG VITE_COGNITO_AUTHORITY=
ARG VITE_COGNITO_CLIENT_ID=
ENV VITE_API_URL=$VITE_API_URL \
    VITE_AUTH_MODE=$VITE_AUTH_MODE \
    VITE_COGNITO_AUTHORITY=$VITE_COGNITO_AUTHORITY \
    VITE_COGNITO_CLIENT_ID=$VITE_COGNITO_CLIENT_ID

RUN npm run build

# ── Stage 2: serve with an unprivileged nginx ───────────────────────────────
FROM nginxinc/nginx-unprivileged:stable-alpine

LABEL org.opencontainers.image.title="fragments-ui" \
      org.opencontainers.image.source="https://github.com/kdewasi/fragments"

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/ > /dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
