import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/ApiResponse';
import * as authService from './auth.service';
import type {
  RegisterInput,
  LoginInput,
  RefreshTokenInput,
  UpdateProfileInput,
  ChangePasswordInput,
} from './auth.validation';

export async function registerHandler(req: Request, res: Response): Promise<void> {
  const result = await authService.register(req.body as RegisterInput);
  sendSuccess(res, 201, 'Account created successfully. / অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে।', result);
}

export async function loginHandler(req: Request, res: Response): Promise<void> {
  const result = await authService.login(req.body as LoginInput);
  sendSuccess(res, 200, 'Logged in successfully. / সফলভাবে লগইন হয়েছে।', result);
}

export async function refreshHandler(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body as RefreshTokenInput;
  const result = await authService.refresh(refreshToken);
  sendSuccess(res, 200, 'Token refreshed successfully.', result);
}

export async function logoutHandler(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body as RefreshTokenInput;
  await authService.logout(refreshToken);
  sendSuccess(res, 200, 'Logged out successfully. / সফলভাবে লগআউট হয়েছে।');
}

export async function getMeHandler(req: Request, res: Response): Promise<void> {
  const user = await authService.getMe(req.user!.id);
  sendSuccess(res, 200, 'Profile fetched successfully.', user);
}

export async function updateProfileHandler(req: Request, res: Response): Promise<void> {
  const user = await authService.updateProfile(req.user!.id, req.body as UpdateProfileInput);
  sendSuccess(res, 200, 'Profile updated successfully. / প্রোফাইল সফলভাবে আপডেট হয়েছে।', user);
}

export async function changePasswordHandler(req: Request, res: Response): Promise<void> {
  await authService.changePassword(req.user!.id, req.body as ChangePasswordInput);
  sendSuccess(res, 200, 'Password changed successfully. / পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে।');
}
