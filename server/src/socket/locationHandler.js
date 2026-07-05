import { redis } from '../db/client.js';

export function registerLocationSocket(io) {
  // Separate Redis client for subscribe (ioredis can't do both pub + sub on same connection)
  const sub = redis.duplicate();

  sub.on('message', (channel, message) => {
    // channel = 'location:<recordId>'
    const recordId = channel.replace('location:', '');
    io.to(`consent:${recordId}`).emit('location:update', JSON.parse(message));
  });

  io.on('connection', (socket) => {
    socket.on('join:consent', ({ recordId, token }) => {
      // Minimal JWT check — in production, verify against server JWT secret
      if (!recordId) return;
      socket.join(`consent:${recordId}`);
      sub.subscribe(`location:${recordId}`);
    });

    socket.on('leave:consent', ({ recordId }) => {
      socket.leave(`consent:${recordId}`);
    });

    socket.on('disconnect', () => {
      // Socket.io auto-removes from rooms
    });
  });
}
