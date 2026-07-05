import { authenticate } from '../middleware/authenticate.js';
import { triggerDuress, triggerGuardianAlert } from '../services/AlertService.js';

export default async function alertRoutes(fastify) {

  fastify.post('/duress', { preHandler: authenticate }, async (req) => {
    const { lat, lng } = req.body ?? {};
    const result = await triggerDuress({ userId: req.userId, lat, lng });
    return result;
  });

  fastify.post('/guardian', { preHandler: authenticate }, async (req, reply) => {
    const { type, lat, lng } = req.body ?? {};
    if (!['silent_checkin', 'come_get_me', 'emergency'].includes(type)) {
      return reply.status(400).send({ error: 'Invalid alert type' });
    }
    await triggerGuardianAlert({ userId: req.userId, type, lat, lng });
    return { sent: true };
  });
}
