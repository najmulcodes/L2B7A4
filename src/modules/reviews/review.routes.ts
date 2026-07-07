import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/rbac.middleware';
import { validate, uuidParamSchema } from '../../middlewares/validate.middleware';
import { createReviewSchema, listReviewsQuerySchema } from './review.validation';
import { createReviewHandler, listReviewsHandler, deleteReviewHandler } from './review.controller';

const router = Router();

router.get('/', validate({ query: listReviewsQuerySchema }), listReviewsHandler);

router.use(authenticate);
router.post(
  '/',
  requireRole('CUSTOMER'),
  validate({ body: createReviewSchema }),
  createReviewHandler,
);
router.delete('/:id', validate({ params: uuidParamSchema }), deleteReviewHandler);

export default router;
