# Dockerfile for fragments microservice

# Use specific Node.js version as base image
FROM node:18.13.0

# Image metadata
LABEL maintainer="Your Name <your@email.com>"
LABEL description="Fragments node.js microservice"

# Set environment variables
ENV PORT=8080
ENV NPM_CONFIG_LOGLEVEL=warn
ENV NPM_CONFIG_COLOR=false

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy application source code
COPY ./src ./src

# Copy .htpasswd file for Basic Auth
COPY ./tests/.htpasswd ./tests/.htpasswd

# Document the exposed port
EXPOSE 8080

# Start the server
CMD npm start
