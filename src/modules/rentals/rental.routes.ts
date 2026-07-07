import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/rbac.middleware';
import { validate, uuidParamSchema } from '../../middlewares/validate.middleware';
import {
  createRentalOrderSchema,
  listRentalsQuerySchema,
  updateOrderStatusSchema,
  cancelOrderSchema,
} from './rental.validation';
import {
  createRentalOrderHandler,
  getRentalOrderHandler,
  listMyRentalOrdersHandler,
  cancelRentalOrderHandler,
  listProviderOrdersHandler,
  getProviderOrderHandler,
  updateOrderStatusHandler,
} from './rental.controller';

/** Mounted at /api/rentals - customer-facing order placement/history. */
export const customerRentalRouter = Router();

customerRentalRouter.use(authenticate);
customerRentalRouter.post(
  '/',
  requireRole('CUSTOMER'),
  validate({ body: createRentalOrderSchema }),
  createRentalOrderHandler,
);
customerRentalRouter.get(
  '/',
  validate({ query: listRentalsQuerySchema }),
  listMyRentalOrdersHandler,
);
customerRentalRouter.get('/:id', validate({ params: uuidParamSchema }), getRentalOrderHandler);
customerRentalRouter.patch(
  '/:id/cancel',
  requireRole('CUSTOMER'),
  validate({ params: uuidParamSchema, body: cancelOrderSchema }),
  cancelRentalOrderHandler,
);

/** Mounted at /api/provider/orders - PROVIDER-only order fulfillment. */
export const providerOrderRouter = Router();

providerOrderRouter.use(authenticate, requireRole('PROVIDER'));
providerOrderRouter.get(
  '/',
  validate({ query: listRentalsQuerySchema }),
  listProviderOrdersHandler,
);
providerOrderRouter.get('/:id', validate({ params: uuidParamSchema }), getProviderOrderHandler);
providerOrderRouter.patch(
  '/:id',
  validate({ params: uuidParamSchema, body: updateOrderStatusSchema }),
  updateOrderStatusHandler,
);
