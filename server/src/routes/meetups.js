import { prisma } from '../db/client.js';
import { authenticate } from '../middleware/authenticate.js';
import { verifyPIN } from '../services/PINService.js';
import { z } from 'zod';

const ProposeSchema = z.object({
  partnerId:   z.string().uuid(),
  place:       z.string().min(1).max(120),
  scheduledAt: z.coerce.date(),
});

const ConfirmSchema = z.object({
  pin: z.string().regex(/^\d{4}$/),
});

export default async function meetupRoutes(fastify) {

  // Propose a meetup — partner must be a mutual match
  fastify.post('/', { preHandler: authenticate }, async (req, reply) => {
    const body = ProposeSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    const { partnerId, place, scheduledAt } = body.data;
    if (partnerId === req.userId) return reply.status(400).send({ error: 'Cannot meet yourself' });

    const mutual = await prisma.match.findFirst({
      where: {
        status: 'matched',
        OR: [
          { fromId: req.userId, toId: partnerId },
          { fromId: partnerId, toId: req.userId },
        ],
      },
    });
    if (!mutual) return reply.status(403).send({ error: 'You can only propose a meetup with a mutual match' });

    const meetup = await prisma.meetup.create({
      data: { proposerId: req.userId, partnerId, place, scheduledAt },
    });

    await prisma.activityLog.createMany({
      data: [
        { userId: req.userId, type: 'meetup_proposed', title: 'Meetup proposed', actor: 'You', metadata: { place } },
        { userId: partnerId, type: 'meetup_proposed', title: 'Meetup proposed', actor: 'Partner', metadata: { place } },
      ],
    });

    return reply.status(201).send(meetup);
  });

  // List meetups I'm involved in
  fastify.get('/', { preHandler: authenticate }, async (req) => {
    const meetups = await prisma.meetup.findMany({
      where: { OR: [{ proposerId: req.userId }, { partnerId: req.userId }] },
      include: {
        proposer: { select: { id: true, fullName: true, username: true, avatarUrl: true } },
        partner:  { select: { id: true, fullName: true, username: true, avatarUrl: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    return meetups.map((m) => ({
      id: m.id,
      place: m.place,
      scheduledAt: m.scheduledAt,
      status: m.status,
      isProposer: m.proposerId === req.userId,
      partner: m.proposerId === req.userId ? m.partner : m.proposer,
    }));
  });

  // Confirm a proposed meetup — only the receiving partner, with their PIN
  fastify.post('/:id/confirm', { preHandler: authenticate }, async (req, reply) => {
    const body = ConfirmSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const meetup = await prisma.meetup.findUnique({ where: { id: req.params.id } });
    if (!meetup) return reply.status(404).send({ error: 'Meetup not found' });
    if (meetup.partnerId !== req.userId) return reply.status(403).send({ error: 'Only the invited partner can confirm' });
    if (meetup.status !== 'pending') return reply.status(409).send({ error: 'Meetup is not pending' });

    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { pinHash: true, duressPinHash: true } });
    const { valid } = await verifyPIN(req.userId, body.data.pin, user.pinHash, user.duressPinHash);
    if (!valid) return reply.status(401).send({ error: 'Incorrect PIN', code: 'PIN_WRONG' });

    const updated = await prisma.meetup.update({
      where: { id: req.params.id },
      data: { status: 'confirmed', confirmedAt: new Date() },
    });

    await prisma.activityLog.createMany({
      data: [
        { userId: meetup.proposerId, type: 'meetup_confirmed', title: 'Meetup confirmed', actor: 'Partner', metadata: { place: meetup.place } },
        { userId: meetup.partnerId, type: 'meetup_confirmed', title: 'Meetup confirmed', actor: 'You', metadata: { place: meetup.place } },
      ],
    });

    return updated;
  });

  // Cancel a meetup — either party, while pending or confirmed
  fastify.post('/:id/cancel', { preHandler: authenticate }, async (req, reply) => {
    const meetup = await prisma.meetup.findUnique({ where: { id: req.params.id } });
    if (!meetup) return reply.status(404).send({ error: 'Meetup not found' });
    if (meetup.proposerId !== req.userId && meetup.partnerId !== req.userId) {
      return reply.status(403).send({ error: 'Not your meetup' });
    }
    if (!['pending', 'confirmed'].includes(meetup.status)) {
      return reply.status(409).send({ error: 'Meetup cannot be cancelled' });
    }

    return prisma.meetup.update({ where: { id: req.params.id }, data: { status: 'cancelled' } });
  });
}
