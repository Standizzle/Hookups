import { prisma } from '../db/client.js';
import { authenticate } from '../middleware/authenticate.js';
import { verifyPIN } from '../services/PINService.js';
import { z } from 'zod';

const SettingsSchema = z.object({
  transparencyMode: z.enum(['private', 'notify', 'hall_pass']).optional(),
  isPublic:         z.boolean().optional(),
});

const HallPassSchema = z.object({
  phone:     z.string(),
  expiresAt: z.coerce.date(),
});

function serialize(rel, userId) {
  const partner = rel.userAId === userId ? rel.userB : rel.userA;
  return {
    id: rel.id,
    status: rel.status,
    transparencyMode: rel.transparencyMode,
    isPublic: rel.isPublic,
    isProposer: rel.userAId === userId,
    partner: { id: partner.id, fullName: partner.fullName, phone: partner.phone },
    sealedAt: rel.sealedAt,
    createdAt: rel.createdAt,
  };
}

export default async function relationshipRoutes(fastify) {

  // My current relationship (pending or active), if any — "one at a time"
  fastify.get('/', { preHandler: authenticate }, async (req) => {
    const rel = await prisma.relationship.findFirst({
      where: {
        status: { in: ['pending', 'active'] },
        OR: [{ userAId: req.userId }, { userBId: req.userId }],
      },
      include: { userA: true, userB: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!rel) return { relationship: null, hallPass: [] };

    const hallPass = rel.status === 'active'
      ? await prisma.hallPassEntry.findMany({
          where: { relationshipId: rel.id },
          include: { approvedUser: { select: { id: true, fullName: true, phone: true } } },
          orderBy: { createdAt: 'desc' },
        })
      : [];

    return { relationship: serialize(rel, req.userId), hallPass };
  });

  // Propose becoming Relationship Partners — one at a time on both sides
  fastify.post('/request', { preHandler: authenticate }, async (req, reply) => {
    const { partnerPhone } = req.body ?? {};
    if (!partnerPhone) return reply.status(400).send({ error: 'partnerPhone required' });

    const partner = await prisma.user.findUnique({ where: { phone: partnerPhone } });
    if (!partner) return reply.status(404).send({ error: 'User not found' });
    if (partner.id === req.userId) return reply.status(400).send({ error: 'Cannot partner with yourself' });

    const [mine, theirs] = await Promise.all([
      prisma.relationship.findFirst({ where: { status: { in: ['pending', 'active'] }, OR: [{ userAId: req.userId }, { userBId: req.userId }] } }),
      prisma.relationship.findFirst({ where: { status: { in: ['pending', 'active'] }, OR: [{ userAId: partner.id }, { userBId: partner.id }] } }),
    ]);
    if (mine) return reply.status(409).send({ error: 'You already have a Relationship Partner (or a pending request)', code: 'ALREADY_HAS_RELATIONSHIP' });
    if (theirs) return reply.status(409).send({ error: 'That person already has a Relationship Partner (or a pending request)', code: 'PARTNER_UNAVAILABLE' });

    const rel = await prisma.relationship.create({
      data: { userAId: req.userId, userBId: partner.id, status: 'pending' },
    });
    await prisma.activityLog.create({
      data: { userId: partner.id, type: 'relationship_requested', title: 'Relationship Partner request', actor: 'System', metadata: {} },
    });
    return reply.status(201).send({ id: rel.id });
  });

  // Accept — mutually-PINned, proves intentionality
  fastify.post('/:id/accept', { preHandler: authenticate }, async (req, reply) => {
    const { pin } = req.body ?? {};
    if (!pin) return reply.status(400).send({ error: 'pin required' });

    const rel = await prisma.relationship.findUnique({ where: { id: req.params.id } });
    if (!rel || rel.userBId !== req.userId) return reply.status(404).send({ error: 'Not found' });
    if (rel.status !== 'pending') return reply.status(409).send({ error: 'Not pending' });

    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { pinHash: true, duressPinHash: true } });
    const { valid } = await verifyPIN(req.userId, pin, user.pinHash, user.duressPinHash);
    if (!valid) return reply.status(401).send({ error: 'Incorrect PIN', code: 'PIN_WRONG' });

    const updated = await prisma.relationship.update({
      where: { id: req.params.id },
      data: { status: 'active', sealedAt: new Date() },
    });
    await prisma.activityLog.create({
      data: { userId: rel.userAId, type: 'relationship_sealed', title: 'Relationship Partner confirmed', actor: 'Partner', metadata: {} },
    });
    return updated;
  });

  // Transparency mode + public visibility — either party can adjust
  fastify.patch('/:id/settings', { preHandler: authenticate }, async (req, reply) => {
    const rel = await prisma.relationship.findUnique({ where: { id: req.params.id } });
    if (!rel || (rel.userAId !== req.userId && rel.userBId !== req.userId)) return reply.status(404).send({ error: 'Not found' });
    if (rel.status !== 'active') return reply.status(409).send({ error: 'Relationship is not active' });

    const body = SettingsSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const updated = await prisma.relationship.update({ where: { id: req.params.id }, data: body.data });
    return updated;
  });

  // End the relationship — with PIN, parallel to consent revoke
  fastify.post('/:id/end', { preHandler: authenticate }, async (req, reply) => {
    const { pin } = req.body ?? {};
    if (!pin) return reply.status(400).send({ error: 'pin required' });

    const rel = await prisma.relationship.findUnique({ where: { id: req.params.id } });
    if (!rel || (rel.userAId !== req.userId && rel.userBId !== req.userId)) return reply.status(404).send({ error: 'Not found' });
    if (!['pending', 'active'].includes(rel.status)) return reply.status(409).send({ error: 'Already ended' });

    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { pinHash: true, duressPinHash: true } });
    const { valid } = await verifyPIN(req.userId, pin, user.pinHash, user.duressPinHash);
    if (!valid) return reply.status(401).send({ error: 'Incorrect PIN', code: 'PIN_WRONG' });

    const updated = await prisma.relationship.update({
      where: { id: req.params.id },
      data: { status: 'ended', endedAt: new Date(), endedById: req.userId },
    });
    const otherId = rel.userAId === req.userId ? rel.userBId : rel.userAId;
    await prisma.activityLog.create({
      data: { userId: otherId, type: 'relationship_ended', title: 'Your Relationship Partner ended things', actor: 'Partner', metadata: {} },
    });
    return updated;
  });

  // Hall Pass list management
  fastify.post('/:id/hall-pass', { preHandler: authenticate }, async (req, reply) => {
    const rel = await prisma.relationship.findUnique({ where: { id: req.params.id } });
    if (!rel || (rel.userAId !== req.userId && rel.userBId !== req.userId)) return reply.status(404).send({ error: 'Not found' });
    if (rel.status !== 'active') return reply.status(409).send({ error: 'Relationship is not active' });

    const body = HallPassSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const approvedUser = await prisma.user.findUnique({ where: { phone: body.data.phone } });
    if (!approvedUser) return reply.status(404).send({ error: 'User not found' });

    const entry = await prisma.hallPassEntry.upsert({
      where: { relationshipId_approvedUserId: { relationshipId: rel.id, approvedUserId: approvedUser.id } },
      update: { expiresAt: body.data.expiresAt },
      create: { relationshipId: rel.id, approvedUserId: approvedUser.id, expiresAt: body.data.expiresAt },
    });
    return reply.status(201).send(entry);
  });

  fastify.delete('/:id/hall-pass/:entryId', { preHandler: authenticate }, async (req, reply) => {
    const rel = await prisma.relationship.findUnique({ where: { id: req.params.id } });
    if (!rel || (rel.userAId !== req.userId && rel.userBId !== req.userId)) return reply.status(404).send({ error: 'Not found' });

    const entry = await prisma.hallPassEntry.findUnique({ where: { id: req.params.entryId } });
    if (!entry || entry.relationshipId !== rel.id) return reply.status(404).send({ error: 'Not found' });

    await prisma.hallPassEntry.delete({ where: { id: req.params.entryId } });
    return reply.status(204).send();
  });

  // Hall Pass override approvals awaiting this user's decision (as the partner, not the requester)
  fastify.get('/approvals', { preHandler: authenticate }, async (req) => {
    const approvals = await prisma.relationshipApproval.findMany({
      where: {
        status: 'pending',
        requestingUserId: { not: req.userId },
        relationship: { OR: [{ userAId: req.userId }, { userBId: req.userId }] },
      },
      include: {
        consentRecord: { select: { recordId: true } },
      },
      orderBy: { requestedAt: 'desc' },
    });

    const withNames = await Promise.all(approvals.map(async (a) => {
      const [requester, thirdParty] = await Promise.all([
        prisma.user.findUnique({ where: { id: a.requestingUserId }, select: { id: true, fullName: true } }),
        prisma.user.findUnique({ where: { id: a.thirdPartyId }, select: { id: true, fullName: true } }),
      ]);
      return { id: a.id, requestedAt: a.requestedAt, requester, thirdParty, recordId: a.consentRecord.recordId };
    }));
    return withNames;
  });

  fastify.post('/approvals/:id/approve', { preHandler: authenticate }, async (req, reply) => {
    const approval = await prisma.relationshipApproval.findUnique({
      where: { id: req.params.id }, include: { relationship: true },
    });
    if (!approval) return reply.status(404).send({ error: 'Not found' });
    const rel = approval.relationship;
    if (rel.userAId !== req.userId && rel.userBId !== req.userId) return reply.status(404).send({ error: 'Not found' });
    if (approval.requestingUserId === req.userId) return reply.status(403).send({ error: 'Cannot decide your own request' });
    if (approval.status !== 'pending') return reply.status(409).send({ error: 'Already decided' });

    const updated = await prisma.relationshipApproval.update({
      where: { id: req.params.id }, data: { status: 'approved', respondedAt: new Date() },
    });
    await prisma.activityLog.create({
      data: { userId: approval.requestingUserId, type: 'relationship_approval_approved', title: 'Your Hall Pass request was approved', actor: 'Partner', metadata: {} },
    });
    return updated;
  });

  fastify.post('/approvals/:id/deny', { preHandler: authenticate }, async (req, reply) => {
    const approval = await prisma.relationshipApproval.findUnique({
      where: { id: req.params.id }, include: { relationship: true },
    });
    if (!approval) return reply.status(404).send({ error: 'Not found' });
    const rel = approval.relationship;
    if (rel.userAId !== req.userId && rel.userBId !== req.userId) return reply.status(404).send({ error: 'Not found' });
    if (approval.requestingUserId === req.userId) return reply.status(403).send({ error: 'Cannot decide your own request' });
    if (approval.status !== 'pending') return reply.status(409).send({ error: 'Already decided' });

    const updated = await prisma.relationshipApproval.update({
      where: { id: req.params.id }, data: { status: 'denied', respondedAt: new Date() },
    });
    await prisma.activityLog.create({
      data: { userId: approval.requestingUserId, type: 'relationship_approval_denied', title: 'Your Hall Pass request was declined', actor: 'Partner', metadata: {} },
    });
    return updated;
  });
}
