import { prisma } from '../db/client.js';
import { isMinor } from '../utils/age.js';
import { LEVEL_LABELS } from '../utils/parentalLevel.js';
import { SMSService } from './SMSService.js';

/**
 * Checks whether a user may proceed with a consent record requesting the
 * given level. Only meaningful for minors — adults are always allowed.
 *
 * Returns one of:
 *   { allowed: true }
 *   { allowed: false, reason: 'NO_PARENTAL_LINK' }
 *   { allowed: false, reason: 'LEVEL_BLOCKED' }        — Level 4/5, no override possible
 *   { allowed: false, reason: 'OVERRIDE_DENIED' }
 *   { allowed: false, reason: 'OVERRIDE_PENDING' }      — Level 3, awaiting parent response
 */
export async function checkParentalGate({ userId, requestedLevel, consentRecordId, requesterId }) {
  if (requestedLevel <= 0) return { allowed: true };

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { dateOfBirth: true } });
  if (!isMinor(user?.dateOfBirth)) return { allowed: true };

  const link = await prisma.parentalLink.findFirst({ where: { minorId: userId, status: 'active' } });
  if (!link) return { allowed: false, reason: 'NO_PARENTAL_LINK' };

  if (requestedLevel <= link.permittedLevel) return { allowed: true };
  if (requestedLevel >= 4) return { allowed: false, reason: 'LEVEL_BLOCKED' };

  // Only Level 3 is override-eligible
  let override = await prisma.parentalOverride.findUnique({
    where: { consentRecordId_parentalLinkId: { consentRecordId, parentalLinkId: link.id } },
  });

  if (!override) {
    override = await prisma.parentalOverride.create({
      data: { parentalLinkId: link.id, consentRecordId, requestedLevel, status: 'pending' },
    });
    await notifyParentOfOverride({ link, requestedLevel, requesterId });
  }

  if (override.status === 'approved') return { allowed: true };
  if (override.status === 'denied') return { allowed: false, reason: 'OVERRIDE_DENIED' };
  return { allowed: false, reason: 'OVERRIDE_PENDING' };
}

/** Active parental link where the given user is the minor, or null. */
export async function getActiveParentLink(minorId) {
  return prisma.parentalLink.findFirst({ where: { minorId, status: 'active' } });
}

/**
 * Level 3+ auto-adds the linked parent as a location recipient once live
 * location sharing is actually active for the encounter (per the parent's
 * own locationAlerts toggle).
 */
export async function notifyParentOfActiveLocationSharing({ recordId, requesterId, consenterId }) {
  for (const partyId of [requesterId, consenterId]) {
    const party = await prisma.user.findUnique({ where: { id: partyId }, select: { dateOfBirth: true, fullName: true } });
    if (!isMinor(party?.dateOfBirth)) continue;

    const link = await getActiveParentLink(partyId);
    if (!link || !link.locationAlerts) continue;

    const parent = await prisma.user.findUnique({ where: { id: link.parentId }, select: { phone: true } });
    const message = `Hookups: live location sharing is active for ${party.fullName} during a consent encounter. You can check in on them in the app.`;
    await SMSService.send(parent.phone, message).catch(() => {});
    await prisma.activityLog.create({
      data: {
        userId: link.parentId,
        recordId,
        type: 'location_sharing_started',
        title: 'Live location sharing started',
        actor: 'System',
        metadata: { minorName: party.fullName },
      },
    });
  }
}

async function notifyParentOfOverride({ link, requestedLevel, requesterId }) {
  const [parent, minor, requester] = await Promise.all([
    prisma.user.findUnique({ where: { id: link.parentId }, select: { phone: true, fullName: true } }),
    prisma.user.findUnique({ where: { id: link.minorId }, select: { fullName: true } }),
    requesterId ? prisma.user.findUnique({ where: { id: requesterId }, select: { fullName: true } }) : null,
  ]);

  const label = LEVEL_LABELS[requestedLevel] ?? `Level ${requestedLevel}`;
  const message = `Hookups: ${minor.fullName} has a pending request needing your approval — "${label}"${requester ? ` with ${requester.fullName}` : ''}, at ${new Date().toLocaleString()}. Review it in the app.`;

  await SMSService.send(parent.phone, message).catch(() => {});
  await prisma.activityLog.create({
    data: {
      userId: link.parentId,
      type: 'override_requested',
      title: 'Parental override requested',
      actor: 'System',
      metadata: { minorName: minor.fullName, level: requestedLevel, requesterName: requester?.fullName ?? null },
    },
  });
}
