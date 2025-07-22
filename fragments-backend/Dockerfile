# -----------------------------
# Stage 1: Build dependencies
# -----------------------------
FROM node:18.13.0 AS builder

LABEL stage="builder"

WORKDIR /app

# Copy dependency files and install packages
COPY package*.json ./
RUN npm install

# Copy full project (src, tests, .htpasswd, etc.)
COPY . .

# -----------------------------
# Stage 2: Production runtime
# -----------------------------
FROM node:18.13.0-slim

# Image metadata (optional but useful)
LABEL maintainer="Kishan D. <kishandewasi606@gmail.com>"
LABEL description="Fragments Node.js microservice for CCP555 Lab 6"

# Set environment variables
ENV PORT=8080
ENV NPM_CONFIG_LOGLEVEL=warn
ENV NPM_CONFIG_COLOR=false

# Set working directory
WORKDIR /app

# Copy built app and dependencies from builder
COPY --from=builder /app /app

# Expose the service port
EXPOSE 8080

# Start the application
CMD ["npm", "start"]
