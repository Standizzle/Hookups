import { prisma } from '../db/client.js';
import { authenticate } from '../middleware/authenticate.js';
import { z } from 'zod';

const ProfileSchema = z.object({
  university:   z.string().max(80).optional(),
  bio:          z.string().max(280).optional(),
  avatarEmoji:  z.string().max(8).optional(),
  interests:    z.array(z.string().max(30)).max(20).optional(),
  discoverable: z.boolean().optional(),
});

const LocationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

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
      select: {
        id: true, fullName: true, phone: true, email: true, verifiedAt: true, createdAt: true, region: true,
        university: true, bio: true, avatarEmoji: true, interests: true, discoverable: true,
        lastLat: true, lastLng: true, lastLocatedAt: true,
      },
    });
  });

  fastify.patch('/me', { preHandler: authenticate }, async (req, reply) => {
    const allowed = ['fullName', 'email'];
    const data = Object.fromEntries(Object.entries(req.body ?? {}).filter(([k]) => allowed.includes(k)));
    if (!Object.keys(data).length) return reply.status(400).send({ error: 'No updatable fields provided' });
    return prisma.user.update({ where: { id: req.userId }, data });
  });

  // Discovery profile (university, bio, interests, discoverable, avatar)
  fastify.patch('/me/profile', { preHandler: authenticate }, async (req, reply) => {
    const body = ProfileSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    if (!Object.keys(body.data).length) return reply.status(400).send({ error: 'No updatable fields provided' });

    return prisma.user.update({
      where: { id: req.userId },
      data: body.data,
      select: {
        id: true, university: true, bio: true, avatarEmoji: true, interests: true, discoverable: true,
      },
    });
  });

  // One-shot location capture for discovery (not continuous tracking)
  fastify.post('/me/location', { preHandler: authenticate }, async (req, reply) => {
    const body = LocationSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    await prisma.user.update({
      where: { id: req.userId },
      data: { lastLat: body.data.lat, lastLng: body.data.lng, lastLocatedAt: new Date() },
    });
    return { ok: true };
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
