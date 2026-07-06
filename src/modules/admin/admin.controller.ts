import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/ApiResponse';
import * as adminService from './admin.service';
import type {
  ListUsersQuery,
  UpdateUserStatusInput,
  ListAdminGearQuery,
  ListAdminRentalsQuery,
  AdminCancelOrderInput,
} from './admin.validation';

export async function listUsersHandler(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as unknown as ListUsersQuery;
  const { items, meta } = await adminService.listUsers(query);
  sendSuccess(res, 200, 'Users fetched successfully.', items, meta);
}

export async function updateUserStatusHandler(req: Request, res: Response): Promise<void> {
  const user = await adminService.updateUserStatus(
    req.params.id as string,
    req.body as UpdateUserStatusInput,
  );
  sendSuccess(res, 200, `User ${user.status === 'ACTIVE' ? 'activated' : 'suspended'} successfully.`, user);
}

export async function listAllGearHandler(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as unknown as ListAdminGearQuery;
  const { items, meta } = await adminService.listAllGear(query);
  sendSuccess(res, 200, 'Gear items fetched successfully.', items, meta);
}

export async function listAllRentalsHandler(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as unknown as ListAdminRentalsQuery;
  const { items, meta } = await adminService.listAllRentals(query);
  sendSuccess(res, 200, 'Rental orders fetched successfully.', items, meta);
}

export async function forceCancelOrderHandler(req: Request, res: Response): Promise<void> {
  const { cancelReason } = req.body as AdminCancelOrderInput;
  const order = await adminService.forceCancelOrder(req.params.id as string, cancelReason);
  sendSuccess(res, 200, 'Order cancelled by admin. Refund initiated if applicable.', order);
}
