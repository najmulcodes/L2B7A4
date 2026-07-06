import { isProduction } from '../config/env';

type LogMeta = Record<string, unknown>;

function timestamp(): string {
  return new Date().toISOString();
}

function write(level: string, message: string, meta?: LogMeta): void {
  const entry = {
    level,
    time: timestamp(),
    message,
    ...(meta ? { meta } : {}),
  };

  if (isProduction) {
    // Structured JSON in production - friendly for Render/Vercel log ingestion
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(entry));
  } else {
    // eslint-disable-next-line no-console
    console.log(`[${entry.time}] ${level.toUpperCase()}: ${message}`, meta ?? '');
  }
}

export const logger = {
  info: (message: string, meta?: LogMeta) => write('info', message, meta),
  warn: (message: string, meta?: LogMeta) => write('warn', message, meta),
  error: (message: string, meta?: LogMeta) => write('error', message, meta),
  debug: (message: string, meta?: LogMeta) => {
    if (!isProduction) write('debug', message, meta);
  },
};
