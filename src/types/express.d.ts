import type { UserRole } from '../config/constants';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      /**
       * Express 5 made `req.query` a read-only getter, so the validation
       * middleware cannot overwrite it in place. Validated + coerced query
       * params (e.g. `page` as a number) are attached here instead.
       */
      validatedQuery?: Record<string, unknown>;
    }
  }
}

export {};
