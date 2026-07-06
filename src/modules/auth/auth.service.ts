import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/ApiError';
import { hashPassword, comparePassword } from '../../utils/password';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
  newJti,
} from '../../utils/jwt';
import { env } from '../../config/env';
import type {
  RegisterInput,
  LoginInput,
  UpdateProfileInput,
  ChangePasswordInput,
} from './auth.validation';

const PUBLIC_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  avatarUrl: true,
  address: true,
  businessName: true,
  bio: true,
  createdAt: true,
  updatedAt: true,
} as const;

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

async function issueTokenPair(userId: string, email: string, role: 'CUSTOMER' | 'PROVIDER' | 'ADMIN'): Promise<TokenPair> {
  const accessToken = signAccessToken({ sub: userId, email, role });

  const jti = newJti();
  const refreshToken = signRefreshToken(userId, jti);

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + env.JWT_REFRESH_EXPIRES_IN_SECONDS * 1000),
    },
  });

  return { accessToken, refreshToken };
}

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw ApiError.conflict('An account with this email already exists.', [
      { field: 'email', message: 'This email is already registered.' },
    ]);
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      password: passwordHash,
      phone: input.phone,
      role: input.role,
      businessName: input.role === 'PROVIDER' ? input.businessName : undefined,
      address: input.address,
    },
    select: PUBLIC_USER_SELECT,
  });

  const tokens = await issueTokenPair(user.id, user.email, user.role);
  return { user, ...tokens };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    throw ApiError.unauthorized('Invalid email or password.');
  }

  const passwordMatches = await comparePassword(input.password, user.password);
  if (!passwordMatches) {
    throw ApiError.unauthorized('Invalid email or password.');
  }

  if (user.status === 'SUSPENDED') {
    throw ApiError.forbidden('This account has been suspended. Contact support for help.');
  }

  const tokens = await issueTokenPair(user.id, user.email, user.role);
  const { password: _password, ...publicUser } = user;
  return { user: publicUser, ...tokens };
}

export async function refresh(rawRefreshToken: string) {
  let payload;
  try {
    payload = verifyRefreshToken(rawRefreshToken);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token. Please log in again.');
  }

  const tokenHash = hashToken(rawRefreshToken);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!stored || stored.revokedAt || stored.expiresAt < new Date() || stored.userId !== payload.sub) {
    throw ApiError.unauthorized('This session has expired. Please log in again.');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || user.status === 'SUSPENDED') {
    throw ApiError.unauthorized('This account is no longer active.');
  }

  // Rotate: the old refresh token can never be used again.
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  const tokens = await issueTokenPair(user.id, user.email, user.role);
  return tokens;
}

export async function logout(rawRefreshToken: string): Promise<void> {
  const tokenHash = hashToken(rawRefreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: PUBLIC_USER_SELECT,
  });
  if (!user) throw ApiError.notFound('User not found.');
  return user;
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: input,
    select: PUBLIC_USER_SELECT,
  });
  return user;
}

export async function changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound('User not found.');

  const matches = await comparePassword(input.currentPassword, user.password);
  if (!matches) {
    throw ApiError.badRequest('Current password is incorrect.', [
      { field: 'currentPassword', message: 'Current password is incorrect.' },
    ]);
  }

  const newHash = await hashPassword(input.newPassword);
  await prisma.user.update({ where: { id: userId }, data: { password: newHash } });

  // Invalidate all existing sessions so the old password can no longer be
  // used to keep a stolen refresh token alive.
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
