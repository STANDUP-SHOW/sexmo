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
//
// Discussions privées ("bulles") : cliquer sur un connecté du salon ouvre
// un fil à deux, en mémoire uniquement (pas d'historique) — jusqu'à 25 par
// personne, fermé automatiquement si le destinataire ne répond pas dans la
// minute qui suit l'ouverture.
const { verifyToken } = require('../utils/jwt');
const prisma = require('../config/prisma');
const DEPARTMENTS = require('../data/departments');

const DEPARTMENT_CODES = new Set(DEPARTMENTS.map((d) => d.code));
const MAX_MESSAGE_LENGTH = 500;
const GENDER_BUCKETS = ['HOMME', 'FEMME', 'TRANS', 'AUTRE'];
const MAX_PRIVATE_THREADS = 25;
const PRIVATE_REPLY_TIMEOUT_MS = 60 * 1000;

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
const roomUsers = new Map(); // department -> Map<socketId, identity-lite>
// Fils privés en mémoire : threadId ("idA:idB" trié) -> état du fil.
const privateThreads = new Map();

function countsSnapshot() {
  const counts = {};
  for (const [dept, users] of roomUsers) counts[dept] = users.size;
  return counts;
}

function usersSnapshot(department) {
  const users = roomUsers.get(department);
  if (!users) return [];
  return [...users.entries()]
    .map(([socketId, u]) => ({ socketId, ...u }))
    .sort((a, b) => GENDER_BUCKETS.indexOf(a.genderBucket) - GENDER_BUCKETS.indexOf(b.genderBucket));
}

function peerInfo(identity) {
  return {
    pseudo: identity.pseudo,
    genderBucket: identity.genderBucket,
    isMember: identity.type === 'member',
    experienceLevel: identity.experienceLevel || null,
  };
}

function threadIdFor(a, b) {
  return [a, b].sort().join(':');
}

function countThreadsFor(socketId) {
  let n = 0;
  for (const t of privateThreads.values()) if (t.sockets.includes(socketId)) n++;
  return n;
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
          socket.identity = {
            type: 'member',
            userId: user.id,
            pseudo: user.profile.pseudo,
            genderBucket: genderBucket(user.profile.gender),
            experienceLevel: user.profile.experienceLevel,
          };
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
      socket.identity = { type: 'guest', guestId: parsed.id, pseudo: parsed.pseudo, genderBucket: parsed.gender, experienceLevel: null };
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
      roomUsers.get(department).set(socket.id, {
        pseudo: socket.identity.pseudo,
        genderBucket: socket.identity.genderBucket,
        isMember: socket.identity.type === 'member',
        experienceLevel: socket.identity.experienceLevel,
      });
      chat.to(`chat:${department}`).emit('chat:users', usersSnapshot(department));
      chat.emit('chat:counts', countsSnapshot());
    });

    socket.on('chat:leave', leaveCurrentRoom);

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

    // --- Discussions privées ---

    function closeThread(threadId, { silent } = {}) {
      const thread = privateThreads.get(threadId);
      if (!thread) return;
      clearTimeout(thread.timer);
      privateThreads.delete(threadId);
      if (!silent) {
        for (const sid of thread.sockets) {
          chat.to(sid).emit('chat:privateClosed', { threadId });
        }
      }
    }

    socket.on('chat:privateOpen', (targetSocketId) => {
      if (!socket.identity || !targetSocketId || targetSocketId === socket.id) return;
      const target = chat.sockets.get(targetSocketId);
      if (!target || !target.identity) return;

      const threadId = threadIdFor(socket.id, targetSocketId);
      if (privateThreads.has(threadId)) {
        socket.emit('chat:privateOpened', { threadId, peer: peerInfo(target.identity) });
        return;
      }
      if (countThreadsFor(socket.id) >= MAX_PRIVATE_THREADS) {
        socket.emit('chat:privateLimitReached');
        return;
      }

      const timer = setTimeout(() => closeThread(threadId), PRIVATE_REPLY_TIMEOUT_MS);
      privateThreads.set(threadId, { sockets: [socket.id, targetSocketId], openedBy: socket.id, answered: false, timer });

      socket.emit('chat:privateOpened', { threadId, peer: peerInfo(target.identity) });
      chat.to(targetSocketId).emit('chat:privateOpened', { threadId, peer: peerInfo(socket.identity) });
    });

    socket.on('chat:privateMessage', async ({ threadId, content, photoUrl } = {}) => {
      const thread = privateThreads.get(threadId);
      if (!thread || !thread.sockets.includes(socket.id) || !socket.identity) return;
      const text = String(content || '').trim().slice(0, MAX_MESSAGE_LENGTH);
      // Photo réservée aux discussions privées (jamais aux salons publics —
      // voir chat:message plus haut, qui n'accepte pas photoUrl) : on ne
      // vérifie ici que le format (chemin relatif vers notre propre route de
      // service), pas l'appartenance du fichier à ce fil (non persisté).
      const photo = typeof photoUrl === 'string' && photoUrl.startsWith('/media/chat-photos/') ? photoUrl : null;
      if (!text && !photo) return;
      const { type, userId, guestId } = socket.identity;
      if (await isBanned({ userId, guestId })) {
        socket.emit('chat:banned');
        socket.disconnect(true);
        return;
      }

      // Le destinataire a répondu : le fil ne se ferme plus automatiquement.
      if (socket.id !== thread.openedBy && !thread.answered) {
        thread.answered = true;
        clearTimeout(thread.timer);
      }

      const payload = { threadId, content: text, photoUrl: photo, createdAt: new Date(), from: peerInfo(socket.identity) };
      for (const sid of thread.sockets) chat.to(sid).emit('chat:privateMessage', payload);
    });

    socket.on('chat:privateClose', ({ threadId } = {}) => closeThread(threadId));

    socket.on('disconnect', () => {
      leaveCurrentRoom();
      for (const [threadId, thread] of privateThreads) {
        if (thread.sockets.includes(socket.id)) closeThread(threadId);
      }
    });
  });
}

module.exports = { initChatSockets };
