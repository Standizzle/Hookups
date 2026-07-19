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
    physicalIntimacy: z.boolean().default(false),
    kissingAffection: z.boolean().default(false),
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
        physicalIntimacy: record.physicalIntimacy,
        kissingAffection: record.kissingAffection,
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
      triggerDuress({ userId: req.userId, lat: null, lng: null }).catch(() => {});
    }

    const record = await confirmConsent({
      recordId:        req.params.id,
      userId:          req.userId,
      agreedToLocation: body.data.agreedToLocation,
      ipB:             req.ip,
    });

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
