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
    log: isProduction
      ? [{ emit: 'event', level: 'error' }]
      : [
          { emit: 'event', level: 'warn' },
          { emit: 'event', level: 'error' },
        ],
  });

// @ts-expect-error - Prisma's event-based log typing is awkward to narrow generically here
prisma.$on('warn', (e) => logger.warn('Prisma warning', { message: e.message }));
// @ts-expect-error - see above
prisma.$on('error', (e) => logger.error('Prisma error', { message: e.message }));

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
