import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '../config/constants';
import { ApiError } from '../utils/ApiError';

/** Must run after `authenticate`. Restricts a route to the given role(s). */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(ApiError.unauthorized('Authentication required'));
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      next(ApiError.forbidden(`This action requires one of the following roles: ${allowedRoles.join(', ')}`));
      return;
    }
    next();
  };
}
