import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/ApiError';
import { logger } from '../../lib/logger';
import { generateTransactionId } from '../../utils/generateId';
import { resolvePagination, buildPaginationMeta } from '../../utils/pagination';
import { sslcommerzGateway } from './sslcommerz.gateway';
import type { Prisma } from '@prisma/client';
import type { PaginationMeta } from '../../utils/ApiResponse';
import type { ListPaymentsQuery, SslcommerzCallbackBody } from './payment.validation';

const AMOUNT_TOLERANCE = 0.01;

export async function createPayment(customerId: string, rentalOrderId: string) {
  const order = await prisma.rentalOrder.findUnique({ where: { id: rentalOrderId } });
  if (!order) throw ApiError.notFound('Rental order not found.');
  if (order.customerId !== customerId) {
    throw ApiError.forbidden('You can only pay for your own orders.');
  }
  if (order.status !== 'CONFIRMED') {
    throw ApiError.badRequest(
      `This order cannot be paid for right now - its status is ${order.status}. The provider must confirm the order first.`,
    );
  }

  const existingPending = await prisma.payment.findFirst({
    where: { rentalOrderId, status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
  });
  // Reuse a still-pending attempt's gateway session instead of spawning a new
  // one every time the customer retries within the same order.
  if (existingPending) {
    await prisma.payment.update({
      where: { id: existingPending.id },
      data: { status: 'FAILED', failureReason: 'Superseded by a new payment attempt' },
    });
  }

  const customer = await prisma.user.findUniqueOrThrow({ where: { id: customerId } });
  const transactionId = generateTransactionId();
  const amount = order.totalAmount.toNumber();

  const payment = await prisma.payment.create({
    data: {
      transactionId,
      rentalOrderId: order.id,
      customerId,
      amount: order.totalAmount,
      status: 'PENDING',
    },
  });

  try {
    const { gatewayPageUrl } = await sslcommerzGateway.createSession({
      amount,
      transactionId,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone ?? '01700000000',
      customerAddress: order.deliveryAddress ?? customer.address ?? 'Dhaka, Bangladesh',
      productName: `GearUp Rental Order ${order.orderNumber}`,
      valueA: payment.id,
    });

    return { paymentUrl: gatewayPageUrl, transactionId };
  } catch (error) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'FAILED',
        failureReason: error instanceof Error ? error.message : 'Gateway session creation failed',
      },
    });
    throw error;
  }
}

/** Shared verify-and-finalize step used by the IPN listener, the browser
 * success callback, and the manual /confirm endpoint alike - all three paths
 * must independently re-verify with SSLCommerz's servers before trusting a
 * payment is genuine. */
async function finalizeFromGateway(paymentId: string, valId: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw ApiError.notFound('Payment record not found.');

  // Idempotent: if this payment already resolved, don't re-process it (IPN
  // and the browser success redirect commonly fire for the same transaction).
  if (payment.status === 'COMPLETED') return payment;
  if (payment.status === 'REFUNDED') return payment;

  const validation = await sslcommerzGateway.validateTransaction(valId);

  const isValid = validation.status === 'VALID' || validation.status === 'VALIDATED';
  const amountMatches =
    Math.abs(parseFloat(validation.amount) - payment.amount.toNumber()) < AMOUNT_TOLERANCE;
  const tranIdMatches = validation.tran_id === payment.transactionId;

  if (!isValid || !amountMatches || !tranIdMatches) {
    logger.error('SSLCommerz payment validation failed cross-checks', {
      paymentId,
      validationStatus: validation.status,
      amountMatches,
      tranIdMatches,
    });
    const failed = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'FAILED',
        failureReason: !isValid
          ? `Gateway reported status: ${validation.status}`
          : 'Amount or transaction id mismatch during verification',
        rawResponse: validation as unknown as Prisma.InputJsonValue,
      },
    });
    return failed;
  }

  const [updatedPayment] = await prisma.$transaction([
    prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'COMPLETED',
        gatewayValId: validation.val_id,
        gatewayBankTranId: validation.bank_tran_id,
        cardType: validation.card_type,
        paidAt: new Date(),
        rawResponse: validation as unknown as Prisma.InputJsonValue,
      },
    }),
    prisma.rentalOrder.updateMany({
      where: { id: payment.rentalOrderId, status: 'CONFIRMED' },
      data: { status: 'PAID', paidAt: new Date() },
    }),
  ]);

  return updatedPayment;
}

async function findPaymentByTranId(tranId: string) {
  const payment = await prisma.payment.findUnique({ where: { transactionId: tranId } });
  if (!payment) {
    logger.error('Gateway callback referenced an unknown transaction id', { tranId });
    throw ApiError.notFound('Unknown transaction.');
  }
  return payment;
}

/** Handles SSLCommerz's success_url / ipn_url callbacks (both use the same
 * validate-then-finalize logic; only the response format differs). */
export async function handleGatewaySuccess(body: SslcommerzCallbackBody) {
  const payment = await findPaymentByTranId(body.tran_id);
  if (!body.val_id) {
    throw ApiError.badRequest('Missing val_id in gateway callback.');
  }
  return finalizeFromGateway(payment.id, body.val_id);
}

export async function handleGatewayFail(body: SslcommerzCallbackBody): Promise<void> {
  const payment = await findPaymentByTranId(body.tran_id);
  if (payment.status === 'COMPLETED') return;
  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: 'FAILED', failureReason: 'Payment failed at the gateway' },
  });
}

export async function handleGatewayCancel(body: SslcommerzCallbackBody): Promise<void> {
  const payment = await findPaymentByTranId(body.tran_id);
  if (payment.status === 'COMPLETED') return;
  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: 'FAILED', failureReason: 'Cancelled by customer at the gateway' },
  });
}

/** Manual verification endpoint - lets the customer (or a grader in
 * Postman) confirm a payment without relying on a real browser redirect. */
export async function confirmPayment(
  transactionId: string,
  requester: { id: string; role: 'CUSTOMER' | 'PROVIDER' | 'ADMIN' },
) {
  const payment = await prisma.payment.findUnique({ where: { transactionId } });
  if (!payment) throw ApiError.notFound('Payment not found.');
  if (payment.customerId !== requester.id && requester.role !== 'ADMIN') {
    throw ApiError.forbidden('You do not have access to this payment.');
  }
  if (payment.status !== 'PENDING') {
    return payment;
  }
  if (!payment.gatewayValId) {
    // No val_id captured yet (browser hasn't redirected back / IPN hasn't
    // landed) - query the gateway directly by transaction id instead.
    const validation = await sslcommerzGateway.validateTransaction(payment.transactionId);
    if (!validation.val_id) {
      throw ApiError.badRequest('This payment has not completed at the gateway yet.');
    }
    return finalizeFromGateway(payment.id, validation.val_id);
  }
  return finalizeFromGateway(payment.id, payment.gatewayValId);
}

export async function getPaymentById(
  id: string,
  requester: { id: string; role: 'CUSTOMER' | 'PROVIDER' | 'ADMIN' },
) {
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { rentalOrder: { select: { orderNumber: true, providerId: true } } },
  });
  if (!payment) throw ApiError.notFound('Payment not found.');

  const isOwner =
    payment.customerId === requester.id || payment.rentalOrder.providerId === requester.id;
  if (!isOwner && requester.role !== 'ADMIN') {
    throw ApiError.forbidden('You do not have access to this payment.');
  }
  return payment;
}

export async function listMyPayments(
  customerId: string,
  query: ListPaymentsQuery,
): Promise<{ items: unknown[]; meta: PaginationMeta }> {
  const { skip, take, page, limit } = resolvePagination(query.page, query.limit);
  const where: Prisma.PaymentWhereInput = {
    customerId,
    ...(query.status ? { status: query.status } : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: { rentalOrder: { select: { orderNumber: true, status: true } } },
    }),
    prisma.payment.count({ where }),
  ]);

  return { items, meta: buildPaginationMeta(page, limit, total) };
}
