/**
 * `sslcommerz-lts` ships no type declarations. This file types only the
 * subset of the API this project actually uses, based on the package's
 * documented request/response fields.
 */
declare module 'sslcommerz-lts' {
  export interface SslInitRequest {
    total_amount: number;
    currency: 'BDT' | 'USD' | 'EUR' | 'GBP' | 'SGD';
    tran_id: string;
    success_url: string;
    fail_url: string;
    cancel_url: string;
    ipn_url: string;
    shipping_method: string;
    product_name: string;
    product_category: string;
    product_profile: string;

    cus_name: string;
    cus_email: string;
    cus_add1: string;
    cus_add2?: string;
    cus_city: string;
    cus_state: string;
    cus_postcode: string;
    cus_country: string;
    cus_phone: string;
    cus_fax?: string;

    ship_name: string;
    ship_add1: string;
    ship_add2?: string;
    ship_city: string;
    ship_state: string;
    ship_postcode: string;
    ship_country: string;

    // Free-form pass-through fields, echoed back on callbacks/IPN - useful
    // for cross-referencing our own internal IDs.
    value_a?: string;
    value_b?: string;
    value_c?: string;
    value_d?: string;

    [key: string]: unknown;
  }

  export interface SslInitResponse {
    status: 'SUCCESS' | 'FAILED';
    failedreason?: string;
    sessionkey?: string;
    GatewayPageURL?: string;
    storeBanner?: string;
    desc?: unknown;
    [key: string]: unknown;
  }

  export interface SslValidationResponse {
    status: 'VALID' | 'VALIDATED' | 'FAILED' | 'CANCELLED' | 'EXPIRED' | 'UNATTEMPTED';
    tran_date?: string;
    tran_id: string;
    val_id: string;
    amount: string;
    store_amount?: string;
    currency_type?: string;
    currency_amount?: string;
    currency?: string;
    bank_tran_id?: string;
    card_type?: string;
    card_no?: string;
    card_issuer?: string;
    card_brand?: string;
    card_issuer_country?: string;
    risk_level?: string;
    risk_title?: string;
    error?: string;
    [key: string]: unknown;
  }

  export interface SslRefundResponse {
    APIConnect: string;
    bank_tran_id?: string;
    trans_id?: string;
    refund_ref_id?: string;
    status: string;
    errorReason?: string;
    [key: string]: unknown;
  }

  export default class SSLCommerzPayment {
    constructor(store_id: string, store_passwd: string, is_live: boolean);
    init(data: SslInitRequest): Promise<SslInitResponse>;
    validate(data: { val_id: string }): Promise<SslValidationResponse>;
    initiateRefund(data: {
      refund_amount: number;
      refund_remarks: string;
      bank_tran_id: string;
      refe_id: string;
    }): Promise<SslRefundResponse>;
    refundQuery(data: { refund_ref_id: string }): Promise<Record<string, unknown>>;
    transactionQueryByTransactionId(data: { tran_id: string }): Promise<Record<string, unknown>>;
    transactionQueryBySessionId(data: { sessionkey: string }): Promise<Record<string, unknown>>;
  }
}
