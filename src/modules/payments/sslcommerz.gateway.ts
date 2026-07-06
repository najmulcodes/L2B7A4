import SSLCommerzPayment from 'sslcommerz-lts';
import type { SslInitRequest, SslInitResponse, SslValidationResponse } from 'sslcommerz-lts';
import { env } from '../../config/env';
import { logger } from '../../lib/logger';
import { ApiError } from '../../utils/ApiError';
import { SSLCOMMERZ_PRODUCT_PROFILE } from '../../config/constants';

const sslcz = new SSLCommerzPayment(
  env.SSLCOMMERZ_STORE_ID,
  env.SSLCOMMERZ_STORE_PASSWORD,
  env.SSLCOMMERZ_IS_LIVE,
);

export interface CreateSessionInput {
  amount: number;
  transactionId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  productName: string;
  /** Custom pass-through value echoed back on every callback - we use it to
   * carry our own paymentId for a cheap cross-check against tran_id. */
  valueA: string;
}

/**
 * Thin adapter around the sslcommerz-lts SDK. Keeping all gateway-specific
 * request shaping in one place means swapping to a different provider (e.g.
 * Stripe) later only means writing a new adapter with this same interface -
 * nothing in payment.service.ts would need to change.
 */
export const sslcommerzGateway = {
  async createSession(input: CreateSessionInput): Promise<{ gatewayPageUrl: string }> {
    const callbackBase = env.APP_BASE_URL.replace(/\/+$/, '');

    const payload: SslInitRequest = {
      total_amount: input.amount,
      currency: 'BDT',
      tran_id: input.transactionId,
      success_url: `${callbackBase}/api/payments/success`,
      fail_url: `${callbackBase}/api/payments/fail`,
      cancel_url: `${callbackBase}/api/payments/cancel`,
      ipn_url: `${callbackBase}/api/payments/ipn`,
      shipping_method: 'NO',
      product_name: input.productName,
      product_category: 'Sports & Outdoor Gear Rental',
      product_profile: SSLCOMMERZ_PRODUCT_PROFILE,

      cus_name: input.customerName,
      cus_email: input.customerEmail,
      cus_add1: input.customerAddress,
      cus_city: 'Dhaka',
      cus_state: 'Dhaka',
      cus_postcode: '1000',
      cus_country: 'Bangladesh',
      cus_phone: input.customerPhone,

      ship_name: input.customerName,
      ship_add1: input.customerAddress,
      ship_city: 'Dhaka',
      ship_state: 'Dhaka',
      ship_postcode: '1000',
      ship_country: 'Bangladesh',

      value_a: input.valueA,
    };

    let response: SslInitResponse;
    try {
      response = await sslcz.init(payload);
    } catch (error) {
      logger.error('SSLCommerz session init request failed', {
        message: error instanceof Error ? error.message : String(error),
      });
      throw ApiError.internal('Could not reach the payment gateway. Please try again shortly.');
    }

    if (response.status !== 'SUCCESS' || !response.GatewayPageURL) {
      logger.error('SSLCommerz session init rejected', { response });
      throw ApiError.internal(
        response.failedreason ?? 'The payment gateway rejected this transaction.',
      );
    }

    return { gatewayPageUrl: response.GatewayPageURL };
  },

  async validateTransaction(valId: string): Promise<SslValidationResponse> {
    try {
      return await sslcz.validate({ val_id: valId });
    } catch (error) {
      logger.error('SSLCommerz validation request failed', {
        message: error instanceof Error ? error.message : String(error),
      });
      throw ApiError.internal('Could not verify this payment with the gateway right now.');
    }
  },

  async refund(input: {
    bankTranId: string;
    amount: number;
    reason: string;
  }): Promise<{ refundRefId?: string; status: string }> {
    try {
      const result = await sslcz.initiateRefund({
        refund_amount: input.amount,
        refund_remarks: input.reason,
        bank_tran_id: input.bankTranId,
        refe_id: input.bankTranId,
      });
      return { refundRefId: result.refund_ref_id, status: result.status };
    } catch (error) {
      logger.error('SSLCommerz refund request failed', {
        message: error instanceof Error ? error.message : String(error),
      });
      throw ApiError.internal('Could not initiate the refund with the gateway right now.');
    }
  },
};
