import { prisma } from '../db/client.js';
import { signRecord, canonicalConsentJSON, sha256, hashIP } from './CryptoService.js';
import { checkParentalGate, notifyParentOfActiveLocationSharing } from './ParentalGateService.js';
import { computeRequestedLevel } from '../utils/parentalLevel.js';

function generateRecordId() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const seq  = String(Math.floor(Math.random() * 9999)).padStart(4, '0');
  return `HKU-${date}-${seq}`;
}

export async function createConsentRequest({ requesterId, consenterId, terms, method, expiresInMinutes = 60, location, ipA }) {
  const now      = new Date();
  const expiresAt = new Date(now.getTime() + expiresInMinutes * 60_000);

  const record = await prisma.consentRecord.create({
    data: {
      recordId:        generateRecordId(),
      requesterId,
      consenterId,
      method,
      status:          'pending',
      startedAt:       now,
      expiresAt,
      ipHashA:         ipA ? hashIP(ipA) : null,
      lat:             location?.lat,
      lng:             location?.lng,
      placeName:       location?.placeName,
      holdingHandsHugging:   terms.holdingHandsHugging ?? false,
      kissingAffection:      terms.kissingAffection ?? false,
      touchingAboveClothing: terms.touchingAboveClothing ?? false,
      touchingUnderClothing: terms.touchingUnderClothing ?? false,
      sexualIntimacy:        terms.sexualIntimacy ?? false,
      photosVideo:      terms.photosVideo ?? false,
      overnightStays:   terms.overnightStays ?? false,
      safeWord:         terms.safeWord ?? '',
      locationRequested: terms.locationSharing ?? false,
      locationSharing:  false, // only true when BOTH confirm it
    },
  });

  return record;
}

export async function confirmConsent({ recordId, userId, agreedToLocation, ipB }) {
  const record = await prisma.consentRecord.findUnique({ where: { id: recordId } });
  if (!record) throw new Error('Record not found');
  if (record.status !== 'pending') throw new Error('Record is not pending');
  if (record.consenterId !== userId) throw new Error('Wrong user');
  if (new Date() > record.expiresAt) throw new Error('Consent request expired');

  const requestedLevel = computeRequestedLevel(record);
  const gate = await checkParentalGate({
    userId, requestedLevel, consentRecordId: record.id, requesterId: record.requesterId,
  });
  if (!gate.allowed) {
    const err = new Error('Blocked by parental controls');
    err.code = gate.reason;
    throw err;
  }

  // Find previous record between this pair for chain hash
  const prev = await prisma.consentRecord.findFirst({
    where: {
      OR: [
        { requesterId: record.requesterId, consenterId: record.consenterId },
        { requesterId: record.consenterId, consenterId: record.requesterId },
      ],
      status: { in: ['mutual', 'revoked'] },
      id: { not: record.id },
    },
    orderBy: { createdAt: 'desc' },
  });

  const now = new Date();

  const updated = await prisma.consentRecord.update({
    where: { id: recordId },
    data: {
      status:         'mutual',
      confirmedAt:    now,
      locationSharing: record.locationRequested && (agreedToLocation ?? false),
      ipHashB:        ipB ? hashIP(ipB) : null,
      chainPrev:      prev?.chainHash ?? null,
    },
  });

  // Sign the record
  const canonical  = canonicalConsentJSON(updated);
  const signature  = signRecord(canonical);
  const chainHash  = sha256(canonical + (updated.chainPrev ?? ''));

  const signed = await prisma.consentRecord.update({
    where: { id: recordId },
    data: { signature, chainHash },
  });

  // Log activity for both users
  await prisma.activityLog.createMany({
    data: [
      { userId: record.requesterId, recordId: record.id, type: 'consent_confirmed', title: 'Consent sealed', actor: 'System', metadata: { recordId: record.recordId } },
      { userId: record.consenterId, recordId: record.id, type: 'consent_confirmed', title: 'Consent sealed', actor: 'System', metadata: { recordId: record.recordId } },
    ],
  });

  // Open location shares if both agreed
  if (signed.locationSharing) {
    await prisma.locationShare.createMany({
      data: [
        { recordId: record.id, userId: record.requesterId },
        { recordId: record.id, userId: record.consenterId },
      ],
    });

    // Level 3+ auto-adds a linked parent as a location recipient
    if (requestedLevel >= 3) {
      await notifyParentOfActiveLocationSharing({
        recordId: record.id, requesterId: record.requesterId, consenterId: record.consenterId,
      }).catch(() => {});
    }
  }

  return signed;
}

export async function revokeConsent({ recordId, userId, reason }) {
  const record = await prisma.consentRecord.findUnique({ where: { id: recordId } });
  if (!record) throw new Error('Record not found');
  if (record.requesterId !== userId && record.consenterId !== userId) throw new Error('Not your record');
  if (!['pending', 'mutual'].includes(record.status)) throw new Error('Cannot revoke this record');

  const revoked = await prisma.consentRecord.update({
    where: { id: recordId },
    data: {
      status:      'revoked',
      revokedAt:   new Date(),
      revokedBy:   userId,
      revokeReason: reason ?? null,
    },
  });

  // Close any active location shares
  await prisma.locationShare.updateMany({
    where: { recordId, active: true },
    data:  { active: false, endedAt: new Date() },
  });

  const otherId = record.requesterId === userId ? record.consenterId : record.requesterId;
  await prisma.activityLog.createMany({
    data: [
      { userId, recordId, type: 'consent_revoked', title: 'Consent revoked', actor: 'You', metadata: {} },
      { userId: otherId, recordId, type: 'consent_revoked', title: 'Partner revoked consent', actor: 'Partner', metadata: {} },
    ],
  });

  return revoked;
}
