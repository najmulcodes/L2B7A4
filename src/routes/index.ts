import { Router, type Request, type Response } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import { publicCategoryRouter } from '../modules/categories/category.routes';
import { publicGearRouter, providerGearRouter } from '../modules/gear/gear.routes';
import { customerRentalRouter, providerOrderRouter } from '../modules/rentals/rental.routes';
import paymentRoutes from '../modules/payments/payment.routes';
import reviewRoutes from '../modules/reviews/review.routes';
import adminRoutes from '../modules/admin/admin.routes';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'GearUp API',
    data: {
      version: '1.0.0',
      documentation: '/api-docs',
      resources: {
        auth: '/api/auth',
        categories: '/api/categories',
        gear: '/api/gear',
        providerGear: '/api/provider/gear',
        rentals: '/api/rentals',
        providerOrders: '/api/provider/orders',
        payments: '/api/payments',
        reviews: '/api/reviews',
        admin: '/api/admin',
      },
    },
  });
});

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
