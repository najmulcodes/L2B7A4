import crypto from 'node:crypto';

function randomAlphaNumeric(length: number): string {
  return crypto.randomBytes(length).toString('hex').toUpperCase().slice(0, length);
}

function datePart(): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

/** e.g. GU-20260706-9F3A2C */
export function generateOrderNumber(): string {
  return `GU-${datePart()}-${randomAlphaNumeric(6)}`;
}

/** e.g. GU-TXN-20260706-4B7E1D9A - must be unique per payment attempt for SSLCommerz's tran_id. */
export function generateTransactionId(): string {
  return `GU-TXN-${datePart()}-${randomAlphaNumeric(8)}`;
}
