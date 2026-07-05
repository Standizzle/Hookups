import { prisma } from '../db/client.js';
import { SMSService } from './SMSService.js';

export async function triggerDuress({ userId, lat, lng }) {
  const [user, contacts] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { fullName: true } }),
    prisma.guardianContact.findMany({ where: { userId } }),
  ]);

  if (!contacts.length) return { sent: 0 };

  const locationStr = lat && lng
    ? `https://maps.google.com/?q=${lat},${lng}`
    : 'location unavailable';

  const message = `🚨 HOOKUPS ALERT: ${user.fullName} may need help. Last known location: ${locationStr}. This is an automated safety alert.`;

  const results = await Promise.allSettled(
    contacts.map((c) => SMSService.send(c.phone, message))
  );

  await prisma.alertEvent.create({
    data: {
      userId,
      type: 'duress',
      lat, lng,
      notifiedContactIds: contacts.map((c) => c.id),
    },
  });

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  return { sent };
}

export async function triggerGuardianAlert({ userId, type, lat, lng }) {
  const [user, contacts] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { fullName: true } }),
    prisma.guardianContact.findMany({ where: { userId } }),
  ]);

  const locationStr = lat && lng
    ? `https://maps.google.com/?q=${lat},${lng}`
    : 'location unavailable';

  const messages = {
    silent_checkin: `${user.fullName} sent a silent check-in. They're OK. Location: ${locationStr}`,
    come_get_me:    `${user.fullName} needs a pickup. Location: ${locationStr}`,
    emergency:      `🚨 ${user.fullName} needs emergency help NOW. Location: ${locationStr}. Call 10111.`,
  };

  const message = messages[type] ?? messages.emergency;

  await Promise.allSettled(contacts.map((c) => SMSService.send(c.phone, message)));

  await prisma.alertEvent.create({
    data: {
      userId, type, lat, lng,
      notifiedContactIds: contacts.map((c) => c.id),
    },
  });
}
