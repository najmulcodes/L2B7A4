import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/rbac.middleware';
import { validate, uuidParamSchema } from '../../middlewares/validate.middleware';
import {
  createPaymentSchema,
  confirmPaymentSchema,
  listPaymentsQuerySchema,
  sslcommerzCallbackSchema,
} from './payment.validation';
import {
  createPaymentHandler,
  successCallbackHandler,
  failCallbackHandler,
  cancelCallbackHandler,
  ipnHandler,
  confirmPaymentHandler,
  listMyPaymentsHandler,
  getPaymentHandler,
} from './payment.controller';

const router = Router();

// --- Public gateway callbacks (SSLCommerz posts here directly - no JWT) ---
router.post('/success', validate({ body: sslcommerzCallbackSchema }), successCallbackHandler);
router.post('/fail', validate({ body: sslcommerzCallbackSchema }), failCallbackHandler);
router.post('/cancel', validate({ body: sslcommerzCallbackSchema }), cancelCallbackHandler);
router.post('/ipn', validate({ body: sslcommerzCallbackSchema }), ipnHandler);

// --- Authenticated customer-facing endpoints ---
router.use(authenticate);
router.post(
  '/create',
  requireRole('CUSTOMER'),
  validate({ body: createPaymentSchema }),
  createPaymentHandler,
);
router.post('/confirm', validate({ body: confirmPaymentSchema }), confirmPaymentHandler);
router.get('/', validate({ query: listPaymentsQuerySchema }), listMyPaymentsHandler);
router.get('/:id', validate({ params: uuidParamSchema }), getPaymentHandler);

export default router;
