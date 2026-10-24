import { ApiErrorResponse } from "@/types";

export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly errorCode: string;
  readonly details?: Record<string, unknown> | unknown[];

  constructor(message: string, details?: Record<string, unknown> | unknown[]) {
    super(message);
    this.name = this.constructor.name;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  readonly statusCode = 400;
  readonly errorCode = "VALIDATION_ERROR";
}

export class UnauthorizedError extends AppError {
  readonly statusCode = 401;
  readonly errorCode = "UNAUTHORIZED";
}

export class ForbiddenError extends AppError {
  readonly statusCode = 403;
  readonly errorCode = "FORBIDDEN";
}

export class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly errorCode = "NOT_FOUND";
}

export class ConflictError extends AppError {
  readonly statusCode = 409;
  readonly errorCode = "CONFLICT";
}

export class InternalServerError extends AppError {
  readonly statusCode = 500;
  readonly errorCode = "INTERNAL_SERVER_ERROR";
}

/**
 * Format any thrown error into the authoritative API error response payload
 * Never leaks stack traces or SQL details in production
 */
export function formatErrorResponse(
  error: unknown,
  requestId: string = crypto.randomUUID()
): { status: number; body: ApiErrorResponse } {
  if (error instanceof AppError) {
    return {
      status: error.statusCode,
      body: {
        error: {
          code: error.errorCode,
          message: error.message,
          details: error.details,
          requestId,
        },
      },
    };
  }

  // Handle standard Error without exposing internal details
  const isDev = process.env.NODE_ENV === "development";
  const message =
    isDev && error instanceof Error
      ? error.message
      : "An unexpected internal server error occurred.";

  return {
    status: 500,
    body: {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message,
        requestId,
      },
    },
  };
}
