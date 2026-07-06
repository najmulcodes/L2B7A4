import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import { publicCategoryRouter } from '../modules/categories/category.routes';
import { publicGearRouter, providerGearRouter } from '../modules/gear/gear.routes';
import { customerRentalRouter, providerOrderRouter } from '../modules/rentals/rental.routes';
import paymentRoutes from '../modules/payments/payment.routes';
import reviewRoutes from '../modules/reviews/review.routes';
import adminRoutes from '../modules/admin/admin.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/categories', publicCategoryRouter);
router.use('/gear', publicGearRouter);
router.use('/provider/gear', providerGearRouter);
router.use('/provider/orders', providerOrderRouter);
router.use('/rentals', customerRentalRouter);
router.use('/payments', paymentRoutes);
router.use('/reviews', reviewRoutes);
router.use('/admin', adminRoutes);

export default router;
