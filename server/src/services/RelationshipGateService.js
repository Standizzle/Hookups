import { prisma } from '../db/client.js';
import { SMSService } from './SMSService.js';

export async function getActiveRelationship(userId) {
  return prisma.relationship.findFirst({
    where: { status: 'active', OR: [{ userAId: userId }, { userBId: userId }] },
  });
}

function otherPartyId(relationship, userId) {
  return relationship.userAId === userId ? relationship.userBId : relationship.userAId;
}

/**
 * Gates a consenting party's encounter against their own active Relationship,
 * if any. Only Hall Pass mode blocks anything — Private and Notify never do.
 * Returns { allowed: true } or { allowed: false, reason: 'RELATIONSHIP_OVERRIDE_PENDING' | 'RELATIONSHIP_OVERRIDE_DENIED' }.
 */
export async function checkRelationshipGate({ userId, counterpartyId, consentRecordId }) {
  const rel = await getActiveRelationship(userId);
  if (!rel || rel.transparencyMode !== 'hall_pass') return { allowed: true };

  const entry = await prisma.hallPassEntry.findUnique({
    where: { relationshipId_approvedUserId: { relationshipId: rel.id, approvedUserId: counterpartyId } },
  });
  if (entry && entry.expiresAt > new Date()) return { allowed: true };

  let approval = await prisma.relationshipApproval.findUnique({
    where: { consentRecordId_relationshipId: { consentRecordId, relationshipId: rel.id } },
  });

  if (!approval) {
    approval = await prisma.relationshipApproval.create({
      data: { relationshipId: rel.id, consentRecordId, requestingUserId: userId, thirdPartyId: counterpartyId, status: 'pending' },
    });
    await notifyPartnerOfApprovalRequest({ relationship: rel, requestingUserId: userId, thirdPartyId: counterpartyId });
  }

  if (approval.status === 'approved') return { allowed: true };
  if (approval.status === 'denied') return { allowed: false, reason: 'RELATIONSHIP_OVERRIDE_DENIED' };
  return { allowed: false, reason: 'RELATIONSHIP_OVERRIDE_PENDING' };
}

async function notifyPartnerOfApprovalRequest({ relationship, requestingUserId, thirdPartyId }) {
  const partnerId = otherPartyId(relationship, requestingUserId);
  const [partner, requester, thirdParty] = await Promise.all([
    prisma.user.findUnique({ where: { id: partnerId }, select: { phone: true } }),
    prisma.user.findUnique({ where: { id: requestingUserId }, select: { fullName: true } }),
    prisma.user.findUnique({ where: { id: thirdPartyId }, select: { fullName: true } }),
  ]);

  const message = `Hookups: ${requester.fullName} wants to record consent with someone not on your Hall Pass list (${thirdParty.fullName}). Review it in the app.`;
  await SMSService.send(partner.phone, message).catch(() => {});
  await prisma.activityLog.create({
    data: {
      userId: partnerId,
      type: 'relationship_approval_requested',
      title: 'Hall Pass approval requested',
      actor: 'System',
      metadata: { requesterName: requester.fullName, thirdPartyName: thirdParty.fullName },
    },
  });
}

/**
 * Notify mode: once a consent is sealed, the relationship partner gets a
 * read-only activity log entry — never blocks, never requires action.
 */
export async function notifyPartnerOfEncounter({ userId, counterpartyId, consentRecordId }) {
  const rel = await getActiveRelationship(userId);
  if (!rel || rel.transparencyMode !== 'notify') return;

  const partnerId = otherPartyId(rel, userId);
  const [actor, counterparty] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { fullName: true } }),
    prisma.user.findUnique({ where: { id: counterpartyId }, select: { fullName: true } }),
  ]);

  await prisma.activityLog.create({
    data: {
      userId: partnerId,
      recordId: consentRecordId,
      type: 'relationship_partner_encounter',
      title: `${actor.fullName} recorded consent with ${counterparty.fullName}`,
      actor: 'System',
      metadata: { partnerId: counterpartyId },
    },
  });
}
