import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError, ValidationError } from '../utils/AppError';
import { sendError } from '../utils/response';
import { config } from '../config/env';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Zod validation errors
  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    sendError(res, 'ValidationError', 'Validation failed', 422, details);
    return;
  }

  // Our custom AppErrors
  if (err instanceof AppError) {
    const details = err instanceof ValidationError ? err.details : undefined;
    sendError(res, err.constructor.name, err.message, err.statusCode, details);
    return;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    sendError(res, 'UnauthorizedError', 'Invalid token', 401);
    return;
  }
  if (err.name === 'TokenExpiredError') {
    sendError(res, 'TokenExpiredError', 'Token has expired', 401);
    return;
  }

  // Unexpected errors
  if (config.nodeEnv !== 'production') {
    console.error('[Error]', err);
  }
  sendError(res, 'InternalServerError', 'An unexpected error occurred', 500);
}
