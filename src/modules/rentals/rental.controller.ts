import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/ApiResponse';
import * as rentalService from './rental.service';
import type {
  CreateRentalOrderInput,
  ListRentalsQuery,
  UpdateOrderStatusInput,
  CancelOrderInput,
} from './rental.validation';

export async function createRentalOrderHandler(req: Request, res: Response): Promise<void> {
  const order = await rentalService.createRentalOrder(
    req.user!.id,
    req.body as CreateRentalOrderInput,
  );
  sendSuccess(res, 201, 'Rental order placed successfully. / রেন্টাল অর্ডার সফলভাবে করা হয়েছে।', order);
}

export async function getRentalOrderHandler(req: Request, res: Response): Promise<void> {
  const order = await rentalService.getRentalOrderById(req.params.id as string, req.user!);
  sendSuccess(res, 200, 'Rental order fetched successfully.', order);
}

export async function listMyRentalOrdersHandler(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as unknown as ListRentalsQuery;
  const { items, meta } = await rentalService.listMyRentalOrders(req.user!.id, query);
  sendSuccess(res, 200, 'Rental orders fetched successfully.', items, meta);
}

export async function cancelRentalOrderHandler(req: Request, res: Response): Promise<void> {
  const order = await rentalService.cancelRentalOrder(
    req.params.id as string,
    req.user!.id,
    req.body as CancelOrderInput,
  );
  sendSuccess(res, 200, 'Rental order cancelled successfully. / অর্ডার বাতিল করা হয়েছে।', order);
}

export async function listProviderOrdersHandler(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as unknown as ListRentalsQuery;
  const { items, meta } = await rentalService.listProviderOrders(req.user!.id, query);
  sendSuccess(res, 200, 'Orders fetched successfully.', items, meta);
}

export async function getProviderOrderHandler(req: Request, res: Response): Promise<void> {
  const order = await rentalService.getRentalOrderById(req.params.id as string, req.user!);
  sendSuccess(res, 200, 'Order fetched successfully.', order);
}

export async function updateOrderStatusHandler(req: Request, res: Response): Promise<void> {
  const order = await rentalService.updateOrderStatus(
    req.params.id as string,
    req.user!.id,
    req.body as UpdateOrderStatusInput,
  );
  sendSuccess(res, 200, `Order marked as ${order.status.toLowerCase()} successfully.`, order);
}
