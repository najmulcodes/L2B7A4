import { z } from 'zod';

export const createReviewSchema = z.object({
  gearItemId: z.uuid({ error: 'A valid gearItemId is required' }),
  rentalOrderId: z.uuid({ error: 'A valid rentalOrderId is required' }),
  rating: z.coerce
    .number()
    .int()
    .min(1, { error: 'rating must be between 1 and 5' })
    .max(5, { error: 'rating must be between 1 and 5' }),
  comment: z.string().trim().max(1000).optional(),
});
export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const listReviewsQuerySchema = z.object({
  gearItemId: z.uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});
export type ListReviewsQuery = z.infer<typeof listReviewsQuerySchema>;
