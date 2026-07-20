import 'dotenv/config';
import path from 'node:path';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import rateLimit from '@fastify/rate-limit';
import { Server as SocketIO } from 'socket.io';
import { redis } from './src/db/client.js';

import authRoutes from './src/routes/auth.js';
import userRoutes from './src/routes/users.js';
import consentRoutes from './src/routes/consent.js';
import partnerRoutes from './src/routes/partners.js';
import guardianRoutes from './src/routes/guardian.js';
import parentalRoutes from './src/routes/parental.js';
import alertRoutes from './src/routes/alerts.js';
import locationRoutes from './src/routes/location.js';
import discoverRoutes from './src/routes/discover.js';
import meetupRoutes from './src/routes/meetups.js';
import relationshipRoutes from './src/routes/relationships.js';
import billingRoutes from './src/routes/billing.js';
import { registerLocationSocket } from './src/socket/locationHandler.js';

const PORT = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const fastify = Fastify({ logger: process.env.NODE_ENV !== 'production' });

// ── Plugins ───────────────────────────────────────────────────────────────────
await fastify.register(cors, {
  origin: CLIENT_ORIGIN,
  credentials: true,
});

await fastify.register(jwt, {
  secret: process.env.JWT_SECRET,
});

await fastify.register(rateLimit, {
  global: false, // opt-in per route
  redis,
  keyGenerator: (req) => req.ip,
  errorResponseBuilder: () => ({
    statusCode: 429,
    error: 'Too Many Requests',
    message: 'Slow down — too many requests.',
  }),
});

await fastify.register(multipart, {
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

// Serves locally-stored avatar uploads — see StorageService (swap for S3/R2 in prod)
await fastify.register(fastifyStatic, {
  root: path.join(import.meta.dirname, 'uploads'),
  prefix: '/uploads/',
});

// ── Auth decorator ─────────────────────────────────────────────────────────────
fastify.decorate('authenticate', async (req, reply) => {
  try {
    await req.jwtVerify();
  } catch {
    reply.status(401).send({ error: 'Unauthorised', code: 'INVALID_TOKEN' });
  }
});

// ── Routes ─────────────────────────────────────────────────────────────────────
await fastify.register(authRoutes,     { prefix: '/auth' });
await fastify.register(userRoutes,     { prefix: '/users' });
await fastify.register(consentRoutes,  { prefix: '/consent' });
await fastify.register(partnerRoutes,  { prefix: '/partners' });
await fastify.register(guardianRoutes, { prefix: '/guardian' });
await fastify.register(parentalRoutes, { prefix: '/parental' });
await fastify.register(alertRoutes,    { prefix: '/alerts' });
await fastify.register(locationRoutes, { prefix: '/location' });
await fastify.register(discoverRoutes, { prefix: '/discover' });
await fastify.register(meetupRoutes,   { prefix: '/meetups' });
await fastify.register(relationshipRoutes, { prefix: '/relationships' });
await fastify.register(billingRoutes, { prefix: '/billing' });

fastify.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }));

// ── Socket.io (live location) ──────────────────────────────────────────────────
// Attach directly to Fastify's underlying http.Server — it's the one that actually
// gets listen()'d below. Wrapping it in a fresh createServer() would produce a
// second, never-listening server that Socket.io talks to and no traffic ever reaches.
const io = new SocketIO(fastify.server, {
  cors: { origin: CLIENT_ORIGIN, credentials: true },
});
registerLocationSocket(io);

// ── Start ──────────────────────────────────────────────────────────────────────
try {
  await fastify.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`\n🔐 Hookups server → http://localhost:${PORT}`);
  console.log(`📡 Socket.io ready`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
