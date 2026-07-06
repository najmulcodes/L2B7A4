import { createApp } from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './lib/prisma';
import { logger } from './lib/logger';

async function main(): Promise<void> {
  await connectDatabase();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`GearUp API listening on port ${env.PORT}`, { env: env.NODE_ENV });
  });

  const shutdown = (signal: string): void => {
    logger.info(`${signal} received - shutting down gracefully`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });

    // Force-exit if connections don't close within a reasonable window.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
  });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { message: error.message, stack: error.stack });
  process.exit(1);
});

main().catch((error) => {
  logger.error('Failed to start server', {
    message: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
