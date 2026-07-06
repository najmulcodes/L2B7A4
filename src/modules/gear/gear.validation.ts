import { z } from 'zod';
import { GEAR_CONDITIONS } from '../../config/constants';

export const createGearSchema = z.object({
  categoryId: z.uuid({ error: 'A valid categoryId is required' }),
  name: z.string().trim().min(2, { error: 'Name must be at least 2 characters' }).max(150),
  description: z.string().trim().min(10, { error: 'Description must be at least 10 characters' }).max(3000),
  brand: z.string().trim().max(100).optional(),
  images: z
    .array(z.url({ error: 'Each image must be a valid URL' }))
    .min(1, { error: 'At least one image is required' })
    .max(10, { error: 'A maximum of 10 images is allowed' }),
  pricePerDay: z.coerce.number().positive({ error: 'pricePerDay must be greater than 0' }),
  securityDeposit: z.coerce.number().min(0).default(0),
  quantityTotal: z.coerce.number().int().positive({ error: 'quantityTotal must be at least 1' }),
  condition: z.enum(GEAR_CONDITIONS).default('GOOD'),
  location: z.string().trim().min(2, { error: 'Location is required' }).max(150),
  specifications: z.record(z.string(), z.unknown()).optional(),
});
export type CreateGearInput = z.infer<typeof createGearSchema>;

export const updateGearSchema = z.object({
  categoryId: z.uuid().optional(),
  name: z.string().trim().min(2).max(150).optional(),
  description: z.string().trim().min(10).max(3000).optional(),
  brand: z.string().trim().max(100).optional(),
  images: z.array(z.url()).min(1).max(10).optional(),
  pricePerDay: z.coerce.number().positive().optional(),
  securityDeposit: z.coerce.number().min(0).optional(),
  quantityTotal: z.coerce.number().int().positive().optional(),
  condition: z.enum(GEAR_CONDITIONS).optional(),
  location: z.string().trim().min(2).max(150).optional(),
  specifications: z.record(z.string(), z.unknown()).optional(),
  isActive: z.boolean().optional(),
});
export type UpdateGearInput = z.infer<typeof updateGearSchema>;

const sortOptions = ['price_asc', 'price_desc', 'newest', 'rating'] as const;

export const listGearQuerySchema = z.object({
  search: z.string().trim().max(150).optional(),
  categoryId: z.uuid().optional(),
  brand: z.string().trim().max(100).optional(),
  location: z.string().trim().max(150).optional(),
  condition: z.enum(GEAR_CONDITIONS).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  availableOnly: z.coerce.boolean().optional().default(false),
  sortBy: z.enum(sortOptions).default('newest'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});
export type ListGearQuery = z.infer<typeof listGearQuerySchema>;

export const listMyGearQuerySchema = z.object({
  status: z.enum(['active', 'inactive', 'all']).default('all'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});
export type ListMyGearQuery = z.infer<typeof listMyGearQuerySchema>;
