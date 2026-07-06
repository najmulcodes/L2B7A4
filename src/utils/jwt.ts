import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { env } from '../config/env';
import type { UserRole } from '../config/constants';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export interface RefreshTokenPayload {
  sub: string;
  /** Random per-token id, lets us find/revoke the matching RefreshToken row. */
  jti: string;
}

const ACCESS_ALGORITHM = 'HS256' as const;

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN_SECONDS,
    algorithm: ACCESS_ALGORITHM,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
    algorithms: [ACCESS_ALGORITHM],
  });
  return decoded as AccessTokenPayload;
}

export function signRefreshToken(userId: string, jti: string): string {
  const payload: RefreshTokenPayload = { sub: userId, jti };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN_SECONDS,
    algorithm: ACCESS_ALGORITHM,
  });
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET, {
    algorithms: [ACCESS_ALGORITHM],
  });
  return decoded as RefreshTokenPayload;
}

/** SHA-256 hash of a refresh token, so the raw token is never persisted. */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function newJti(): string {
  return crypto.randomUUID();
}
