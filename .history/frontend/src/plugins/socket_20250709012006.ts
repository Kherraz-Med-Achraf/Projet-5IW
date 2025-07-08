// src/plugins/socket.ts
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { API_BASE_URL } from '@/utils/api';

export let socket: Socket;
export function initSocket(token: string) {
  // Utiliser la même configuration d'URL que pour les appels API REST
  const socketUrl = API_BASE_URL + '/chat';
  
  console.log('[WebSocket] Connexion à:', socketUrl);
  
  socket = io(socketUrl, {
    auth: { token },
    autoConnect: true,
    transports: ['websocket', 'polling'], // Fallback sur polling si WebSocket échoue
    timeout: 20000,
    forceNew: true,
    upgrade: true, // Permettre l'upgrade vers WebSocket
    rememberUpgrade: true, // Se souvenir de l'upgrade pour les reconnexions
  });

  // Gestion des événements de connexion pour debug
  socket.on('connect', () => {
    console.log('[WebSocket] Connexion établie avec le serveur');
  });

  socket.on('connect_error', (error) => {
    console.error('[WebSocket] Erreur de connexion:', error.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('[WebSocket] Déconnexion:', reason);
  });

  return socket;
}
