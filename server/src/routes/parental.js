import { prisma } from '../db/client.js';
import { authenticate } from '../middleware/authenticate.js';
import { z } from 'zod';

const PermsSchema = z.object({
  permittedLevel:      z.number().int().min(1).max(5).optional(),
  locationAlerts:      z.boolean().optional(),
  autoCheckIn:         z.boolean().optional(),
  checkInWindowMinutes: z.number().int().min(5).max(60).optional(),
});

export default async function parentalRoutes(fastify) {

  fastify.post('/link', { preHandler: authenticate }, async (req, reply) => {
    const { minorPhone } = req.body ?? {};
    if (!minorPhone) return reply.status(400).send({ error: 'minorPhone required' });

    const minor = await prisma.user.findUnique({ where: { phone: minorPhone } });
    if (!minor) return reply.status(404).send({ error: 'User not found' });
    if (minor.id === req.userId) return reply.status(400).send({ error: 'Cannot link to yourself' });

    const existing = await prisma.parentalLink.findUnique({
      where: { parentId_minorId: { parentId: req.userId, minorId: minor.id } },
    });
    if (existing) {
      return reply.status(409).send({ error: `A link with this account is already ${existing.status}`, status: existing.status });
    }

    const link = await prisma.parentalLink.create({
      data: { parentId: req.userId, minorId: minor.id, status: 'pending' },
    });
    return reply.status(201).send({ id: link.id, minorId: minor.id });
  });

  fastify.post('/:id/accept', { preHandler: authenticate }, async (req, reply) => {
    const link = await prisma.parentalLink.findUnique({ where: { id: req.params.id } });
    if (!link || link.minorId !== req.userId) return reply.status(404).send({ error: 'Not found' });
    if (link.status !== 'pending') return reply.status(409).send({ error: 'Not pending' });

    const updated = await prisma.parentalLink.update({
      where: { id: req.params.id },
      data:  { status: 'active', verifiedAt: new Date() },
    });
    return updated;
  });

  fastify.patch('/:id', { preHandler: authenticate }, async (req, reply) => {
    const link = await prisma.parentalLink.findUnique({ where: { id: req.params.id } });
    if (!link || link.parentId !== req.userId) return reply.status(404).send({ error: 'Not found' });

    const body = PermsSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const updated = await prisma.parentalLink.update({ where: { id: req.params.id }, data: body.data });
    return updated;
  });

  fastify.get('/my-links', { preHandler: authenticate }, async (req) => {
    // Include pending links too — a minor needs to see & accept a request
    // that hasn't been actioned yet, not just already-active ones.
    const [asParent, asMinor] = await Promise.all([
      prisma.parentalLink.findMany({
        where: { parentId: req.userId, status: { in: ['pending', 'active'] } },
        include: { minor: { select: { id: true, fullName: true, phone: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.parentalLink.findMany({
        where: { minorId: req.userId, status: { in: ['pending', 'active'] } },
        include: { parent: { select: { id: true, fullName: true, phone: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { asParent, asMinor };
  });
}
