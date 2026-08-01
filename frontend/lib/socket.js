import { io } from 'socket.io-client';
import { getToken, API_URL } from './api';

let socket = null;

export function getSocket() {
  if (socket) return socket;
  socket = io(API_URL, { auth: { token: getToken() }, autoConnect: true });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
