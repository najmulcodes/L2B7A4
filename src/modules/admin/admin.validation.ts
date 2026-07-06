import { z } from 'zod';

export const listUsersQuerySchema = z.object({
  role: z.enum(['CUSTOMER', 'PROVIDER', 'ADMIN']).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
  search: z.string().trim().max(150).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

export const updateUserStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED'], { error: 'status must be ACTIVE or SUSPENDED' }),
});
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;

export const listAdminGearQuerySchema = z.object({
  categoryId: z.uuid().optional(),
  providerId: z.uuid().optional(),
  isActive: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});
export type ListAdminGearQuery = z.infer<typeof listAdminGearQuerySchema>;

export const listAdminRentalsQuerySchema = z.object({
  status: z
    .enum(['PLACED', 'CONFIRMED', 'CANCELLED', 'PAID', 'PICKED_UP', 'RETURNED'])
    .optional(),
  customerId: z.uuid().optional(),
  providerId: z.uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});
export type ListAdminRentalsQuery = z.infer<typeof listAdminRentalsQuerySchema>;

export const adminCancelOrderSchema = z.object({
  cancelReason: z.string().trim().min(3, { error: 'cancelReason is required for an admin override' }).max(500),
});
export type AdminCancelOrderInput = z.infer<typeof adminCancelOrderSchema>;
