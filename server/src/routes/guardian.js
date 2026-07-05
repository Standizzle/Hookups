import { prisma } from '../db/client.js';
import { authenticate } from '../middleware/authenticate.js';
import { z } from 'zod';

const ContactSchema = z.object({
  name:      z.string().min(1).max(60),
  phone:     z.string().regex(/^\+\d{10,15}$/),
  relation:  z.enum(['parent', 'sibling', 'friend', 'partner', 'other']),
  isPrimary: z.boolean().default(false),
});

export default async function guardianRoutes(fastify) {

  fastify.get('/contacts', { preHandler: authenticate }, async (req) => {
    return prisma.guardianContact.findMany({ where: { userId: req.userId }, orderBy: { isPrimary: 'desc' } });
  });

  fastify.post('/contacts', { preHandler: authenticate }, async (req, reply) => {
    const body = ContactSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    if (body.data.isPrimary) {
      await prisma.guardianContact.updateMany({ where: { userId: req.userId }, data: { isPrimary: false } });
    }

    const contact = await prisma.guardianContact.create({ data: { userId: req.userId, ...body.data } });
    return reply.status(201).send(contact);
  });

  fastify.delete('/contacts/:id', { preHandler: authenticate }, async (req, reply) => {
    const contact = await prisma.guardianContact.findUnique({ where: { id: req.params.id } });
    if (!contact || contact.userId !== req.userId) return reply.status(404).send({ error: 'Not found' });
    await prisma.guardianContact.delete({ where: { id: req.params.id } });
    return reply.status(204).send();
  });
}
