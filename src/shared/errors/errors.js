import { AppError } from "./AppError.js";

export class ValidationError extends AppError {
  constructor(message) {
    super(message, 400, "VALIDATION_ERROR");
  }
}

export class AuthenticationError extends AppError {
  constructor(message) {
    super(message, 401, "AUTHENTICATION_ERROR");
  }
}

export class AuthorizationError extends AppError {
  constructor(message) {
    super(message, 403, "AUTHORIZATION_ERROR");
  }
}

export class NotFoundError extends AppError {
  constructor(message) {
    super(message, 404, "NOT_FOUND");
  }
}