import { io } from 'socket.io-client';
import { getToken, API_URL } from './api';

const GUEST_ID_KEY = 'sexmo_chat_guest_id';

// Identifiant anonyme stable pour ce navigateur, généré une seule fois —
// permet à la modération de bannir un invité sans qu'il ait de compte.
export function getGuestId() {
  if (typeof window === 'undefined') return null;
  let id = localStorage.getItem(GUEST_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(GUEST_ID_KEY, id);
  }
  return id;
}

let chatSocket = null;

// Connexion unique, sans info invité au départ : suffisant pour observer
// les compteurs par département. Un membre est identifié directement par
// son jeton ; un invité doit ensuite appeler identifyAsGuest().
export function getChatSocket() {
  if (chatSocket) return chatSocket;
  chatSocket = io(`${API_URL}/chat`, {
    auth: { token: getToken() },
    autoConnect: true,
  });
  return chatSocket;
}

export function identifyAsGuest(pseudo, genderBucket) {
  getChatSocket().emit('chat:identify', { guestPseudo: pseudo, guestGender: genderBucket, guestId: getGuestId() });
}

export function disconnectChatSocket() {
  chatSocket?.disconnect();
  chatSocket = null;
}
