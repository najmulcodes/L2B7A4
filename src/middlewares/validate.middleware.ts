import type { NextFunction, Request, Response } from 'express';
import { z, ZodError, type ZodType } from 'zod';
import { ApiError } from '../utils/ApiError';

export interface ValidationSchemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

function zodIssuesToErrorDetails(error: ZodError): { field: string; message: string }[] {
  return error.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join('.') : '(root)',
    message: issue.message,
  }));
}

/**
 * Validates req.body / req.query / req.params against the given Zod schemas.
 *
 * req.body and req.params are overwritten in place with the parsed (and
 * coerced/defaulted) values. req.query is read-only in Express 5, so its
 * validated result is attached to req.validatedQuery instead - route
 * handlers should read filters from there rather than req.query directly.
 */
export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as typeof req.params;
      }
      if (schemas.query) {
        req.validatedQuery = schemas.query.parse(req.query) as Record<string, unknown>;
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(ApiError.badRequest('Validation failed', zodIssuesToErrorDetails(error)));
        return;
      }
      next(error);
    }
  };
}

/** Reusable schema for a UUID route param named `id`. */
export const uuidParamSchema = z.object({
  id: z.uuid({ error: 'A valid resource id is required' }),
});
