import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/ApiError';
import { resolvePagination, buildPaginationMeta } from '../../utils/pagination';
import type { Prisma } from '../../generated/prisma/client';
import type { PaginationMeta } from '../../utils/ApiResponse';
import type { CreateReviewInput, ListReviewsQuery } from './review.validation';

async function recomputeGearRating(tx: Prisma.TransactionClient, gearItemId: string): Promise<void> {
  const aggregate = await tx.review.aggregate({
    where: { gearItemId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  await tx.gearItem.update({
    where: { id: gearItemId },
    data: {
      avgRating: aggregate._avg.rating ?? 0,
      reviewCount: aggregate._count.rating,
    },
  });
}

export async function createReview(customerId: string, input: CreateReviewInput) {
  const order = await prisma.rentalOrder.findUnique({
    where: { id: input.rentalOrderId },
    include: { items: { select: { gearItemId: true } } },
  });

  if (!order) throw ApiError.notFound('Rental order not found.');
  if (order.customerId !== customerId) {
    throw ApiError.forbidden('You can only review your own rentals.');
  }
  if (order.status !== 'RETURNED') {
    throw ApiError.badRequest('You can only review gear after the rental has been returned.');
  }
  const orderedThisGear = order.items.some((item) => item.gearItemId === input.gearItemId);
  if (!orderedThisGear) {
    throw ApiError.badRequest('This gear item was not part of the specified order.');
  }

  const existing = await prisma.review.findUnique({
    where: {
      customerId_gearItemId_rentalOrderId: {
        customerId,
        gearItemId: input.gearItemId,
        rentalOrderId: input.rentalOrderId,
      },
    },
  });
  if (existing) {
    throw ApiError.conflict('You have already reviewed this gear item for this order.');
  }

  return prisma.$transaction(async (tx) => {
    const review = await tx.review.create({
      data: {
        customerId,
        gearItemId: input.gearItemId,
        rentalOrderId: input.rentalOrderId,
        rating: input.rating,
        comment: input.comment,
      },
      include: { customer: { select: { name: true, avatarUrl: true } } },
    });
    await recomputeGearRating(tx, input.gearItemId);
    return review;
  });
}

export async function listReviews(
  query: ListReviewsQuery,
): Promise<{ items: unknown[]; meta: PaginationMeta }> {
  const { skip, take, page, limit } = resolvePagination(query.page, query.limit);
  const where: Prisma.ReviewWhereInput = query.gearItemId ? { gearItemId: query.gearItemId } : {};

  const [items, total] = await prisma.$transaction([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: { customer: { select: { name: true, avatarUrl: true } } },
    }),
    prisma.review.count({ where }),
  ]);

  return { items, meta: buildPaginationMeta(page, limit, total) };
}

export async function deleteReview(
  id: string,
  requester: { id: string; role: 'CUSTOMER' | 'PROVIDER' | 'ADMIN' },
): Promise<void> {
  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) throw ApiError.notFound('Review not found.');
  if (review.customerId !== requester.id && requester.role !== 'ADMIN') {
    throw ApiError.forbidden('You can only delete your own reviews.');
  }

  await prisma.$transaction(async (tx) => {
    await tx.review.delete({ where: { id } });
    await recomputeGearRating(tx, review.gearItemId);
  });
}
