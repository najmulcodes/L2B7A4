import { Prisma } from '../../generated/prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/ApiError';
import { generateOrderNumber } from '../../utils/generateId';
import { resolvePagination, buildPaginationMeta } from '../../utils/pagination';
import { MIN_RENTAL_DAYS, MAX_BOOKING_HORIZON_DAYS } from '../../config/constants';
import type { PaginationMeta } from '../../utils/ApiResponse';
import type {
  CreateRentalOrderInput,
  ListRentalsQuery,
  UpdateOrderStatusInput,
  CancelOrderInput,
} from './rental.validation';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const ORDER_INCLUDE = {
  items: {
    include: {
      gearItem: {
        select: { id: true, name: true, images: true, condition: true },
      },
    },
  },
  customer: { select: { id: true, name: true, email: true, phone: true } },
  provider: { select: { id: true, name: true, businessName: true, phone: true } },
} satisfies Prisma.RentalOrderInclude;

function calculateTotalDays(startDate: Date, endDate: Date): number {
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / MS_PER_DAY);
  return Math.max(days, MIN_RENTAL_DAYS);
}

export async function createRentalOrder(customerId: string, input: CreateRentalOrderInput) {
  const horizonLimitMs = MAX_BOOKING_HORIZON_DAYS * MS_PER_DAY;
  if (input.startDate.getTime() - Date.now() > horizonLimitMs) {
    throw ApiError.badRequest(`startDate cannot be more than ${MAX_BOOKING_HORIZON_DAYS} days out.`);
  }

  const gearItemIds = input.items.map((item) => item.gearItemId);
  const gearItems = await prisma.gearItem.findMany({ where: { id: { in: gearItemIds } } });

  if (gearItems.length !== new Set(gearItemIds).size) {
    throw ApiError.badRequest('One or more gear items could not be found.');
  }

  const gearById = new Map(gearItems.map((g) => [g.id, g]));
  const providerIds = new Set(gearItems.map((g) => g.providerId));
  if (providerIds.size > 1) {
    throw ApiError.badRequest(
      'All items in a single order must belong to the same provider. Please place separate orders for gear from different providers.',
    );
  }

  for (const requested of input.items) {
    const gear = gearById.get(requested.gearItemId)!;
    if (!gear.isActive) {
      throw ApiError.badRequest(`"${gear.name}" is no longer available for rent.`);
    }
    if (gear.quantityAvailable < requested.quantity) {
      throw ApiError.conflict(
        `Only ${gear.quantityAvailable} unit(s) of "${gear.name}" are available, but ${requested.quantity} were requested.`,
      );
    }
  }

  const totalDays = calculateTotalDays(input.startDate, input.endDate);
  const providerId = [...providerIds][0]!;

  const lineItems = input.items.map((requested) => {
    const gear = gearById.get(requested.gearItemId)!;
    const lineTotal = gear.pricePerDay.toNumber() * requested.quantity * totalDays;
    const depositLine = gear.securityDeposit.toNumber() * requested.quantity;
    return {
      gearItemId: gear.id,
      quantity: requested.quantity,
      pricePerDay: gear.pricePerDay,
      days: totalDays,
      lineTotal: new Prisma.Decimal(lineTotal),
      depositLine: new Prisma.Decimal(depositLine),
    };
  });

  const subtotal = lineItems.reduce((sum, li) => sum + li.lineTotal.toNumber(), 0);
  const depositTotal = lineItems.reduce((sum, li) => sum + li.depositLine.toNumber(), 0);
  const totalAmount = subtotal + depositTotal;

  const order = await prisma.$transaction(async (tx) => {
    for (const requested of input.items) {
      const result = await tx.gearItem.updateMany({
        where: { id: requested.gearItemId, quantityAvailable: { gte: requested.quantity } },
        data: { quantityAvailable: { decrement: requested.quantity } },
      });
      if (result.count === 0) {
        const gear = gearById.get(requested.gearItemId)!;
        throw ApiError.conflict(
          `"${gear.name}" was just booked by someone else. Please adjust the quantity and try again.`,
        );
      }
    }

    return tx.rentalOrder.create({
      data: {
        orderNumber: generateOrderNumber(),
        customerId,
        providerId,
        startDate: input.startDate,
        endDate: input.endDate,
        totalDays,
        subtotal: new Prisma.Decimal(subtotal),
        depositTotal: new Prisma.Decimal(depositTotal),
        totalAmount: new Prisma.Decimal(totalAmount),
        deliveryAddress: input.deliveryAddress,
        notes: input.notes,
        items: {
          create: lineItems.map((li) => ({
            gearItemId: li.gearItemId,
            quantity: li.quantity,
            pricePerDay: li.pricePerDay,
            days: li.days,
            lineTotal: li.lineTotal,
          })),
        },
      },
      include: ORDER_INCLUDE,
    });
  });

  return order;
}

export async function getRentalOrderById(
  id: string,
  requester: { id: string; role: 'CUSTOMER' | 'PROVIDER' | 'ADMIN' },
) {
  const order = await prisma.rentalOrder.findUnique({ where: { id }, include: ORDER_INCLUDE });
  if (!order) throw ApiError.notFound('Rental order not found.');

  const isOwner = order.customerId === requester.id || order.providerId === requester.id;
  if (!isOwner && requester.role !== 'ADMIN') {
    throw ApiError.forbidden('You do not have access to this order.');
  }
  return order;
}

export async function listMyRentalOrders(
  customerId: string,
  query: ListRentalsQuery,
): Promise<{ items: unknown[]; meta: PaginationMeta }> {
  const { skip, take, page, limit } = resolvePagination(query.page, query.limit);
  const where: Prisma.RentalOrderWhereInput = {
    customerId,
    ...(query.status ? { status: query.status } : {}),
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

export async function listProviderOrders(
  providerId: string,
  query: ListRentalsQuery,
): Promise<{ items: unknown[]; meta: PaginationMeta }> {
  const { skip, take, page, limit } = resolvePagination(query.page, query.limit);
  const where: Prisma.RentalOrderWhereInput = {
    providerId,
    ...(query.status ? { status: query.status } : {}),
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

/** Restores reserved inventory - used on both customer cancellation and
 * completed returns (RETURNED makes the physical unit available again).
 * Exported for reuse by the admin module's force-cancel override. */
export async function restoreInventory(tx: Prisma.TransactionClient, orderId: string): Promise<void> {
  const items = await tx.rentalOrderItem.findMany({ where: { rentalOrderId: orderId } });
  for (const item of items) {
    await tx.gearItem.update({
      where: { id: item.gearItemId },
      data: { quantityAvailable: { increment: item.quantity } },
    });
  }
}

export async function cancelRentalOrder(
  orderId: string,
  customerId: string,
  input: CancelOrderInput,
) {
  const order = await prisma.rentalOrder.findUnique({ where: { id: orderId } });
  if (!order) throw ApiError.notFound('Rental order not found.');
  if (order.customerId !== customerId) {
    throw ApiError.forbidden('You can only cancel your own orders.');
  }
  if (order.status !== 'PLACED') {
    throw ApiError.badRequest(
      `This order can no longer be cancelled - it has already been ${order.status.toLowerCase()}. Once a provider confirms an order, contact them directly.`,
    );
  }

  return prisma.$transaction(async (tx) => {
    await restoreInventory(tx, orderId);
    return tx.rentalOrder.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelReason: input.cancelReason,
      },
      include: ORDER_INCLUDE,
    });
  });
}

const VALID_TRANSITIONS: Record<string, string> = {
  CONFIRMED: 'PLACED',
  PICKED_UP: 'PAID',
  RETURNED: 'PICKED_UP',
};

export async function updateOrderStatus(
  orderId: string,
  providerId: string,
  input: UpdateOrderStatusInput,
) {
  const order = await prisma.rentalOrder.findUnique({ where: { id: orderId } });
  if (!order) throw ApiError.notFound('Rental order not found.');
  if (order.providerId !== providerId) {
    throw ApiError.forbidden('You can only manage orders for your own gear.');
  }

  const requiredCurrentStatus = VALID_TRANSITIONS[input.status];
  if (order.status !== requiredCurrentStatus) {
    throw ApiError.badRequest(
      `Cannot mark order as ${input.status} - it must currently be ${requiredCurrentStatus}, but is ${order.status}.`,
    );
  }

  if (input.status === 'CONFIRMED') {
    return prisma.rentalOrder.update({
      where: { id: orderId },
      data: { status: 'CONFIRMED', confirmedAt: new Date() },
      include: ORDER_INCLUDE,
    });
  }

  if (input.status === 'PICKED_UP') {
    return prisma.rentalOrder.update({
      where: { id: orderId },
      data: { status: 'PICKED_UP', pickedUpAt: new Date() },
      include: ORDER_INCLUDE,
    });
  }

  // RETURNED: releases the reserved units back into available inventory.
  return prisma.$transaction(async (tx) => {
    await restoreInventory(tx, orderId);
    return tx.rentalOrder.update({
      where: { id: orderId },
      data: { status: 'RETURNED', returnedAt: new Date() },
      include: ORDER_INCLUDE,
    });
  });
}
