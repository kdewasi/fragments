// src/errors.js
// Error types that carry an HTTP status so the central error handler can map
// them to a response without leaking internals.
'use strict';

class HttpError extends Error {
  constructor(status, message, options) {
    super(message, options);
    this.name = 'HttpError';
    this.status = status;
  }
}

class NotFoundError extends HttpError {
  constructor(message = 'not found') {
    super(404, message);
    this.name = 'NotFoundError';
  }
}

class ValidationError extends HttpError {
  constructor(message) {
    super(400, message);
    this.name = 'ValidationError';
  }
}

module.exports = { HttpError, NotFoundError, ValidationError };
