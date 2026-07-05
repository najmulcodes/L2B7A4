// Prisma ORM 7 configuration file - used by the Prisma CLI for
// migrate / studio / db seed / introspection commands.
//
// This is SEPARATE from how the app connects to the database at runtime
// (see src/lib/prisma.ts, which uses the @prisma/adapter-pg driver adapter
// and reads DATABASE_URL directly). This file only affects CLI operations,
// which is why it points at DIRECT_URL (an unpooled connection - required
// for reliable schema diffing/migrations against providers like Neon/Supabase
// that offer a separate pooled vs. direct connection string).
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DIRECT_URL'),
  },
});
