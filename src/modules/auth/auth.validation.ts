import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, { error: 'Password must be at least 8 characters long' })
  .regex(/[A-Za-z]/, { error: 'Password must contain at least one letter' })
  .regex(/[0-9]/, { error: 'Password must contain at least one number' });

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, { error: 'Name must be at least 2 characters' }).max(100),
    email: z.email({ error: 'A valid email address is required' }).toLowerCase(),
    password: passwordSchema,
    phone: z.string().trim().min(6).max(20).optional(),
    role: z.enum(['CUSTOMER', 'PROVIDER'], {
      error: 'Role must be either CUSTOMER or PROVIDER',
    }),
    businessName: z.string().trim().min(2).max(150).optional(),
    address: z.string().trim().max(255).optional(),
  })
  .refine((data) => data.role !== 'PROVIDER' || !!data.businessName, {
    error: 'businessName is required when registering as a PROVIDER',
    path: ['businessName'],
  });
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.email({ error: 'A valid email address is required' }).toLowerCase(),
  password: z.string().min(1, { error: 'Password is required' }),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, { error: 'refreshToken is required' }),
});
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().min(6).max(20).optional(),
  address: z.string().trim().max(255).optional(),
  avatarUrl: z.url({ error: 'avatarUrl must be a valid URL' }).optional(),
  businessName: z.string().trim().min(2).max(150).optional(),
  bio: z.string().trim().max(1000).optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, { error: 'currentPassword is required' }),
  newPassword: passwordSchema,
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
