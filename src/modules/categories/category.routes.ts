import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/rbac.middleware';
import { validate, uuidParamSchema } from '../../middlewares/validate.middleware';
import {
  createCategorySchema,
  updateCategorySchema,
  listCategoriesQuerySchema,
} from './category.validation';
import {
  listCategoriesHandler,
  getCategoryHandler,
  createCategoryHandler,
  updateCategoryHandler,
  deleteCategoryHandler,
} from './category.controller';

/** Mounted at /api/categories - public read access. */
export const publicCategoryRouter = Router();

publicCategoryRouter.get(
  '/',
  validate({ query: listCategoriesQuerySchema }),
  listCategoriesHandler,
);
publicCategoryRouter.get('/:id', validate({ params: uuidParamSchema }), getCategoryHandler);

/** Mounted at /api/admin/categories - admin-only writes, same underlying service. */
export const adminCategoryRouter = Router();

adminCategoryRouter.use(authenticate, requireRole('ADMIN'));
adminCategoryRouter.post('/', validate({ body: createCategorySchema }), createCategoryHandler);
adminCategoryRouter.put(
  '/:id',
  validate({ params: uuidParamSchema, body: updateCategorySchema }),
  updateCategoryHandler,
);
adminCategoryRouter.delete('/:id', validate({ params: uuidParamSchema }), deleteCategoryHandler);
