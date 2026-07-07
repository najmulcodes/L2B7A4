import { z } from 'zod';

export const createRentalOrderSchema = z
  .object({
    items: z
      .array(
        z.object({
          gearItemId: z.uuid({ error: 'A valid gearItemId is required' }),
          quantity: z.coerce.number().int().positive({ error: 'quantity must be at least 1' }),
        }),
      )
      .min(1, { error: 'At least one item is required' })
      .max(20, { error: 'A single order may contain at most 20 line items' }),
    startDate: z.coerce.date({ error: 'A valid startDate is required' }),
    endDate: z.coerce.date({ error: 'A valid endDate is required' }),
    deliveryAddress: z.string().trim().max(255).optional(),
    notes: z.string().trim().max(1000).optional(),
  })
  .refine((data) => data.endDate > data.startDate, {
    error: 'endDate must be after startDate',
    path: ['endDate'],
  })
  .refine((data) => data.startDate.getTime() >= new Date().setHours(0, 0, 0, 0), {
    error: 'startDate cannot be in the past',
    path: ['startDate'],
  });
export type CreateRentalOrderInput = z.infer<typeof createRentalOrderSchema>;

export const listRentalsQuerySchema = z.object({
  status: z.enum(['PLACED', 'CONFIRMED', 'CANCELLED', 'PAID', 'PICKED_UP', 'RETURNED']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});
export type ListRentalsQuery = z.infer<typeof listRentalsQuerySchema>;

/** Statuses a provider may explicitly set via PATCH - PAID is system-set
 * only (via the payments module), CANCELLED-by-provider is a separate
 * admin/provider override, not part of the normal happy path. */
export const updateOrderStatusSchema = z.object({
  status: z.enum(['CONFIRMED', 'PICKED_UP', 'RETURNED'], {
    error: 'status must be one of CONFIRMED, PICKED_UP, RETURNED',
  }),
});
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

export const cancelOrderSchema = z.object({
  cancelReason: z.string().trim().max(500).optional(),
});
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
