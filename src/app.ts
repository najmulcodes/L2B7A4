import express, { type Application, type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';
import yaml from 'js-yaml';
import fs from 'node:fs';
import path from 'node:path';
import { env, isProduction } from './config/env';
import { generalRateLimiter } from './middlewares/rateLimiter.middleware';
import { notFoundHandler } from './middlewares/notFound.middleware';
import { errorHandler } from './middlewares/error.middleware';
import apiRoutes from './routes';

export function createApp(): Application {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1); // required behind Render/Vercel's reverse proxy for correct req.ip / rate limiting

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN === '*' ? '*' : env.CORS_ORIGIN.split(',').map((o) => o.trim()),
    }),
  );
  app.use(compression());
  app.use(morgan(isProduction ? 'combined' : 'dev'));

  app.use(express.json({ limit: '2mb' }));
  // Required for SSLCommerz's success/fail/cancel/ipn callbacks, which POST
  // as application/x-www-form-urlencoded, not JSON.
  app.use(express.urlencoded({ extended: true }));

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', service: 'gearup-backend', timestamp: new Date().toISOString() });
  });

  // --- API documentation ---
  try {
    const openapiPath = path.join(__dirname, '..', 'docs', 'openapi.yaml');
    const openapiDocument = yaml.load(fs.readFileSync(openapiPath, 'utf8')) as Record<string, unknown>;
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiDocument));
  } catch {
    // Docs are non-critical to the API's operation - log and continue rather
    // than let a missing/malformed spec file take the whole server down.
    // eslint-disable-next-line no-console
    console.warn('OpenAPI spec could not be loaded - /api-docs will be unavailable.');
  }

  app.use('/api', generalRateLimiter, apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
