import { test } from 'node:test';
import assert from 'node:assert/strict';
import { signRecord, verifyRecord, sha256, hashIP, canonicalConsentJSON } from '../src/services/CryptoService.js';

function sampleRecord() {
  return {
    id: 'r1', recordId: 'HKU-1', requesterId: 'a', consenterId: 'b',
    holdingHandsHugging: true, kissingAffection: false, touchingAboveClothing: false,
    touchingUnderClothing: false, sexualIntimacy: false, photosVideo: false,
    overnightStays: false, safeWord: '', locationRequested: false, locationSharing: false,
    method: 'manual', startedAt: new Date('2026-01-01'), expiresAt: new Date('2026-01-01T01:00:00Z'),
    confirmedAt: null, lat: null, lng: null, chainPrev: null,
  };
}

test('sha256 is deterministic and content-sensitive', () => {
  assert.equal(sha256('hello'), sha256('hello'));
  assert.notEqual(sha256('hello'), sha256('world'));
});

test('hashIP salts consistently for the same input', () => {
  assert.equal(hashIP('1.2.3.4'), hashIP('1.2.3.4'));
});

test('signRecord + verifyRecord round-trip, and tamper detection', async () => {
  const canonical = canonicalConsentJSON(sampleRecord());
  const sig = await signRecord(canonical);
  assert.equal(await verifyRecord(canonical, sig), true);
  assert.equal(await verifyRecord(canonical + 'tampered', sig), false);
});

test('canonicalConsentJSON is deterministic for an identical record', () => {
  const record = sampleRecord();
  assert.equal(canonicalConsentJSON(record), canonicalConsentJSON(record));
});
