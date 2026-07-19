import { prisma } from '../db/client.js';
import { hashPIN, verifyPIN, isValidPIN, pinsAreEqual } from '../services/PINService.js';
import { SMSService } from '../services/SMSService.js';
import { redis } from '../db/client.js';
import { z } from 'zod';

const SignupSchema = z.object({
  fullName: z.string().min(2).max(60),
  phone:    z.string().regex(/^\+\d{10,15}$/, 'Phone must be E.164 format e.g. +27821234567'),
});

const SetPINSchema = z.object({
  pin:      z.string().regex(/^\d{4}$/),
  duressPin: z.string().regex(/^\d{4}$/).optional(),
});

const LoginSchema = z.object({
  phone: z.string(),
  pin:   z.string().regex(/^\d{4}$/),
});

export default async function authRoutes(fastify) {

  // POST /auth/signup
  fastify.post('/signup', {
    config: { rateLimit: { max: 5, timeWindow: '15m' } },
  }, async (req, reply) => {
    const body = SignupSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    const { fullName, phone } = body.data;

    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing) {
      if (existing.status === 'deleted') return reply.status(409).send({ error: 'Phone already registered', code: 'PHONE_TAKEN' });
      // Re-send OTP for existing unverified
    }

    await SMSService.sendOTP(phone);
    await redis.setex(`otp:${phone}`, 600, 'sent'); // TTL 10 min

    return { message: 'OTP sent', phone };
  });

  // POST /auth/verify-otp
  fastify.post('/verify-otp', {
    config: { rateLimit: { max: 10, timeWindow: '15m' } },
  }, async (req, reply) => {
    const { phone, code, fullName } = req.body ?? {};
    if (!phone || !code) return reply.status(400).send({ error: 'phone and code required' });

    const ok = await SMSService.verifyOTP(phone, code);
    if (!ok) return reply.status(400).send({ error: 'Invalid or expired OTP', code: 'OTP_INVALID' });

    // Upsert user
    let user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      user = await prisma.user.create({ data: { phone, fullName: fullName ?? 'User', pinHash: '' } });
      await prisma.activityLog.create({
        data: { userId: user.id, type: 'registration', title: 'Account created', actor: 'System', metadata: {} },
      });
    }

    const token = fastify.jwt.sign({ sub: user.id }, { expiresIn: '30d' }); // provisional — extended after PIN set
    return { token, userId: user.id, pinSet: !!user.pinHash };
  });

  // POST /auth/set-pin  (requires provisional JWT)
  fastify.post('/set-pin', { preHandler: fastify.authenticate }, async (req, reply) => {
    const body = SetPINSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    const { pin, duressPin } = body.data;

    if (duressPin && pinsAreEqual(pin, duressPin)) {
      return reply.status(400).send({ error: 'Duress PIN must differ from personal PIN', code: 'PIN_MATCH' });
    }

    const userId = req.user.sub;
    const [pinHash, duressPinHash] = await Promise.all([
      hashPIN(userId, pin),
      duressPin ? hashPIN(userId, duressPin) : Promise.resolve(null),
    ]);

    await prisma.user.update({ where: { id: userId }, data: { pinHash, duressPinHash } });
    await prisma.activityLog.create({
      data: { userId, type: 'pin_set', title: 'PIN set', actor: 'You', metadata: {} },
    });

    const token = fastify.jwt.sign({ sub: userId }, { expiresIn: '24h' });
    return { token, message: 'PIN set successfully' };
  });

  // POST /auth/login
  fastify.post('/login', {
    config: { rateLimit: { max: 10, timeWindow: '15m' } },
  }, async (req, reply) => {
    const body = LoginSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    const { phone, pin } = body.data;

    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user || user.status !== 'active') {
      return reply.status(401).send({ error: 'Invalid credentials', code: 'AUTH_FAILED' });
    }

    // Rate limit PIN attempts per user
    const attemptsKey = `pin_attempts:${user.id}`;
    const attempts = parseInt(await redis.get(attemptsKey) ?? '0', 10);
    if (attempts >= 10) {
      return reply.status(429).send({ error: 'Account locked — too many PIN attempts. Reset via email.', code: 'PIN_LOCKED' });
    }

    const { valid, isDuress } = await verifyPIN(user.id, pin, user.pinHash, user.duressPinHash);

    if (!valid) {
      await redis.setex(attemptsKey, 3600, String(attempts + 1));
      return reply.status(401).send({ error: 'Incorrect PIN', code: 'PIN_WRONG', attempt: attempts + 1 });
    }

    // Clear attempts on success
    await redis.del(attemptsKey);

    if (isDuress) {
      // Silently trigger duress alert — import lazily to avoid circular
      import('../services/AlertService.js').then(({ triggerDuress }) => {
        triggerDuress({ userId: user.id, lat: null, lng: null }).catch(() => {});
      });
    }

    const token = fastify.jwt.sign({ sub: user.id }, { expiresIn: '24h' });
    // isDuress is NEVER returned to client
    return { token, userId: user.id, verified: !!user.verifiedAt };
  });

  // GET /auth/me
  fastify.get('/me', { preHandler: fastify.authenticate }, async (req) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.sub },
      select: {
        id: true, fullName: true, phone: true, email: true,
        verifiedAt: true, createdAt: true, region: true,
        university: true, bio: true, avatarEmoji: true, interests: true, discoverable: true,
        lastLat: true, lastLng: true, lastLocatedAt: true,
      },
    });
    return user;
  });
}
