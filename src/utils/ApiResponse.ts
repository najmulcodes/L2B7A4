import type { Response } from 'express';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface SuccessPayload<T> {
  success: true;
  message: string;
  data?: T;
  meta?: PaginationMeta;
}

/** Sends a consistent `{ success: true, message, data, meta? }` JSON response. */
export function sendSuccess<T>(
  res: Response,
  statusCode: number,
  message: string,
  data?: T,
  meta?: PaginationMeta,
): void {
  const payload: SuccessPayload<T> = { success: true, message };
  if (data !== undefined) payload.data = data;
  if (meta !== undefined) payload.meta = meta;
  res.status(statusCode).json(payload);
}
