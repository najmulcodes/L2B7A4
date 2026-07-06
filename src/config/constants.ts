/** Business rule constants and shared enums, kept separate from env vars. */

export const USER_ROLES = ['CUSTOMER', 'PROVIDER', 'ADMIN'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const GEAR_CONDITIONS = ['NEW', 'LIKE_NEW', 'GOOD', 'FAIR'] as const;
export type GearCondition = (typeof GEAR_CONDITIONS)[number];

export const RENTAL_ORDER_STATUSES = [
  'PLACED',
  'CONFIRMED',
  'CANCELLED',
  'PAID',
  'PICKED_UP',
  'RETURNED',
] as const;
export type RentalOrderStatusType = (typeof RENTAL_ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'] as const;
export type PaymentStatusType = (typeof PAYMENT_STATUSES)[number];

/** Pagination defaults applied across all list endpoints. */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
};

/** Minimum number of days a rental order may span. */
export const MIN_RENTAL_DAYS = 1;

/** How far in advance a rental's start date may be booked. */
export const MAX_BOOKING_HORIZON_DAYS = 365;

/** Currency used across the marketplace (BDT - Bangladeshi Taka). */
export const DEFAULT_CURRENCY = 'BDT';

/** SSLCommerz product profile - "general" is the safe default for a rental marketplace. */
export const SSLCOMMERZ_PRODUCT_PROFILE = 'general';
