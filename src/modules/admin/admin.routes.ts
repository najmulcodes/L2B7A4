import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/rbac.middleware';
import { validate, uuidParamSchema } from '../../middlewares/validate.middleware';
import { adminCategoryRouter } from '../categories/category.routes';
import {
  listUsersQuerySchema,
  updateUserStatusSchema,
  listAdminGearQuerySchema,
  listAdminRentalsQuerySchema,
  adminCancelOrderSchema,
} from './admin.validation';
import {
  listUsersHandler,
  updateUserStatusHandler,
  listAllGearHandler,
  listAllRentalsHandler,
  forceCancelOrderHandler,
} from './admin.controller';

const router = Router();

router.use(authenticate, requireRole('ADMIN'));

router.use('/categories', adminCategoryRouter);

router.get('/users', validate({ query: listUsersQuerySchema }), listUsersHandler);
router.patch(
  '/users/:id',
  validate({ params: uuidParamSchema, body: updateUserStatusSchema }),
  updateUserStatusHandler,
);

router.get('/gear', validate({ query: listAdminGearQuerySchema }), listAllGearHandler);

router.get('/rentals', validate({ query: listAdminRentalsQuerySchema }), listAllRentalsHandler);
router.patch(
  '/rentals/:id/cancel',
  validate({ params: uuidParamSchema, body: adminCancelOrderSchema }),
  forceCancelOrderHandler,
);

export default router;
