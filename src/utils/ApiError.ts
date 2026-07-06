export interface ErrorDetail {
  field?: string;
  message: string;
}

/**
 * Thrown for any expected/operational error (bad input, not found, forbidden,
 * conflict, etc). The global error middleware catches this and serializes it
 * into the required `{ success, message, errorDetails }` response shape.
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly errorDetails: ErrorDetail[];
  public readonly isOperational: boolean;

  constructor(statusCode: number, message: string, errorDetails: ErrorDetail[] = []) {
    super(message);
    this.statusCode = statusCode;
    this.errorDetails = errorDetails;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, errorDetails: ErrorDetail[] = []): ApiError {
    return new ApiError(400, message, errorDetails);
  }

  static unauthorized(message = 'Authentication required'): ApiError {
    return new ApiError(401, message);
  }

  static forbidden(message = 'You do not have permission to perform this action'): ApiError {
    return new ApiError(403, message);
  }

  static notFound(message = 'Resource not found'): ApiError {
    return new ApiError(404, message);
  }

  static conflict(message: string, errorDetails: ErrorDetail[] = []): ApiError {
    return new ApiError(409, message, errorDetails);
  }

  static unprocessable(message: string, errorDetails: ErrorDetail[] = []): ApiError {
    return new ApiError(422, message, errorDetails);
  }

  static internal(message = 'Something went wrong. Please try again later.'): ApiError {
    return new ApiError(500, message);
  }
}
