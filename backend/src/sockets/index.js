const { verifyToken } = require('../utils/jwt');
const prisma = require('../config/prisma');

function initSockets(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('unauthorized'));
      const payload = verifyToken(token);
      const user = await prisma.user.findUnique({ where: { id: payload.userId }, include: { profile: true } });
      if (!user || !user.profile) return next(new Error('unauthorized'));
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const profileId = socket.user.profile.id;
    socket.join(`profile:${profileId}`);

    socket.on('conversation:join', (conversationId) => {
      socket.join(`conversation:${conversationId}`);
    });

    socket.on('conversation:leave', (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on('typing', ({ conversationId, isTyping }) => {
      socket.to(`conversation:${conversationId}`).emit('typing', { profileId, isTyping });
    });
  });
}

module.exports = { initSockets };
