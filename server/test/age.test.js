import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateAge, isMinor } from '../src/utils/age.js';

test('calculateAge accounts for whether the birthday has occurred this year', () => {
  const today = new Date();
  const eighteenYearsAgoToday = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
  assert.equal(calculateAge(eighteenYearsAgoToday), 18);
});

test('calculateAge returns null for a missing date of birth', () => {
  assert.equal(calculateAge(null), null);
});

test('isMinor is true under 18 and false at/above 18', () => {
  const today = new Date();
  const seventeen = new Date(today.getFullYear() - 17, today.getMonth(), today.getDate());
  const eighteen = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
  assert.equal(isMinor(seventeen), true);
  assert.equal(isMinor(eighteen), false);
});

test('isMinor returns null when date of birth is not yet known', () => {
  assert.equal(isMinor(null), null);
});
