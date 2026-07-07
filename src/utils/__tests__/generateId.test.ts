import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateOrderNumber, generateTransactionId } from '../generateId';

test('generateOrderNumber matches the GU-YYYYMMDD-XXXXXX format', () => {
  const orderNumber = generateOrderNumber();
  assert.match(orderNumber, /^GU-\d{8}-[A-F0-9]{6}$/);
});

test('generateTransactionId matches the GU-TXN-YYYYMMDD-XXXXXXXX format', () => {
  const txnId = generateTransactionId();
  assert.match(txnId, /^GU-TXN-\d{8}-[A-F0-9]{8}$/);
});

test('generateOrderNumber produces unique values across many calls', () => {
  const values = new Set(Array.from({ length: 100 }, () => generateOrderNumber()));
  assert.equal(values.size, 100);
});

test('generateTransactionId produces unique values across many calls', () => {
  const values = new Set(Array.from({ length: 100 }, () => generateTransactionId()));
  assert.equal(values.size, 100);
});
