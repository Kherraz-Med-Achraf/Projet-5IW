import { io } from 'socket.io-client';
mport { useAuthStore } from '@/stores/auth'

export const socket = io(import.meta.env.VITE_NEST_API_URL + '/chat', {
  auth: { token: useAuthStore().token },
  autoConnect: false,
});

export function initSocket() {
  socket.connect();
}
