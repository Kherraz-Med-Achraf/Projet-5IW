import { io } from 'socket.io-client';
import { useAuthStore } from '@/stores/authStore';

export const socket = io(import.meta.env.VITE_NEST_API_URL + '/chat', {
  auth: { token: useAuthStore().token },
  autoConnect: false,   // on connectera manuellement après login
});

export function initSocket() {
  socket.connect();
}
