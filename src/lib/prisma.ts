import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { env, isProduction } from '../config/env';
import { logger } from './logger';

// Prisma ORM 7 requires a driver adapter - there is no default engine-based
// connection anymore. PrismaPg wraps a node-postgres Pool under the hood.
//
// `max` is kept modest by default (env-configurable) since this same code
// path runs both on Render (one long-lived process - a bigger pool is fine)
// and on Vercel serverless (many short-lived instances - a small pool per
// instance avoids exhausting the database's total connection limit).
const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
  max: env.DATABASE_POOL_MAX,
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 30_000,
});

// Cache the client on `globalThis` in development so that `tsx watch`
// hot-reloads don't spawn a new connection pool on every file change.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    // A single static shape (rather than branching on isProduction) keeps
    // PrismaClient's log-event generic unambiguous for $on below. Warn-level
    // logs are cheap and useful in production too, so there's no downside
    // to always emitting both.
    log: [
      { emit: 'event', level: 'warn' },
      { emit: 'event', level: 'error' },
    ],
  });

// Prisma event logging removed.
// Render/Prisma 7 generated client types may not expose $on() event overloads.

if (!isProduction) {
  globalForPrisma.prisma = prisma;
}

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
  logger.info('Database connected');
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Database disconnected');
}
