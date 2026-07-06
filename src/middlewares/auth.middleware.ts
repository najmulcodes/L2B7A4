import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { verifyAccessToken } from '../utils/jwt';
import { ApiError } from '../utils/ApiError';

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

/** Requires a valid access token. Attaches `req.user`. */
export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      throw ApiError.unauthorized('Authentication token is missing. Please log in.');
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw ApiError.unauthorized('Session expired. Please log in again.');
      }
      throw ApiError.unauthorized('Invalid authentication token.');
    }

    // Re-check the user on every request rather than trusting stale token
    // claims - catches role changes and account suspension immediately.
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, status: true },
    });

    if (!user) {
      throw ApiError.unauthorized('Account no longer exists.');
    }
    if (user.status === 'SUSPENDED') {
      throw ApiError.forbidden('This account has been suspended. Contact support for help.');
    }

    req.user = { id: user.id, email: user.email, role: user.role };
    next();
  } catch (error) {
    next(error);
  }
}

/** Attaches `req.user` if a valid token is present, but never rejects the request. */
export async function optionalAuthenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractBearerToken(req);
  if (!token) {
    next();
    return;
  }
  try {
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, status: true },
    });
    if (user && user.status === 'ACTIVE') {
      req.user = { id: user.id, email: user.email, role: user.role };
    }
  } catch {
    // Ignore invalid/expired tokens on optional routes - just treat as anonymous.
  }
  next();
}
