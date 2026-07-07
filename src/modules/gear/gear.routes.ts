import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/rbac.middleware';
import { validate, uuidParamSchema } from '../../middlewares/validate.middleware';
import {
  createGearSchema,
  updateGearSchema,
  listGearQuerySchema,
  listMyGearQuerySchema,
} from './gear.validation';
import {
  listGearHandler,
  getGearHandler,
  createGearHandler,
  updateGearHandler,
  deleteGearHandler,
  listMyGearHandler,
} from './gear.controller';

/** Mounted at /api/gear - public browsing, no auth required. */
export const publicGearRouter = Router();

publicGearRouter.get('/', validate({ query: listGearQuerySchema }), listGearHandler);
publicGearRouter.get('/:id', validate({ params: uuidParamSchema }), getGearHandler);

/** Mounted at /api/provider/gear - PROVIDER-only inventory management. */
export const providerGearRouter = Router();

providerGearRouter.use(authenticate, requireRole('PROVIDER'));
providerGearRouter.get('/', validate({ query: listMyGearQuerySchema }), listMyGearHandler);
providerGearRouter.post('/', validate({ body: createGearSchema }), createGearHandler);
providerGearRouter.put(
  '/:id',
  validate({ params: uuidParamSchema, body: updateGearSchema }),
  updateGearHandler,
);
providerGearRouter.delete('/:id', validate({ params: uuidParamSchema }), deleteGearHandler);
