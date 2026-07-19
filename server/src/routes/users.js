import sharp from 'sharp';
import { prisma } from '../db/client.js';
import { authenticate } from '../middleware/authenticate.js';
import { StorageService } from '../services/StorageService.js';
import { calculateAge, isMinor } from '../utils/age.js';
import { z } from 'zod';

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

const ProfileSchema = z.object({
  username:     z.string().regex(USERNAME_RE, 'Handles are 3-20 characters: lowercase letters, numbers, underscore only').optional(),
  university:   z.string().max(80).optional(),
  bio:          z.string().max(280).optional(),
  interests:    z.array(z.string().max(30)).max(20).optional(),
  discoverable: z.boolean().optional(),
});

const LocationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

const DobSchema = z.object({
  dateOfBirth: z.coerce.date()
    .refine((d) => d <= new Date(), 'Date of birth cannot be in the future')
    .refine((d) => calculateAge(d) < 120, 'That date of birth looks incorrect'),
});

const PROFILE_SELECT = {
  id: true, username: true, university: true, bio: true, avatarUrl: true,
  interests: true, discoverable: true,
};

const ACCEPTED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

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

  // Live availability check while typing a handle
  fastify.get('/handle-check', { preHandler: authenticate }, async (req, reply) => {
    const username = (req.query.username ?? '').trim().toLowerCase();
    if (!USERNAME_RE.test(username)) {
      return { available: false, reason: 'Handles are 3-20 characters: lowercase letters, numbers, underscore only' };
    }
    const existing = await prisma.user.findUnique({ where: { username }, select: { id: true } });
    const available = !existing || existing.id === req.userId;
    return { available, reason: available ? null : 'That handle is taken' };
  });

  fastify.get('/me', { preHandler: authenticate }, async (req) => {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true, fullName: true, phone: true, email: true, verifiedAt: true, createdAt: true, region: true,
        username: true, university: true, bio: true, avatarUrl: true, interests: true, discoverable: true,
        lastLat: true, lastLng: true, lastLocatedAt: true, dateOfBirth: true,
      },
    });
    return { ...user, isMinor: isMinor(user.dateOfBirth) };
  });

  // Age gate: record date of birth (once set, drives minor/adult gating everywhere)
  fastify.patch('/me/dob', { preHandler: authenticate }, async (req, reply) => {
    const body = DobSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    await prisma.user.update({ where: { id: req.userId }, data: { dateOfBirth: body.data.dateOfBirth } });
    await prisma.activityLog.create({
      data: { userId: req.userId, type: 'age_verified', title: 'Date of birth confirmed', actor: 'You', metadata: {} },
    });
    return { isMinor: isMinor(body.data.dateOfBirth) };
  });

  fastify.patch('/me', { preHandler: authenticate }, async (req, reply) => {
    const allowed = ['fullName', 'email'];
    const data = Object.fromEntries(Object.entries(req.body ?? {}).filter(([k]) => allowed.includes(k)));
    if (!Object.keys(data).length) return reply.status(400).send({ error: 'No updatable fields provided' });
    return prisma.user.update({ where: { id: req.userId }, data });
  });

  // Discovery profile (handle, university, bio, interests, discoverable)
  fastify.patch('/me/profile', { preHandler: authenticate }, async (req, reply) => {
    const body = ProfileSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    if (!Object.keys(body.data).length) return reply.status(400).send({ error: 'No updatable fields provided' });

    if (body.data.username) body.data.username = body.data.username.toLowerCase();

    // Can't go discoverable without a handle — it's the only identity shown pre-match
    const wantsDiscoverable = body.data.discoverable ?? undefined;
    if (wantsDiscoverable) {
      const settingHandleNow = !!body.data.username;
      if (!settingHandleNow) {
        const current = await prisma.user.findUnique({ where: { id: req.userId }, select: { username: true } });
        if (!current.username) return reply.status(400).send({ error: 'Set a handle before turning on Discovery visibility' });
      }
    }

    try {
      return await prisma.user.update({ where: { id: req.userId }, data: body.data, select: PROFILE_SELECT });
    } catch (err) {
      if (err.code === 'P2002') return reply.status(409).send({ error: 'That handle is taken', code: 'HANDLE_TAKEN' });
      throw err;
    }
  });

  // Avatar photo upload — resized/re-encoded server-side, stored via StorageService
  fastify.post('/me/avatar', { preHandler: authenticate }, async (req, reply) => {
    const file = await req.file({ limits: { fileSize: MAX_AVATAR_BYTES } });
    if (!file) return reply.status(400).send({ error: 'No file uploaded' });
    if (!ACCEPTED_MIME.has(file.mimetype)) {
      return reply.status(400).send({ error: 'Only JPEG, PNG, or WEBP images are accepted' });
    }

    const original = await file.toBuffer().catch(() => null);
    if (!original) return reply.status(413).send({ error: 'File too large (max 5MB)' });

    let resized;
    try {
      resized = await sharp(original)
        .rotate() // respect EXIF orientation
        .resize(400, 400, { fit: 'cover' })
        .webp({ quality: 82 })
        .toBuffer();
    } catch {
      return reply.status(400).send({ error: 'Could not process image' });
    }

    const url = await StorageService.save(resized, 'avatars', 'webp');

    const prev = await prisma.user.findUnique({ where: { id: req.userId }, select: { avatarUrl: true } });
    const updated = await prisma.user.update({
      where: { id: req.userId }, data: { avatarUrl: url }, select: { avatarUrl: true },
    });
    if (prev?.avatarUrl) await StorageService.remove(prev.avatarUrl);

    return updated;
  });

  fastify.delete('/me/avatar', { preHandler: authenticate }, async (req) => {
    const prev = await prisma.user.findUnique({ where: { id: req.userId }, select: { avatarUrl: true } });
    await prisma.user.update({ where: { id: req.userId }, data: { avatarUrl: null } });
    if (prev?.avatarUrl) await StorageService.remove(prev.avatarUrl);
    return { ok: true };
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
    const prev = await prisma.user.findUnique({ where: { id: req.userId }, select: { avatarUrl: true } });
    await prisma.user.update({
      where: { id: req.userId },
      data: {
        fullName:  'Deleted User',
        phone:     `deleted_${req.userId}`,
        email:     null,
        username:  null,
        avatarUrl: null,
        pinHash:   '',
        duressPinHash: null,
        status:    'deleted',
        deletedAt: new Date(),
      },
    });
    if (prev?.avatarUrl) await StorageService.remove(prev.avatarUrl);
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
