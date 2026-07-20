import { prisma } from '../db/client.js';
import { authenticate } from '../middleware/authenticate.js';
import { redis } from '../db/client.js';
import { getActiveParentLink } from '../services/ParentalGateService.js';

const BLOCK_PRECISION_M = 200; // snap to 200m grid

function snapToBlock(lat, lng) {
  // ~200m grid (0.0018 degrees latitude ≈ 200m)
  const grid = 0.0018;
  return {
    lat: Math.round(lat / grid) * grid,
    lng: Math.round(lng / grid) * grid,
  };
}

export default async function locationRoutes(fastify) {

  // Start sharing for a consent record
  fastify.post('/share/start', { preHandler: authenticate }, async (req, reply) => {
    const { recordId, precision = 'exact' } = req.body ?? {};
    if (!recordId) return reply.status(400).send({ error: 'recordId required' });

    const share = await prisma.locationShare.upsert({
      where: { recordId_userId: { recordId, userId: req.userId } },
      update: { active: true, precision, endedAt: null },
      create: { recordId, userId: req.userId, precision, active: true },
    });
    return share;
  });

  // Ping location update
  fastify.post('/share/ping', { preHandler: authenticate }, async (req, reply) => {
    const { recordId, lat, lng, accuracy } = req.body ?? {};
    if (!recordId || lat == null || lng == null) return reply.status(400).send({ error: 'recordId, lat, lng required' });

    const share = await prisma.locationShare.findUnique({
      where: { recordId_userId: { recordId, userId: req.userId } },
    });
    if (!share || !share.active) return reply.status(409).send({ error: 'No active share for this record' });

    let finalLat = lat, finalLng = lng;
    if (share.precision === 'block') {
      const snapped = snapToBlock(lat, lng);
      finalLat = snapped.lat;
      finalLng = snapped.lng;
    }

    await prisma.locationShare.update({
      where: { recordId_userId: { recordId, userId: req.userId } },
      data: { lastLat: finalLat, lastLng: finalLng, lastAcc: accuracy, lastPing: new Date() },
    });

    // Publish to Redis for Socket.io relay
    await redis.publish(`location:${recordId}`, JSON.stringify({
      userId: req.userId, lat: finalLat, lng: finalLng, accuracy, ts: Date.now(),
    }));

    return { ok: true };
  });

  // Stop sharing
  fastify.post('/share/stop', { preHandler: authenticate }, async (req, reply) => {
    const { recordId } = req.body ?? {};
    await prisma.locationShare.updateMany({
      where: { recordId, userId: req.userId },
      data:  { active: false, endedAt: new Date() },
    });
    await redis.publish(`location:${recordId}`, JSON.stringify({
      userId: req.userId, stopped: true, ts: Date.now(),
    }));
    return { ok: true };
  });

  // Get partner's last known position — a participant sees the other party;
  // a linked, active parent of a minor participant sees their child instead.
  fastify.get('/share/:recordId', { preHandler: authenticate }, async (req, reply) => {
    const record = await prisma.consentRecord.findUnique({ where: { id: req.params.recordId } });
    if (!record) return reply.status(404).send({ error: 'Record not found' });

    let targetId;
    if (record.requesterId === req.userId || record.consenterId === req.userId) {
      targetId = record.requesterId === req.userId ? record.consenterId : record.requesterId;
    } else {
      for (const partyId of [record.requesterId, record.consenterId]) {
        const link = await getActiveParentLink(partyId);
        if (link?.parentId === req.userId) { targetId = partyId; break; }
      }
      if (!targetId) return reply.status(403).send({ error: 'Forbidden' });
    }

    const share = await prisma.locationShare.findUnique({
      where: { recordId_userId: { recordId: req.params.recordId, userId: targetId } },
    });

    if (!share || !share.active) return { sharing: false };

    return {
      sharing: true,
      lat:     share.lastLat,
      lng:     share.lastLng,
      accuracy: share.lastAcc,
      lastPing: share.lastPing,
      precision: share.precision,
    };
  });
}
