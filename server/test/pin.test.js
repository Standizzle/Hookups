import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPIN, verifyPIN, pinsAreEqual, isValidPIN } from '../src/services/PINService.js';

test('isValidPIN accepts only 4 digits', () => {
  assert.equal(isValidPIN('1234'), true);
  assert.equal(isValidPIN('12345'), false);
  assert.equal(isValidPIN('abcd'), false);
});

test('pinsAreEqual compares raw strings', () => {
  assert.equal(pinsAreEqual('1234', '1234'), true);
  assert.equal(pinsAreEqual('1234', '4321'), false);
});

test('hashPIN + verifyPIN round-trip identifies personal vs duress vs wrong', async () => {
  const userId = 'user-1';
  const personalHash = await hashPIN(userId, '1234');
  const duressHash = await hashPIN(userId, '9999');

  const personal = await verifyPIN(userId, '1234', personalHash, duressHash);
  assert.deepEqual(personal, { valid: true, isDuress: false });

  const duress = await verifyPIN(userId, '9999', personalHash, duressHash);
  assert.deepEqual(duress, { valid: true, isDuress: true });

  const wrong = await verifyPIN(userId, '0000', personalHash, duressHash);
  assert.deepEqual(wrong, { valid: false, isDuress: false });
});

test('hashPIN is scoped per-user — same PIN, different users, different hashes', async () => {
  const hashA = await hashPIN('user-a', '1234');
  const hashB = await hashPIN('user-b', '1234');
  assert.notEqual(hashA, hashB);
});
