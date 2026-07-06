import { z } from 'zod';

export const createPaymentSchema = z.object({
  rentalOrderId: z.uuid({ error: 'A valid rentalOrderId is required' }),
});
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

export const confirmPaymentSchema = z.object({
  transactionId: z.string().min(1, { error: 'transactionId is required' }),
});
export type ConfirmPaymentInput = z.infer<typeof confirmPaymentSchema>;

export const listPaymentsQuerySchema = z.object({
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});
export type ListPaymentsQuery = z.infer<typeof listPaymentsQuerySchema>;

/**
 * SSLCommerz posts these fields (application/x-www-form-urlencoded) to the
 * success/fail/cancel/ipn callback URLs. Only the fields we actually rely on
 * are validated strictly; everything else is passed through untyped since
 * the gateway may add fields over time.
 */
export const sslcommerzCallbackSchema = z.object({
  tran_id: z.string().min(1, { error: 'tran_id is required' }),
  val_id: z.string().optional(),
  status: z.string().optional(),
  amount: z.string().optional(),
});
export type SslcommerzCallbackBody = z.infer<typeof sslcommerzCallbackSchema>;
