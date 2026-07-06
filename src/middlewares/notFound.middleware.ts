import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';

/**
 * Registered after all routes, before the error handler. Deliberately has no
 * path string - Express 5 requires named wildcards (e.g. `/*splat`) for bare
 * `*` patterns, so a path-less catch-all middleware is the simplest way to
 * handle "no route matched" for every method/path.
 */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}
