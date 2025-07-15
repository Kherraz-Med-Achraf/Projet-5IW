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

export function isSocketConnected(): boolean {
  return socket?.connected || false;
}

export function forceReconnect() {
  if (socket) {
    console.log('[WebSocket] Forcing reconnection...');
    socket.disconnect();
    socket.connect();
  }
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
    console.log('[WebSocket] Connected successfully');
    // Rejoindre automatiquement toutes les conversations après reconnexion
    autoRejoinChats();
  });

  socket.on('connect_error', (error) => {
    console.error('[WebSocket] Erreur de connexion:', error.message);
    
    // Si erreur JWT, nettoyer le token et rediriger
    if (error.message.includes('jwt') || error.message.includes('token') || error.message.includes('auth')) {
      console.warn('[WebSocket] Token invalide détecté, nettoyage...');
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      sessionStorage.clear();
      
      // Éviter les reconnexions automatiques avec un token invalide
      socket.disconnect();
      
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('[WebSocket] Disconnected:', reason);
    
    // Ne pas reconnecter automatiquement si :
    // - Déconnexion volontaire du client
    // - Problème d'authentification/sécurité côté serveur
    const shouldNotReconnect = reason === 'io client disconnect' || 
                               reason === 'io server disconnect' ||
                               reason.includes('auth') ||
                               reason.includes('security');
    
    if (!shouldNotReconnect) {
      setTimeout(() => {
        if (!socket.connected) {
          console.log('[WebSocket] Attempting to reconnect...');
          socket.connect();
        }
      }, 2000); // Augmenter le délai pour éviter le spam
    } else {
      console.log('[WebSocket] Reconnection disabled due to:', reason);
    }
  });

  socket.on('auth_error', (data) => {
    console.error('[WebSocket] Erreur d\'authentification:', data.message);
    // Nettoyer le localStorage et rediriger vers la page de connexion
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    sessionStorage.clear();
    
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  });

  return socket;
}
