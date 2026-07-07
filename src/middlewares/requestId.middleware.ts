import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

/**
 * Attaches a unique id to every request (reusing an incoming X-Request-Id
 * header if the caller already set one, e.g. from an upstream proxy) and
 * echoes it back in the response headers. Logged alongside every error in
 * error.middleware.ts so a single request can be traced through logs even
 * when multiple instances are running behind a load balancer.
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers['x-request-id'];
  const id = typeof incoming === 'string' && incoming.length > 0 ? incoming : crypto.randomUUID();
  req.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}
