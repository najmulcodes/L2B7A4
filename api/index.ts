// Vercel serverless entry point. Vercel's Node.js runtime accepts an Express
// app instance as the default export of an /api/*.ts file directly (Express
// apps are (req, res) => void compatible request handlers).
//
// The database connection is established lazily on first request rather
// than at module load time, since serverless functions are frozen/thawed
// between invocations and Prisma's connection pool (via @prisma/adapter-pg)
// handles connect-on-first-query automatically - there is no long-lived
// startup phase to hook into like there is in src/server.ts.
import { createApp } from '../src/app';

const app = createApp();

export default app;
