/**
 * Domain & Infrastructure Error Hierarchy
 */

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, any>;

  constructor(message: string, code = 'INTERNAL_ERROR', statusCode = 500, details?: Record<string, any>) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class NotFoundError extends AppError {
  constructor(entityName: string, id: string) {
    super(`${entityName} with ID '${id}' was not found.`, 'NOT_FOUND', 404, { entityName, id });
  }
}

export class RoutingError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'ROUTING_ENGINE_ERROR', 422, details);
  }
}

export class AIError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'AI_SERVICE_ERROR', 502, details);
  }
}

export class AuthError extends AppError {
  constructor(message: string) {
    super(message, 'UNAUTHORIZED', 401);
  }
}

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unexpected error occurred.';
};
