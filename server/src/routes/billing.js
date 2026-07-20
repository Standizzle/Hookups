import { prisma } from '../db/client.js';
import { authenticate } from '../middleware/authenticate.js';
import {
  getEffectivePlan, getFamilyPriceBreakdown, subscribeIndividual, subscribeFamily,
  addGuardianToFamily, removeGuardianFromFamily, cancelSubscription, handleStripeWebhook, CENTS,
} from '../services/BillingService.js';
import { z } from 'zod';

const CheckoutSchema = z.object({ plan: z.enum(['individual', 'family']) });
const AddGuardianSchema = z.object({ phone: z.string() });

export default async function billingRoutes(fastify) {

  // Stripe needs the raw request body to verify the webhook signature —
  // scoped to this plugin only, doesn't affect any other route's JSON parsing.
  fastify.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
    req.rawBody = body;
    try { done(null, body.length ? JSON.parse(body) : {}); }
    catch (err) { done(err); }
  });

  fastify.get('/status', { preHandler: authenticate }, async (req) => {
    const plan = await getEffectivePlan(req.userId);
    let breakdown = null;
    if (plan.subscription?.plan === 'family') {
      breakdown = await getFamilyPriceBreakdown(plan.subscription);
    }
    return {
      covered: plan.covered,
      trialing: plan.trialing,
      trialEndsAt: plan.trialEndsAt,
      plan: plan.plan,
      role: plan.role,
      subscriptionId: plan.subscription?.id ?? null,
      status: plan.subscription?.status ?? null,
      isOwner: plan.subscription?.ownerId === req.userId,
      guardians: plan.subscription?.guardians?.map((g) => ({ id: g.id, userId: g.userId })) ?? [],
      priceBreakdown: breakdown,
      prices: CENTS,
    };
  });

  fastify.post('/checkout', { preHandler: authenticate }, async (req, reply) => {
    const body = CheckoutSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const result = body.data.plan === 'individual'
      ? await subscribeIndividual(req.userId)
      : await subscribeFamily(req.userId);
    return result;
  });

  fastify.post('/cancel', { preHandler: authenticate }, async (req, reply) => {
    try {
      const sub = await cancelSubscription(req.userId);
      return { status: sub.status };
    } catch (err) {
      return reply.status(404).send({ error: err.message, code: err.code });
    }
  });

  fastify.post('/family/guardians', { preHandler: authenticate }, async (req, reply) => {
    const body = AddGuardianSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const sub = await prisma.subscription.findUnique({ where: { ownerId: req.userId } });
    if (!sub) return reply.status(404).send({ error: 'No family plan found' });

    try {
      const entry = await addGuardianToFamily({ subscriptionId: sub.id, requestingUserId: req.userId, guardianPhone: body.data.phone });
      return reply.status(201).send(entry);
    } catch (err) {
      return reply.status(400).send({ error: err.message, code: err.code });
    }
  });

  fastify.delete('/family/guardians/:id', { preHandler: authenticate }, async (req, reply) => {
    const sub = await prisma.subscription.findUnique({ where: { ownerId: req.userId } });
    if (!sub) return reply.status(404).send({ error: 'No family plan found' });

    try {
      await removeGuardianFromFamily({ subscriptionId: sub.id, requestingUserId: req.userId, guardianEntryId: req.params.id });
      return reply.status(204).send();
    } catch (err) {
      return reply.status(400).send({ error: err.message, code: err.code });
    }
  });

  // POST /billing/webhook — Stripe events (real mode only)
  fastify.post('/webhook', async (req, reply) => {
    try {
      const result = await handleStripeWebhook(req.rawBody, req.headers['stripe-signature']);
      return result;
    } catch (err) {
      return reply.status(400).send({ error: 'Webhook signature verification failed' });
    }
  });
}
