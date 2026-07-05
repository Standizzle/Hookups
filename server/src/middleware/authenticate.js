import { prisma } from '../db/client.js';

export async function authenticate(req, reply) {
  try {
    await req.jwtVerify();
    const user = await prisma.user.findUnique({
      where: { id: req.user.sub },
      select: { id: true, status: true, verifiedAt: true },
    });
    if (!user || user.status !== 'active') {
      return reply.status(401).send({ error: 'Account unavailable', code: 'ACCOUNT_INACTIVE' });
    }
    req.userId = user.id;
    req.userVerified = !!user.verifiedAt;
  } catch {
    reply.status(401).send({ error: 'Unauthorised', code: 'INVALID_TOKEN' });
  }
}
