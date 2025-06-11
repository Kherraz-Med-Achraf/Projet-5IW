// src/plugins/socket.ts
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';

export let socket: Socket;
export function initSocket(token: string) {
  socket = io(import.meta.env.VITE_NEST_API_URL + '/chat', {
    auth: { token },
    autoConnect: true,
  });
  return socket;
}
