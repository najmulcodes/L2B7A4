import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/ApiResponse';
import * as gearService from './gear.service';
import type {
  CreateGearInput,
  UpdateGearInput,
  ListGearQuery,
  ListMyGearQuery,
} from './gear.validation';

export async function listGearHandler(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as unknown as ListGearQuery;
  const { items, meta } = await gearService.listGear(query);
  sendSuccess(res, 200, 'Gear items fetched successfully.', items, meta);
}

export async function getGearHandler(req: Request, res: Response): Promise<void> {
  const gear = await gearService.getGearById(req.params.id as string);
  sendSuccess(res, 200, 'Gear item fetched successfully.', gear);
}

export async function createGearHandler(req: Request, res: Response): Promise<void> {
  const gear = await gearService.createGear(req.user!.id, req.body as CreateGearInput);
  sendSuccess(res, 201, 'Gear item listed successfully.', gear);
}

export async function updateGearHandler(req: Request, res: Response): Promise<void> {
  const gear = await gearService.updateGear(
    req.params.id as string,
    req.user!.id,
    req.body as UpdateGearInput,
  );
  sendSuccess(res, 200, 'Gear item updated successfully.', gear);
}

export async function deleteGearHandler(req: Request, res: Response): Promise<void> {
  await gearService.deleteGear(req.params.id as string, req.user!.id);
  sendSuccess(res, 200, 'Gear item removed successfully.');
}

export async function listMyGearHandler(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as unknown as ListMyGearQuery;
  const { items, meta } = await gearService.listMyGear(req.user!.id, query);
  sendSuccess(res, 200, 'Your gear items fetched successfully.', items, meta);
}
