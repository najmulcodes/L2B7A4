import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { authRateLimiter } from '../../middlewares/rateLimiter.middleware';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  updateProfileSchema,
  changePasswordSchema,
} from './auth.validation';
import {
  registerHandler,
  loginHandler,
  refreshHandler,
  logoutHandler,
  getMeHandler,
  updateProfileHandler,
  changePasswordHandler,
} from './auth.controller';

const router = Router();

router.post('/register', authRateLimiter, validate({ body: registerSchema }), registerHandler);
router.post('/login', authRateLimiter, validate({ body: loginSchema }), loginHandler);
router.post('/refresh-token', validate({ body: refreshTokenSchema }), refreshHandler);
router.post('/logout', validate({ body: refreshTokenSchema }), logoutHandler);

router.get('/me', authenticate, getMeHandler);
router.patch('/me', authenticate, validate({ body: updateProfileSchema }), updateProfileHandler);
router.patch(
  '/me/password',
  authenticate,
  validate({ body: changePasswordSchema }),
  changePasswordHandler,
);

export default router;
