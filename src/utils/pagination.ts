import { PAGINATION } from '../config/constants';
import type { PaginationMeta } from './ApiResponse';

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
  take: number;
}

/** Normalizes raw (already-validated) page/limit numbers into Prisma skip/take. */
export function resolvePagination(page?: number, limit?: number): PaginationParams {
  const safePage = page && page > 0 ? page : PAGINATION.DEFAULT_PAGE;
  const safeLimit =
    limit && limit > 0 ? Math.min(limit, PAGINATION.MAX_LIMIT) : PAGINATION.DEFAULT_LIMIT;

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
    take: safeLimit,
  };
}

export function buildPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}
