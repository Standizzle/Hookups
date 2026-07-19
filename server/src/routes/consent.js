import { prisma } from '../db/client.js';
import { authenticate } from '../middleware/authenticate.js';
import { verifyPIN } from '../services/PINService.js';
import { createConsentRequest, confirmConsent, revokeConsent } from '../services/ConsentService.js';
import { triggerDuress } from '../services/AlertService.js';
import { z } from 'zod';

const RequestSchema = z.object({
  consenterId:     z.string().uuid(),
  method:          z.enum(['nfc', 'airdrop', 'qr', 'manual']),
  expiresInMinutes: z.number().min(5).max(1440).default(60),
  terms: z.object({
    holdingHandsHugging:   z.boolean().default(false),
    kissingAffection:      z.boolean().default(false),
    touchingAboveClothing: z.boolean().default(false),
    touchingUnderClothing: z.boolean().default(false),
    sexualIntimacy:        z.boolean().default(false),
    photosVideo:      z.boolean().default(false),
    overnightStays:   z.boolean().default(false),
    safeWord:         z.string().max(50).default(''),
    locationSharing:  z.boolean().default(false),
  }),
  location: z.object({
    lat:       z.number().optional(),
    lng:       z.number().optional(),
    placeName: z.string().optional(),
  }).optional(),
});

const ConfirmSchema = z.object({
  pin:             z.string().regex(/^\d{4}$/),
  agreedToLocation: z.boolean().default(false),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

const RevokeSchema = z.object({
  pin:    z.string().regex(/^\d{4}$/),
  reason: z.string().max(200).optional(),
});

export default async function consentRoutes(fastify) {

  // POST /consent/request
  fastify.post('/request', { preHandler: authenticate }, async (req, reply) => {
    const body = RequestSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const record = await createConsentRequest({
      requesterId: req.userId,
      ...body.data,
      ipA: req.ip,
    });

    return reply.status(201).send({
      id:       record.id,
      recordId: record.recordId,
      deeplink: `hookups://consent/${record.id}`,
      expiresAt: record.expiresAt,
    });
  });

  // GET /consent/:id  (public — consenter fetches disclosure before PIN)
  fastify.get('/:id', async (req, reply) => {
    const record = await prisma.consentRecord.findUnique({
      where: { id: req.params.id },
      include: {
        requester: { select: { id: true, fullName: true, verifiedAt: true } },
      },
    });
    if (!record) return reply.status(404).send({ error: 'Consent record not found' });
    if (record.status !== 'pending') return reply.status(409).send({ error: 'Consent is no longer pending', status: record.status });
    if (new Date() > record.expiresAt) return reply.status(410).send({ error: 'Consent request expired' });

    return {
      id:       record.id,
      recordId: record.recordId,
      requester: {
        id:       record.requester.id,
        name:     record.requester.fullName,
        verified: !!record.requester.verifiedAt,
      },
      terms: {
        holdingHandsHugging:   record.holdingHandsHugging,
        kissingAffection:      record.kissingAffection,
        touchingAboveClothing: record.touchingAboveClothing,
        touchingUnderClothing: record.touchingUnderClothing,
        sexualIntimacy:        record.sexualIntimacy,
        photosVideo:      record.photosVideo,
        overnightStays:   record.overnightStays,
        safeWord:         record.safeWord,
        locationSharing:  record.locationRequested,
      },
      method:    record.method,
      expiresAt: record.expiresAt,
    };
  });

  // POST /consent/:id/confirm
  fastify.post('/:id/confirm', { preHandler: authenticate }, async (req, reply) => {
    const body = ConfirmSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { pinHash: true, duressPinHash: true } });
    const { valid, isDuress } = await verifyPIN(req.userId, body.data.pin, user.pinHash, user.duressPinHash);

    if (!valid) {
      // Log attempt for security
      await prisma.activityLog.create({
        data: { userId: req.userId, type: 'pin_attempt_failed', title: 'Wrong PIN entered', actor: 'You', metadata: { recordId: req.params.id } },
      });
      return reply.status(401).send({ error: 'Incorrect PIN — this attempt has been logged.', code: 'PIN_WRONG' });
    }

    if (isDuress) {
      // lat/lng captured client-side on every confirm attempt symmetrically
      // (duress or not) — carries a real fix instead of always null.
      triggerDuress({ userId: req.userId, lat: body.data.lat ?? null, lng: body.data.lng ?? null }).catch(() => {});
    }

    let record;
    try {
      record = await confirmConsent({
        recordId:        req.params.id,
        userId:          req.userId,
        agreedToLocation: body.data.agreedToLocation,
        ipB:             req.ip,
      });
    } catch (err) {
      const GATE_MESSAGES = {
        NO_PARENTAL_LINK: "You need a linked parent/guardian to confirm this.",
        LEVEL_BLOCKED:    "This exceeds what's permitted for your account.",
        OVERRIDE_DENIED:  'Your parent declined this request.',
        OVERRIDE_PENDING: "This needs your parent's approval — they've been notified.",
      };
      if (err.code && GATE_MESSAGES[err.code]) {
        return reply.status(403).send({ error: GATE_MESSAGES[err.code], code: err.code });
      }
      throw err;
    }

    return {
      status:    record.status,
      recordId:  record.recordId,
      confirmedAt: record.confirmedAt,
      expiresAt:   record.expiresAt,
      locationSharing: record.locationSharing,
    };
  });

  // POST /consent/:id/revoke
  fastify.post('/:id/revoke', { preHandler: authenticate }, async (req, reply) => {
    const body = RevokeSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { pinHash: true, duressPinHash: true } });
    const { valid } = await verifyPIN(req.userId, body.data.pin, user.pinHash, user.duressPinHash);
    if (!valid) return reply.status(401).send({ error: 'Incorrect PIN', code: 'PIN_WRONG' });

    const record = await revokeConsent({ recordId: req.params.id, userId: req.userId, reason: body.data.reason });
    return { status: record.status, revokedAt: record.revokedAt };
  });

  // GET /consent  — list user's records
  fastify.get('/', { preHandler: authenticate }, async (req) => {
    const { status, limit = 20, offset = 0 } = req.query;
    const where = {
      OR: [{ requesterId: req.userId }, { consenterId: req.userId }],
      ...(status ? { status } : {}),
    };
    const [records, total] = await Promise.all([
      prisma.consentRecord.findMany({
        where, orderBy: { startedAt: 'desc' },
        take: parseInt(limit), skip: parseInt(offset),
        include: {
          requester: { select: { id: true, fullName: true } },
          consenter: { select: { id: true, fullName: true } },
        },
      }),
      prisma.consentRecord.count({ where }),
    ]);
    return { records, total };
  });
}
