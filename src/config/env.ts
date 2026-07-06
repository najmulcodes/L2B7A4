import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),

  // Database
  DATABASE_URL: z.string().min(1, { error: 'DATABASE_URL is required' }),
  DIRECT_URL: z.string().min(1, { error: 'DIRECT_URL is required' }),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),

  // Auth
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, { error: 'JWT_ACCESS_SECRET must be at least 32 characters' }),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, { error: 'JWT_REFRESH_SECRET must be at least 32 characters' }),
  JWT_ACCESS_EXPIRES_IN_SECONDS: z.coerce.number().int().positive().default(86_400), // 1 day
  JWT_REFRESH_EXPIRES_IN_SECONDS: z.coerce.number().int().positive().default(2_592_000), // 30 days
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(8).max(15).default(12),

  // CORS - comma-separated list of allowed origins, or "*" for all
  CORS_ORIGIN: z.string().default('*'),

  // Public base URL of this API (used to build SSLCommerz callback URLs)
  APP_BASE_URL: z.string().min(1, { error: 'APP_BASE_URL is required' }),

  // SSLCommerz
  SSLCOMMERZ_STORE_ID: z.string().min(1, { error: 'SSLCOMMERZ_STORE_ID is required' }),
  SSLCOMMERZ_STORE_PASSWORD: z.string().min(1, { error: 'SSLCOMMERZ_STORE_PASSWORD is required' }),
  SSLCOMMERZ_IS_LIVE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    // eslint-disable-next-line no-console
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
