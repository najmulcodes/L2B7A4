import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError } from '../ApiError';

test('ApiError.notFound defaults to a sensible message and 404 status', () => {
  const err = ApiError.notFound();
  assert.equal(err.statusCode, 404);
  assert.equal(err.message, 'Resource not found');
  assert.deepEqual(err.errorDetails, []);
});

test('ApiError.badRequest carries field-level errorDetails', () => {
  const err = ApiError.badRequest('Validation failed', [{ field: 'email', message: 'Invalid email' }]);
  assert.equal(err.statusCode, 400);
  assert.equal(err.errorDetails.length, 1);
  assert.equal(err.errorDetails[0]?.field, 'email');
});

test('ApiError instances are real Error instances with isOperational=true', () => {
  const err = ApiError.forbidden();
  assert.ok(err instanceof Error);
  assert.equal(err.isOperational, true);
  assert.equal(err.statusCode, 403);
});

test('every static factory maps to its documented HTTP status code', () => {
  assert.equal(ApiError.unauthorized().statusCode, 401);
  assert.equal(ApiError.conflict('x').statusCode, 409);
  assert.equal(ApiError.unprocessable('x').statusCode, 422);
  assert.equal(ApiError.internal().statusCode, 500);
});
