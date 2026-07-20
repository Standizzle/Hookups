import Stripe from 'stripe';
import { prisma } from '../db/client.js';

// Real Stripe when STRIPE_SECRET_KEY is set; a local dev-mode stub otherwise
// that activates subscriptions instantly in the DB with no network call —
// same dev-stub-vs-real pattern as SMSService/StorageService/CryptoService.
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || null;
const stripe = STRIPE_KEY ? new Stripe(STRIPE_KEY) : null;

const PRICE_IDS = {
  individual:    process.env.STRIPE_PRICE_INDIVIDUAL,
  familyBase:    process.env.STRIPE_PRICE_FAMILY_BASE,
  extraGuardian: process.env.STRIPE_PRICE_EXTRA_GUARDIAN,
  extraChild:    process.env.STRIPE_PRICE_EXTRA_CHILD,
  familyCap:     process.env.STRIPE_PRICE_FAMILY_UNLIMITED,
};

// All prices in cents (ZAR/USD-agnostic — actual currency set in the Stripe
// Dashboard against these price IDs; these constants only drive dev-mode
// math and the price breakdown shown to the client).
export const CENTS = {
  individual:    499,
  familyBase:    999,
  extraGuardian: 199,
  extraChild:    299,
  familyCap:     1999,
};

const TRIAL_DAYS = 14;

export function trialEndDate(from = new Date()) {
  return new Date(from.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
}

/** Distinct minors covered by a family plan — the owner's + any additional guardians' active links, deduped. */
export async function countFamilyChildren(subscription) {
  const guardianIds = [subscription.ownerId, ...subscription.guardians.map((g) => g.userId)];
  const links = await prisma.parentalLink.findMany({
    where: { parentId: { in: guardianIds }, status: 'active' },
    select: { minorId: true },
  });
  return new Set(links.map((l) => l.minorId)).size;
}

/** Base family plan includes the owner + first child free; everything past that is a line item, capped. */
export function computeFamilyPriceCents({ guardianCount, childCount }) {
  const extraGuardians = Math.max(0, guardianCount - 1);
  const extraChildren  = Math.max(0, childCount - 1);
  const raw = CENTS.familyBase + extraGuardians * CENTS.extraGuardian + extraChildren * CENTS.extraChild;
  return Math.min(raw, CENTS.familyCap);
}

export async function getFamilyPriceBreakdown(subscription) {
  const guardianCount = 1 + subscription.guardians.length;
  const childCount = await countFamilyChildren(subscription);
  const totalCents = computeFamilyPriceCents({ guardianCount, childCount });
  return { guardianCount, childCount, totalCents, capped: totalCents === CENTS.familyCap };
}

/** Whichever plan (owned or via family membership) currently covers this user, plus trial status. */
export async function getEffectivePlan(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { trialEndsAt: true } });
  const trialing = !!user?.trialEndsAt && user.trialEndsAt > new Date();

  const owned = await prisma.subscription.findUnique({
    where: { ownerId: userId },
    include: { guardians: true },
  });
  if (owned?.status === 'active') {
    return { covered: true, trialing, trialEndsAt: user?.trialEndsAt ?? null, plan: owned.plan, subscription: owned, role: 'owner' };
  }

  const membership = await prisma.subscriptionGuardian.findFirst({
    where: { userId },
    include: { subscription: { include: { guardians: true } } },
  });
  if (membership?.subscription?.status === 'active') {
    return { covered: true, trialing, trialEndsAt: user?.trialEndsAt ?? null, plan: membership.subscription.plan, subscription: membership.subscription, role: 'guardian' };
  }

  return { covered: trialing, trialing, trialEndsAt: user?.trialEndsAt ?? null, plan: owned?.plan ?? null, subscription: owned ?? null, role: owned ? 'owner' : null };
}

/** Gate for the acting user on a consent action — mirrors checkParentalGate/checkRelationshipGate's shape. */
export async function checkSubscriptionGate(userId) {
  const { covered } = await getEffectivePlan(userId);
  if (covered) return { allowed: true };
  return { allowed: false, reason: 'SUBSCRIPTION_REQUIRED' };
}

async function getOrCreateStripeCustomer(user) {
  if (!stripe) return null;
  const existing = await prisma.subscription.findUnique({ where: { ownerId: user.id } });
  if (existing?.stripeCustomerId) return existing.stripeCustomerId;
  const customer = await stripe.customers.create({ phone: user.phone, name: user.fullName, metadata: { userId: user.id } });
  return customer.id;
}

export async function subscribeIndividual(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (stripe) {
    const customerId = await getOrCreateStripeCustomer(user);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: PRICE_IDS.individual, quantity: 1 }],
      success_url: `${process.env.CLIENT_ORIGIN}/billing?success=1`,
      cancel_url: `${process.env.CLIENT_ORIGIN}/billing?canceled=1`,
      metadata: { userId, plan: 'individual' },
    });
    return { checkoutUrl: session.url };
  }

  // Dev mode: activate instantly, no payment collection.
  const sub = await prisma.subscription.upsert({
    where: { ownerId: userId },
    update: { plan: 'individual', status: 'active', canceledAt: null },
    create: { ownerId: userId, plan: 'individual', status: 'active' },
  });
  return { subscription: sub, devMode: true };
}

export async function subscribeFamily(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (stripe) {
    const customerId = await getOrCreateStripeCustomer(user);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: PRICE_IDS.familyBase, quantity: 1 }],
      success_url: `${process.env.CLIENT_ORIGIN}/billing?success=1`,
      cancel_url: `${process.env.CLIENT_ORIGIN}/billing?canceled=1`,
      metadata: { userId, plan: 'family' },
    });
    return { checkoutUrl: session.url };
  }

  const sub = await prisma.subscription.upsert({
    where: { ownerId: userId },
    update: { plan: 'family', status: 'active', canceledAt: null },
    create: { ownerId: userId, plan: 'family', status: 'active' },
    include: { guardians: true },
  });
  return { subscription: sub, devMode: true };
}

/** Re-syncs a family subscription's Stripe line items (or price cap) to its current guardian/child counts. Real mode only — dev mode has nothing to sync, price is computed on read. */
export async function syncFamilyStripeItems(subscription) {
  if (!stripe || !subscription.stripeSubscriptionId) return;

  const { guardianCount, childCount, capped } = await getFamilyPriceBreakdown(subscription);
  const stripeSub = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
  const removals = stripeSub.items.data.map((item) => ({ id: item.id, deleted: true }));

  const additions = capped
    ? [{ price: PRICE_IDS.familyCap, quantity: 1 }]
    : [
        { price: PRICE_IDS.familyBase, quantity: 1 },
        ...(guardianCount > 1 ? [{ price: PRICE_IDS.extraGuardian, quantity: guardianCount - 1 }] : []),
        ...(childCount > 1 ? [{ price: PRICE_IDS.extraChild, quantity: childCount - 1 }] : []),
      ];

  await stripe.subscriptions.update(subscription.stripeSubscriptionId, { items: [...removals, ...additions] });
}

export async function addGuardianToFamily({ subscriptionId, requestingUserId, guardianPhone }) {
  const sub = await prisma.subscription.findUnique({ where: { id: subscriptionId }, include: { guardians: true } });
  if (!sub || sub.ownerId !== requestingUserId) {
    const err = new Error('Not your family plan'); err.code = 'NOT_OWNER'; throw err;
  }
  if (sub.plan !== 'family') {
    const err = new Error('Not a family plan'); err.code = 'NOT_FAMILY_PLAN'; throw err;
  }

  const guardianUser = await prisma.user.findUnique({ where: { phone: guardianPhone } });
  if (!guardianUser) {
    const err = new Error('No matching account found'); err.code = 'USER_NOT_FOUND'; throw err;
  }
  if (guardianUser.id === sub.ownerId) {
    const err = new Error('Already the plan owner'); err.code = 'ALREADY_MEMBER'; throw err;
  }

  const entry = await prisma.subscriptionGuardian.upsert({
    where: { subscriptionId_userId: { subscriptionId, userId: guardianUser.id } },
    update: {},
    create: { subscriptionId, userId: guardianUser.id },
  });

  const updated = await prisma.subscription.findUnique({ where: { id: subscriptionId }, include: { guardians: true } });
  await syncFamilyStripeItems(updated).catch(() => {});
  return entry;
}

export async function removeGuardianFromFamily({ subscriptionId, requestingUserId, guardianEntryId }) {
  const sub = await prisma.subscription.findUnique({ where: { id: subscriptionId }, include: { guardians: true } });
  if (!sub || sub.ownerId !== requestingUserId) {
    const err = new Error('Not your family plan'); err.code = 'NOT_OWNER'; throw err;
  }

  await prisma.subscriptionGuardian.delete({ where: { id: guardianEntryId } });

  const updated = await prisma.subscription.findUnique({ where: { id: subscriptionId }, include: { guardians: true } });
  await syncFamilyStripeItems(updated).catch(() => {});
}

export async function cancelSubscription(userId) {
  const sub = await prisma.subscription.findUnique({ where: { ownerId: userId } });
  if (!sub) { const err = new Error('No subscription found'); err.code = 'NOT_FOUND'; throw err; }

  if (stripe && sub.stripeSubscriptionId) {
    await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
  }

  return prisma.subscription.update({
    where: { ownerId: userId },
    data: { status: 'canceled', canceledAt: new Date() },
  });
}

/** Real mode only — applies Stripe webhook events to local subscription state. */
export async function handleStripeWebhook(rawBody, signature) {
  if (!stripe) return { ignored: true };
  const event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);

  const obj = event.data.object;
  switch (event.type) {
    case 'checkout.session.completed': {
      const { userId, plan } = obj.metadata ?? {};
      if (!userId) break;
      await prisma.subscription.upsert({
        where: { ownerId: userId },
        update: { plan, status: 'active', stripeCustomerId: obj.customer, stripeSubscriptionId: obj.subscription },
        create: { ownerId: userId, plan, status: 'active', stripeCustomerId: obj.customer, stripeSubscriptionId: obj.subscription },
      });
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const status = event.type === 'customer.subscription.deleted' ? 'canceled'
        : obj.status === 'active' ? 'active' : 'past_due';
      await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: obj.id },
        data: { status, currentPeriodEnd: obj.current_period_end ? new Date(obj.current_period_end * 1000) : null },
      });
      break;
    }
  }
  return { received: true };
}
