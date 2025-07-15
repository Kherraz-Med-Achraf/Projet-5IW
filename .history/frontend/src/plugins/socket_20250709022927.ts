// src/plugins/socket.ts
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { API_BASE_URL } from '@/utils/api';

export let socket: Socket;

// Fonction pour rejoindre automatiquement les conversations après reconnexion
let autoRejoinChats: () => void = () => {};

export function setAutoRejoinCallback(callback: () => void) {
  autoRejoinChats = callback;
}

export function initSocket(token: string) {
  // Utiliser la même configuration d'URL que pour les appels API REST
  const socketUrl = API_BASE_URL + '/chat';
  
  socket = io(socketUrl, {
    auth: { token },
    autoConnect: true,
    transports: ['websocket', 'polling'], // Fallback sur polling si WebSocket échoue
    timeout: 20000,
    forceNew: true,
    upgrade: true, // Permettre l'upgrade vers WebSocket
    rememberUpgrade: true, // Se souvenir de l'upgrade pour les reconnexions
  });

  // Gestion des événements de connexion
  socket.on('connect', () => {
    // Rejoindre automatiquement toutes les conversations après reconnexion
    autoRejoinChats();
  });

  socket.on('connect_error', (error) => {
    console.error('[WebSocket] Erreur de connexion:', error.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('[WebSocket] Déconnexion:', reason);
    
    // Tentative de reconnexion automatique sauf si c'est volontaire
    if (reason === 'io server disconnect') {
      console.log('[WebSocket] Déconnexion côté serveur, tentative de reconnexion...');
      setTimeout(() => {
        if (!socket.connected) {
          console.log('[WebSocket] Reconnexion automatique...');
          socket.connect();
        }
      }, 2000);
    }
  });

  socket.on('auth_error', (data) => {
    console.error('[WebSocket] Erreur d\'authentification:', data.message);
    // Nettoyer le localStorage et rediriger vers la page de connexion
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    sessionStorage.clear();
    
    if (window.location.pathname !== '/login') {
      console.log('[WebSocket] Session expirée, redirection vers /login');
      window.location.href = '/login';
    }
  });

  return socket;
}
