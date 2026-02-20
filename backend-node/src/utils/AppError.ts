export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this);
  }
}

export class UserAlreadyExistsError extends AppError {
  constructor(message = 'A user with this email already exists') {
    super(message, 409);
  }
}

export class UserNotFoundError extends AppError {
  constructor(message = 'User not found') {
    super(message, 404);
  }
}

export class InvalidCredentialsError extends AppError {
  constructor(message = 'Invalid email or password') {
    super(message, 401);
  }
}

export class AccountDeactivatedError extends AppError {
  constructor(message = 'Account has been deactivated') {
    super(message, 403);
  }
}

export class TokenExpiredError extends AppError {
  constructor(message = 'Token has expired') {
    super(message, 410);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403);
  }
}

export class ValidationError extends AppError {
  public readonly details: unknown;
  constructor(message = 'Validation failed', details?: unknown) {
    super(message, 422);
    this.details = details;
  }
}

export class BoardingNotFoundError extends AppError {
  constructor(message = 'Boarding not found') {
    super(message, 404);
  }
}

export class InvalidStateTransitionError extends AppError {
  constructor(message = 'Invalid state transition') {
    super(message, 422);
  }
}

export class SlugConflictError extends AppError {
  constructor(message = 'Slug already exists') {
    super(message, 409);
  }
}
