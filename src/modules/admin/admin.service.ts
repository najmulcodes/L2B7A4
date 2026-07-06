import { Prisma } from '../../generated/prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/ApiError';
import { logger } from '../../lib/logger';
import { resolvePagination, buildPaginationMeta } from '../../utils/pagination';
import { restoreInventory, ORDER_INCLUDE } from '../rentals/rental.service';
import { sslcommerzGateway } from '../payments/sslcommerz.gateway';
import type { PaginationMeta } from '../../utils/ApiResponse';
import type {
  ListUsersQuery,
  UpdateUserStatusInput,
  ListAdminGearQuery,
  ListAdminRentalsQuery,
} from './admin.validation';

const USER_ADMIN_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  businessName: true,
  createdAt: true,
} as const;

export async function listUsers(
  query: ListUsersQuery,
): Promise<{ items: unknown[]; meta: PaginationMeta }> {
  const { skip, take, page, limit } = resolvePagination(query.page, query.limit);
  const where: Prisma.UserWhereInput = {
    ...(query.role ? { role: query.role } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      select: USER_ADMIN_SELECT,
    }),
    prisma.user.count({ where }),
  ]);

  return { items, meta: buildPaginationMeta(page, limit, total) };
}

export async function updateUserStatus(id: string, input: UpdateUserStatusInput) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw ApiError.notFound('User not found.');
  if (user.role === 'ADMIN') {
    throw ApiError.forbidden('Admin accounts cannot be suspended through this endpoint.');
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { status: input.status },
    select: USER_ADMIN_SELECT,
  });

  if (input.status === 'SUSPENDED') {
    await prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  return updated;
}

export async function listAllGear(
  query: ListAdminGearQuery,
): Promise<{ items: unknown[]; meta: PaginationMeta }> {
  const { skip, take, page, limit } = resolvePagination(query.page, query.limit);
  const where: Prisma.GearItemWhereInput = {
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    ...(query.providerId ? { providerId: query.providerId } : {}),
    ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.gearItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        category: { select: { id: true, name: true } },
        provider: { select: { id: true, name: true, businessName: true } },
      },
    }),
    prisma.gearItem.count({ where }),
  ]);

  return { items, meta: buildPaginationMeta(page, limit, total) };
}

export async function listAllRentals(
  query: ListAdminRentalsQuery,
): Promise<{ items: unknown[]; meta: PaginationMeta }> {
  const { skip, take, page, limit } = resolvePagination(query.page, query.limit);
  const where: Prisma.RentalOrderWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.customerId ? { customerId: query.customerId } : {}),
    ...(query.providerId ? { providerId: query.providerId } : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.rentalOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: ORDER_INCLUDE,
    }),
    prisma.rentalOrder.count({ where }),
  ]);

  return { items, meta: buildPaginationMeta(page, limit, total) };
}

/**
 * Admin override: force-cancels an order regardless of its current status
 * (short of RETURNED/CANCELLED, which are already terminal). If a completed
 * payment exists, a real refund is initiated with SSLCommerz before any
 * database state changes - if the gateway call fails, nothing is mutated.
 */
export async function forceCancelOrder(orderId: string, cancelReason: string) {
  const order = await prisma.rentalOrder.findUnique({ where: { id: orderId } });
  if (!order) throw ApiError.notFound('Rental order not found.');
  if (order.status === 'RETURNED' || order.status === 'CANCELLED') {
    throw ApiError.badRequest(`This order is already ${order.status.toLowerCase()} and cannot be cancelled.`);
  }

  const completedPayment = await prisma.payment.findFirst({
    where: { rentalOrderId: orderId, status: 'COMPLETED' },
  });

  if (completedPayment) {
    if (!completedPayment.gatewayBankTranId) {
      logger.error('Cannot refund payment without a gateway bank transaction id', {
        paymentId: completedPayment.id,
      });
      throw ApiError.internal('This payment is missing gateway details required to process a refund.');
    }

    const refundResult = await sslcommerzGateway.refund({
      bankTranId: completedPayment.gatewayBankTranId,
      amount: completedPayment.amount.toNumber(),
      reason: cancelReason,
    });

    return prisma.$transaction(async (tx) => {
      await restoreInventory(tx, orderId);
      await tx.payment.update({
        where: { id: completedPayment.id },
        data: {
          status: 'REFUNDED',
          rawResponse: refundResult as unknown as Prisma.InputJsonValue,
        },
      });
      return tx.rentalOrder.update({
        where: { id: orderId },
        data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason },
        include: ORDER_INCLUDE,
      });
    });
  }

  return prisma.$transaction(async (tx) => {
    await restoreInventory(tx, orderId);
    return tx.rentalOrder.update({
      where: { id: orderId },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason },
      include: ORDER_INCLUDE,
    });
  });
}
