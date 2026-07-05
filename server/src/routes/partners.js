import { prisma } from '../db/client.js';
import { authenticate } from '../middleware/authenticate.js';

function generateLinkId() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const seq  = String(Math.floor(Math.random() * 9999)).padStart(4, '0');
  return `LNK-${date}-${seq}`;
}

export default async function partnerRoutes(fastify) {

  fastify.get('/', { preHandler: authenticate }, async (req) => {
    const links = await prisma.partnerLink.findMany({
      where: {
        OR: [{ userAId: req.userId }, { userBId: req.userId }],
        status: 'active',
      },
      include: {
        userA: { select: { id: true, fullName: true, verifiedAt: true } },
        userB: { select: { id: true, fullName: true, verifiedAt: true } },
      },
    });
    return links.map((l) => ({
      id: l.id, linkId: l.linkId, sealedAt: l.sealedAt,
      partner: l.userAId === req.userId ? l.userB : l.userA,
    }));
  });

  fastify.post('/request', { preHandler: authenticate }, async (req, reply) => {
    const { partnerId } = req.body ?? {};
    if (!partnerId) return reply.status(400).send({ error: 'partnerId required' });
    if (partnerId === req.userId) return reply.status(400).send({ error: 'Cannot link to yourself' });

    const existing = await prisma.partnerLink.findFirst({
      where: {
        OR: [
          { userAId: req.userId, userBId: partnerId },
          { userAId: partnerId, userBId: req.userId },
        ],
        status: { in: ['pending', 'active'] },
      },
    });
    if (existing) return reply.status(409).send({ error: 'Link already exists', linkId: existing.linkId });

    const link = await prisma.partnerLink.create({
      data: { linkId: generateLinkId(), userAId: req.userId, userBId: partnerId, status: 'pending' },
    });
    return reply.status(201).send({ linkId: link.linkId, id: link.id });
  });

  fastify.post('/:id/accept', { preHandler: authenticate }, async (req, reply) => {
    const link = await prisma.partnerLink.findUnique({ where: { id: req.params.id } });
    if (!link || link.userBId !== req.userId) return reply.status(404).send({ error: 'Not found' });
    if (link.status !== 'pending') return reply.status(409).send({ error: 'Link is not pending' });

    const updated = await prisma.partnerLink.update({
      where: { id: req.params.id },
      data: { status: 'active', sealedAt: new Date() },
    });
    return updated;
  });

  fastify.delete('/:id', { preHandler: authenticate }, async (req, reply) => {
    const link = await prisma.partnerLink.findUnique({ where: { id: req.params.id } });
    if (!link || (link.userAId !== req.userId && link.userBId !== req.userId)) {
      return reply.status(404).send({ error: 'Not found' });
    }
    await prisma.partnerLink.update({
      where: { id: req.params.id },
      data: { status: 'unlinked', unlinkedAt: new Date(), unlinkedById: req.userId, cooldownUntil: new Date(Date.now() + 86_400_000) },
    });
    return reply.status(204).send();
  });
}
