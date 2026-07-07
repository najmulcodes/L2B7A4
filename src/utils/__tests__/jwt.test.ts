import './testEnv';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import {
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
  newJti,
} from '../jwt';

test('signAccessToken/verifyAccessToken round-trip preserves claims', () => {
  const token = signAccessToken({ sub: 'user-123', email: 'test@example.com', role: 'CUSTOMER' });
  const decoded = verifyAccessToken(token);
  assert.equal(decoded.sub, 'user-123');
  assert.equal(decoded.email, 'test@example.com');
  assert.equal(decoded.role, 'CUSTOMER');
});

test('verifyAccessToken rejects a token signed with a different secret', () => {
  const forged = jwt.sign({ sub: 'user-123', email: 'x@x.com', role: 'ADMIN' }, 'wrong-secret');
  assert.throws(() => verifyAccessToken(forged));
});

test('signRefreshToken/verifyRefreshToken round-trip preserves sub and jti', () => {
  const jti = newJti();
  const token = signRefreshToken('user-456', jti);
  const decoded = verifyRefreshToken(token);
  assert.equal(decoded.sub, 'user-456');
  assert.equal(decoded.jti, jti);
});

test('an access token cannot be verified as a refresh token (different secrets)', () => {
  const accessToken = signAccessToken({ sub: 'user-1', email: 'a@a.com', role: 'PROVIDER' });
  assert.throws(() => verifyRefreshToken(accessToken));
});

test('hashToken is deterministic and produces a 64-char hex SHA-256 digest', () => {
  const h1 = hashToken('some-refresh-token-value');
  const h2 = hashToken('some-refresh-token-value');
  assert.equal(h1, h2);
  assert.match(h1, /^[a-f0-9]{64}$/);
});

test('hashToken produces different output for different input', () => {
  assert.notEqual(hashToken('token-a'), hashToken('token-b'));
});

test('newJti returns unique values', () => {
  const ids = new Set(Array.from({ length: 20 }, () => newJti()));
  assert.equal(ids.size, 20);
});
