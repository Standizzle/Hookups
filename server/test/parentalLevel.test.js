import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeRequestedLevel, LEVEL_LABELS } from '../src/utils/parentalLevel.js';

test('computeRequestedLevel maps each term to its Level', () => {
  assert.equal(computeRequestedLevel({}), 0);
  assert.equal(computeRequestedLevel({ holdingHandsHugging: true }), 1);
  assert.equal(computeRequestedLevel({ kissingAffection: true }), 2);
  assert.equal(computeRequestedLevel({ touchingAboveClothing: true }), 3);
  assert.equal(computeRequestedLevel({ touchingUnderClothing: true }), 4);
  assert.equal(computeRequestedLevel({ sexualIntimacy: true }), 5);
});

test('computeRequestedLevel takes the highest term when several are set', () => {
  assert.equal(computeRequestedLevel({ holdingHandsHugging: true, sexualIntimacy: true }), 5);
  assert.equal(computeRequestedLevel({ kissingAffection: true, touchingAboveClothing: true }), 3);
});

test('LEVEL_LABELS covers levels 1-5', () => {
  for (let i = 1; i <= 5; i++) assert.ok(LEVEL_LABELS[i]);
});
