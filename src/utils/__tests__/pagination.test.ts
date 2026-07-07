import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolvePagination, buildPaginationMeta } from '../pagination';

test('resolvePagination applies defaults when page/limit are omitted', () => {
  const result = resolvePagination(undefined, undefined);
  assert.equal(result.page, 1);
  assert.equal(result.limit, 10);
  assert.equal(result.skip, 0);
  assert.equal(result.take, 10);
});

test('resolvePagination computes skip correctly for later pages', () => {
  const result = resolvePagination(3, 20);
  assert.equal(result.page, 3);
  assert.equal(result.limit, 20);
  assert.equal(result.skip, 40);
  assert.equal(result.take, 20);
});

test('resolvePagination clamps limit to MAX_LIMIT', () => {
  const result = resolvePagination(1, 9999);
  assert.equal(result.limit, 100);
});

test('resolvePagination falls back to defaults for invalid (zero/negative) input', () => {
  const result = resolvePagination(0, -5);
  assert.equal(result.page, 1);
  assert.equal(result.limit, 10);
});

test('buildPaginationMeta computes totalPages correctly, including the zero-result edge case', () => {
  assert.deepEqual(buildPaginationMeta(1, 10, 25), { page: 1, limit: 10, total: 25, totalPages: 3 });
  assert.deepEqual(buildPaginationMeta(1, 10, 0), { page: 1, limit: 10, total: 0, totalPages: 0 });
  assert.deepEqual(buildPaginationMeta(2, 10, 20), { page: 2, limit: 10, total: 20, totalPages: 2 });
});
