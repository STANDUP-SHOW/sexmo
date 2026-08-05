// Namespace Socket.io séparé pour le Sexmo Tchat (salons publics par
// département) : accessible aux membres connectés (jeton JWT normal) ET aux
// invités (pseudo + genre, sans compte). Le namespace privé /messages/*
// reste inchangé et strictement réservé aux comptes avec profil (voir
// sockets/index.js) — on ne mélange pas les deux surfaces.
//
// Flux : tout le monde peut se connecter au namespace pour observer le
// nombre de connectés par département (utile sur l'écran de sélection,
// avant même de rejoindre un salon). Un membre est identifié dès la
// connexion (jeton). Un invité doit d'abord envoyer chat:identify
// (pseudo + genre) avant de pouvoir rejoindre un salon ou écrire.
const { verifyToken } = require('../utils/jwt');
const prisma = require('../config/prisma');
const DEPARTMENTS = require('../data/departments');

const DEPARTMENT_CODES = new Set(DEPARTMENTS.map((d) => d.code));
const MAX_MESSAGE_LENGTH = 500;
const GENDER_BUCKETS = ['HOMME', 'FEMME', 'TRANS', 'AUTRE'];

// Réduit le genre détaillé d'un profil aux 4 catégories d'affichage du
// tchat (couleur bleu/rose/jaune/gris) — couples et non-binaire tombent
// dans "AUTRE" (gris), n'ayant pas d'équivalent direct.
function genderBucket(gender) {
  if (gender === 'HOMME' || gender === 'FEMME' || gender === 'TRANS') return gender;
  return 'AUTRE';
}

async function isBanned({ userId, guestId }) {
  const ban = await prisma.chatBan.findFirst({
    where: { OR: [userId ? { userId } : undefined, guestId ? { guestId } : undefined].filter(Boolean) },
  });
  return Boolean(ban);
}

// Présence en mémoire uniquement (pas de persistance) : qui est dans quel
// salon, pour le compteur par département et la liste des connectés.
const roomUsers = new Map(); // department -> Map<socketId, {pseudo, genderBucket}>

function countsSnapshot() {
  const counts = {};
  for (const [dept, users] of roomUsers) counts[dept] = users.size;
  return counts;
}

function usersSnapshot(department) {
  const users = roomUsers.get(department);
  if (!users) return [];
  return [...users.values()].sort((a, b) => GENDER_BUCKETS.indexOf(a.genderBucket) - GENDER_BUCKETS.indexOf(b.genderBucket));
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
          socket.identity = { type: 'member', userId: user.id, pseudo: user.profile.pseudo, genderBucket: genderBucket(user.profile.gender) };
        }
      }
      // Pas d'identité valide : connexion acceptée quand même, en mode
      // "observateur" (compteurs uniquement) jusqu'à chat:identify.
      next();
    } catch (err) {
      next();
    }
  });

  chat.on('connection', async (socket) => {
    if (socket.identity && (await isBanned({ userId: socket.identity.userId }))) {
      socket.emit('chat:banned');
      socket.disconnect(true);
      return;
    }

    let currentDept = null;
    socket.emit('chat:counts', countsSnapshot());

    const identifySchema = (guestPseudo, guestGender, guestId) => {
      const pseudo = String(guestPseudo || '').trim().slice(0, 30);
      const gender = GENDER_BUCKETS.includes(guestGender) ? guestGender : 'AUTRE';
      const id = String(guestId || '').trim().slice(0, 100);
      return pseudo.length >= 2 && id ? { pseudo, gender, id } : null;
    };

    socket.on('chat:identify', async ({ guestPseudo, guestGender, guestId } = {}) => {
      if (socket.identity) return; // déjà identifié (membre)
      const parsed = identifySchema(guestPseudo, guestGender, guestId);
      if (!parsed) return;
      if (await isBanned({ guestId: parsed.id })) {
        socket.emit('chat:banned');
        socket.disconnect(true);
        return;
      }
      socket.identity = { type: 'guest', guestId: parsed.id, pseudo: parsed.pseudo, genderBucket: parsed.gender };
      socket.emit('chat:identified');
    });

    const leaveCurrentRoom = () => {
      if (!currentDept) return;
      socket.leave(`chat:${currentDept}`);
      roomUsers.get(currentDept)?.delete(socket.id);
      if (roomUsers.get(currentDept)?.size === 0) roomUsers.delete(currentDept);
      chat.to(`chat:${currentDept}`).emit('chat:users', usersSnapshot(currentDept));
      chat.emit('chat:counts', countsSnapshot());
      currentDept = null;
    };

    socket.on('chat:join', (department) => {
      if (!socket.identity || !DEPARTMENT_CODES.has(department)) return;
      leaveCurrentRoom();
      currentDept = department;
      socket.join(`chat:${department}`);
      if (!roomUsers.has(department)) roomUsers.set(department, new Map());
      roomUsers.get(department).set(socket.id, { pseudo: socket.identity.pseudo, genderBucket: socket.identity.genderBucket });
      chat.to(`chat:${department}`).emit('chat:users', usersSnapshot(department));
      chat.emit('chat:counts', countsSnapshot());
    });

    socket.on('chat:leave', leaveCurrentRoom);
    socket.on('disconnect', leaveCurrentRoom);

    socket.on('chat:message', async (content) => {
      if (!currentDept || !socket.identity) return;
      const { type, userId, guestId, pseudo } = socket.identity;
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
          authorName: pseudo,
          content: text,
        },
      });

      chat.to(`chat:${currentDept}`).emit('chat:message', {
        id: message.id,
        authorName: message.authorName,
        content: message.content,
        createdAt: message.createdAt,
        genderBucket: socket.identity.genderBucket,
        isGuest: type === 'guest',
      });
    });
  });
}

module.exports = { initChatSockets };
