import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().trim().min(2, { error: 'Category name must be at least 2 characters' }).max(80),
  description: z.string().trim().max(500).optional(),
  icon: z.string().trim().max(100).optional(),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(500).optional(),
  icon: z.string().trim().max(100).optional(),
  isActive: z.boolean().optional(),
});
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const listCategoriesQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  includeInactive: z.coerce.boolean().optional().default(false),
});
export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>;
