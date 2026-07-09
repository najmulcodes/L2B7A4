import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ZodError } from 'zod';
import { Prisma } from "@prisma/client";
import { ApiError, type ErrorDetail } from '../utils/ApiError';
import { logger } from '../lib/logger';
import { isProduction } from '../config/env';

interface StructuredErrorResponse {
  success: false;
  message: string;
  errorDetails: ErrorDetail[];
  stack?: string;
}

function fromPrismaKnownError(error: Prisma.PrismaClientKnownRequestError): ApiError {
  switch (error.code) {
    case 'P2002': {
      const fields = Array.isArray(error.meta?.target)
        ? (error.meta?.target as string[]).join(', ')
        : 'field';
      return ApiError.conflict(`A record with this ${fields} already exists.`, [
        { field: fields, message: 'This value is already in use.' },
      ]);
    }
    case 'P2025':
      return ApiError.notFound('The requested record was not found.');
    case 'P2003':
      return ApiError.badRequest('This operation references a record that does not exist.');
    case 'P2014':
      return ApiError.badRequest('This change would conflict with a related record.');
    default:
      logger.error('Unhandled Prisma known request error', { code: error.code, meta: error.meta });
      return ApiError.internal();
  }
}

/** Must be registered last, after all routes. Express recognizes it as an
 * error handler by its 4-argument signature. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void {
  let apiError: ApiError;

  if (err instanceof ApiError) {
    apiError = err;
  } else if (err instanceof ZodError) {
    apiError = ApiError.badRequest(
      'Validation failed',
      err.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
    );
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    apiError = fromPrismaKnownError(err);
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    apiError = ApiError.badRequest('The request could not be processed due to invalid data.');
  } else if (err instanceof jwt.JsonWebTokenError) {
    apiError = ApiError.unauthorized('Invalid or malformed authentication token.');
  } else if (err instanceof SyntaxError && 'body' in err) {
    // Malformed JSON body from express.json()
    apiError = ApiError.badRequest('Request body contains invalid JSON.');
  } else {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Unhandled error', {
      message,
      stack: err instanceof Error ? err.stack : undefined,
    });
    apiError = ApiError.internal();
  }

  if (apiError.statusCode >= 500) {
    logger.error(apiError.message, {
      path: req.path,
      method: req.method,
      requestId: req.requestId,
      stack: err instanceof Error ? err.stack : undefined,
    });
  }

  const response: StructuredErrorResponse = {
    success: false,
    message: apiError.message,
    errorDetails: apiError.errorDetails,
  };

  if (!isProduction && err instanceof Error) {
    response.stack = err.stack;
  }

  res.status(apiError.statusCode).json(response);
}
