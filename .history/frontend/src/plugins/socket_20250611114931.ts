// src/plugins/socket.ts
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';

export let socket: Socket;

/**
 * Initialise le socket avec le token JWT passé en argument.
 * Ne fait PAS appel à Pinia ou à un store à l’import.
 */
export function initSocket(token: string) {
  socket = io(import.meta.env.VITE_NEST_API_URL + '/chat', {
    auth: { token },
    autoConnect: true,
  });
  return socket;
}
