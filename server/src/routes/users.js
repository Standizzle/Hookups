import { prisma } from '../db/client.js';
import { authenticate } from '../middleware/authenticate.js';

export default async function userRoutes(fastify) {

  fastify.get('/lookup', { preHandler: authenticate }, async (req, reply) => {
    const phone = (req.query.phone ?? '').trim();
    if (!phone) return reply.status(400).send({ error: 'phone query param required' });

    const user = await prisma.user.findUnique({
      where: { phone },
      select: { id: true, fullName: true, verifiedAt: true, status: true },
    });
    if (!user || user.status !== 'active' || user.id === req.userId) {
      return reply.status(404).send({ error: 'No matching user found' });
    }
    return { id: user.id, fullName: user.fullName, verified: !!user.verifiedAt };
  });

  fastify.get('/me', { preHandler: authenticate }, async (req) => {
    return prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, fullName: true, phone: true, email: true, verifiedAt: true, createdAt: true, region: true },
    });
  });

  fastify.patch('/me', { preHandler: authenticate }, async (req, reply) => {
    const allowed = ['fullName', 'email'];
    const data = Object.fromEntries(Object.entries(req.body ?? {}).filter(([k]) => allowed.includes(k)));
    if (!Object.keys(data).length) return reply.status(400).send({ error: 'No updatable fields provided' });
    return prisma.user.update({ where: { id: req.userId }, data });
  });

  fastify.delete('/me', { preHandler: authenticate }, async (req, reply) => {
    // POPIA erasure — anonymise, don't delete (preserve consent chain integrity)
    await prisma.user.update({
      where: { id: req.userId },
      data: {
        fullName:  'Deleted User',
        phone:     `deleted_${req.userId}`,
        email:     null,
        pinHash:   '',
        duressPinHash: null,
        status:    'deleted',
        deletedAt: new Date(),
      },
    });
    return reply.status(204).send();
  });

  fastify.get('/me/logs', { preHandler: authenticate }, async (req) => {
    const { limit = 30, offset = 0 } = req.query;
    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where: { userId: req.userId },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset),
      }),
      prisma.activityLog.count({ where: { userId: req.userId } }),
    ]);
    return { logs, total };
  });
}
