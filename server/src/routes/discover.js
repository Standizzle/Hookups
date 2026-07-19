import { prisma } from '../db/client.js';
import { authenticate } from '../middleware/authenticate.js';
import { z } from 'zod';

const ActionSchema = z.object({
  targetUserId: z.string().uuid(),
  action: z.enum(['connect', 'skip']),
});

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function scoreAndReasons(me, them) {
  const shared = them.interests.filter((i) => me.interests.includes(i));
  const smaller = Math.max(1, Math.min(me.interests.length, them.interests.length));
  let score = Math.round((shared.length / smaller) * 90);
  const reasons = [];
  if (shared.length > 0) reasons.push(`${shared.length} mutual interest${shared.length > 1 ? 's' : ''}`);
  if (me.university && them.university && me.university === them.university) {
    score += 10;
    reasons.push('Same university');
  }
  if (them.verifiedAt) reasons.push('Verified');
  if (reasons.length === 0) reasons.push('New nearby');
  return { score: Math.min(100, score), shared, reasons };
}

export default async function discoverRoutes(fastify) {

  // Candidates: discoverable, not self, not already matched/skipped
  fastify.get('/nearby', { preHandler: authenticate }, async (req) => {
    const me = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { interests: true, university: true, lastLat: true, lastLng: true },
    });

    const alreadyActioned = await prisma.match.findMany({
      where: { OR: [{ fromId: req.userId }, { toId: req.userId }] },
      select: { fromId: true, toId: true },
    });
    const excludeIds = new Set([req.userId]);
    alreadyActioned.forEach((m) => { excludeIds.add(m.fromId); excludeIds.add(m.toId); });

    const candidates = await prisma.user.findMany({
      where: {
        discoverable: true,
        status: 'active',
        id: { notIn: [...excludeIds] },
      },
      select: {
        // No fullName here — pre-match, only the handle identifies you.
        id: true, username: true, university: true, bio: true, avatarUrl: true,
        interests: true, verifiedAt: true, lastLat: true, lastLng: true, dateOfBirth: true,
      },
      take: 50,
    });

    return candidates.map((c) => {
      const { score, shared, reasons } = scoreAndReasons(me, c);
      let distanceKm = null;
      if (me.lastLat != null && me.lastLng != null && c.lastLat != null && c.lastLng != null) {
        distanceKm = haversineKm(me.lastLat, me.lastLng, c.lastLat, c.lastLng);
      }
      return {
        id: c.id,
        handle: c.username ? `@${c.username}` : null,
        university: c.university,
        bio: c.bio,
        avatarUrl: c.avatarUrl,
        interests: c.interests,
        verified: !!c.verifiedAt,
        distanceKm,
        compatibility: score,
        sharedInterests: shared,
        reasons,
      };
    }).sort((a, b) => b.compatibility - a.compatibility);
  });

  // Connect or skip a candidate
  fastify.post('/action', { preHandler: authenticate }, async (req, reply) => {
    const body = ActionSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    const { targetUserId, action } = body.data;
    if (targetUserId === req.userId) return reply.status(400).send({ error: 'Cannot match yourself' });

    const status = action === 'connect' ? 'pending' : 'declined';

    const existing = await prisma.match.findUnique({
      where: { fromId_toId: { fromId: req.userId, toId: targetUserId } },
    });
    const mine = existing
      ? await prisma.match.update({ where: { id: existing.id }, data: { status, respondedAt: new Date() } })
      : await prisma.match.create({ data: { fromId: req.userId, toId: targetUserId, status } });

    if (action === 'skip') return { status: mine.status, matched: false };

    // Check for a reciprocal pending/matched request the other way
    const reciprocal = await prisma.match.findUnique({
      where: { fromId_toId: { fromId: targetUserId, toId: req.userId } },
    });

    if (reciprocal && reciprocal.status !== 'declined') {
      await prisma.$transaction([
        prisma.match.update({ where: { id: mine.id }, data: { status: 'matched', respondedAt: new Date() } }),
        prisma.match.update({ where: { id: reciprocal.id }, data: { status: 'matched', respondedAt: new Date() } }),
      ]);
      await prisma.activityLog.createMany({
        data: [
          { userId: req.userId, type: 'match_created', title: 'New match', actor: 'System', metadata: { partnerId: targetUserId } },
          { userId: targetUserId, type: 'match_created', title: 'New match', actor: 'System', metadata: { partnerId: req.userId } },
        ],
      });
      return { status: 'matched', matched: true };
    }

    return { status: mine.status, matched: false };
  });

  // My matches (pending sent, and mutual)
  fastify.get('/matches', { preHandler: authenticate }, async (req) => {
    const me = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { interests: true, university: true },
    });

    const matches = await prisma.match.findMany({
      where: {
        OR: [{ fromId: req.userId }, { toId: req.userId }],
        status: { in: ['pending', 'matched'] },
      },
      include: {
        from: { select: { id: true, fullName: true, username: true, university: true, avatarUrl: true, interests: true, verifiedAt: true } },
        to:   { select: { id: true, fullName: true, username: true, university: true, avatarUrl: true, interests: true, verifiedAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // A mutual match produces two rows (one per direction) that both flip to
    // 'matched' — dedupe by partner so each connection appears once.
    const byPartner = new Map();
    for (const m of matches) {
      const partner = m.fromId === req.userId ? m.to : m.from;
      const iAmSender = m.fromId === req.userId;
      const existing = byPartner.get(partner.id);
      if (existing && !(m.status === 'matched' && existing.status !== 'matched')) continue;

      const { score, shared } = scoreAndReasons(me, partner);
      byPartner.set(partner.id, {
        id: m.id,
        status: m.status,
        // 'pending' from my side means I'm waiting on them; if they sent it, it's awaiting my response
        direction: iAmSender ? 'sent' : 'received',
        partner: {
          id: partner.id,
          // Real name stays hidden until it's an actual mutual match — a one-sided
          // pending request shouldn't unmask someone who hasn't matched back yet.
          name: m.status === 'matched' ? partner.fullName : null,
          handle: partner.username ? `@${partner.username}` : null,
          university: partner.university, avatarUrl: partner.avatarUrl, verified: !!partner.verifiedAt,
        },
        compatibility: score,
        sharedInterests: shared,
        createdAt: m.createdAt,
      });
    }
    return [...byPartner.values()];
  });
}
