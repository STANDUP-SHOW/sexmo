// Namespace Socket.io séparé pour le Sexmo Tchat (salons publics par
// département) : accessible aux membres connectés (jeton JWT normal) ET aux
// invités (juste un pseudo, sans compte). Le namespace privé /messages/*
// reste inchangé et strictement réservé aux comptes avec profil (voir
// sockets/index.js) — on ne mélange pas les deux surfaces.
const { verifyToken } = require('../utils/jwt');
const prisma = require('../config/prisma');
const DEPARTMENTS = require('../data/departments');

const DEPARTMENT_CODES = new Set(DEPARTMENTS.map((d) => d.code));
const MAX_MESSAGE_LENGTH = 500;

async function isBanned({ userId, guestId }) {
  const ban = await prisma.chatBan.findFirst({
    where: { OR: [userId ? { userId } : undefined, guestId ? { guestId } : undefined].filter(Boolean) },
  });
  return Boolean(ban);
}

function initChatSockets(io) {
  const chat = io.of('/chat');

  chat.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (token) {
        const payload = verifyToken(token);
        const user = await prisma.user.findUnique({ where: { id: payload.userId }, include: { profile: true } });
        if (user && user.profile && user.status === 'ACTIVE') {
          socket.identity = { type: 'member', userId: user.id, pseudo: user.profile.pseudo };
          return next();
        }
      }

      const guestPseudo = String(socket.handshake.auth?.guestPseudo || '').trim().slice(0, 30);
      const guestId = String(socket.handshake.auth?.guestId || '').trim().slice(0, 100);
      if (guestPseudo.length >= 2 && guestId) {
        socket.identity = { type: 'guest', guestId, pseudo: guestPseudo };
        return next();
      }

      next(new Error('unauthorized'));
    } catch (err) {
      next(new Error('unauthorized'));
    }
  });

  chat.on('connection', async (socket) => {
    const { type, userId, guestId } = socket.identity;
    if (await isBanned({ userId, guestId })) {
      socket.emit('chat:banned');
      socket.disconnect(true);
      return;
    }

    let currentDept = null;

    socket.on('chat:join', (department) => {
      if (!DEPARTMENT_CODES.has(department)) return;
      if (currentDept) socket.leave(`chat:${currentDept}`);
      currentDept = department;
      socket.join(`chat:${department}`);
    });

    socket.on('chat:leave', () => {
      if (currentDept) socket.leave(`chat:${currentDept}`);
      currentDept = null;
    });

    socket.on('chat:message', async (content) => {
      if (!currentDept) return;
      const text = String(content || '').trim().slice(0, MAX_MESSAGE_LENGTH);
      if (!text) return;
      if (await isBanned({ userId, guestId })) {
        socket.emit('chat:banned');
        socket.disconnect(true);
        return;
      }

      const message = await prisma.chatMessage.create({
        data: {
          department: currentDept,
          authorUserId: type === 'member' ? userId : null,
          guestId: type === 'guest' ? guestId : null,
          authorName: socket.identity.pseudo,
          content: text,
        },
      });

      chat.to(`chat:${currentDept}`).emit('chat:message', {
        id: message.id,
        authorName: message.authorName,
        content: message.content,
        createdAt: message.createdAt,
        isGuest: type === 'guest',
      });
    });
  });
}

module.exports = { initChatSockets };
