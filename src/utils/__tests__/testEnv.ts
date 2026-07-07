/**
 * Import this FIRST (before anything that transitively imports
 * `src/config/env.ts`) in any test file that needs it. `config/env.ts`
 * validates `process.env` at module-load time and calls `process.exit(1)`
 * if required variables are missing, so they must be set before that
 * module is ever required - including transitively, e.g. via `../jwt`.
 */
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??= 'postgresql://user:pass@localhost:5432/gearup_test';
process.env.DIRECT_URL ??= 'postgresql://user:pass@localhost:5432/gearup_test';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-'.padEnd(32, '0');
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-'.padEnd(32, '0');
process.env.APP_BASE_URL ??= 'http://localhost:5000';
process.env.SSLCOMMERZ_STORE_ID ??= 'test-store';
process.env.SSLCOMMERZ_STORE_PASSWORD ??= 'test-password';

export {};
