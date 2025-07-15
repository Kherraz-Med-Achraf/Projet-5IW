// src/stores/chatStore.ts
import { defineStore } from "pinia";
import { ref, reactive } from "vue";
import { socket, initSocket, setAutoRejoinCallback } from "@/plugins/socket";
import router from "@/router";
import { useAuthStore } from "./auth";
import { secureJsonCall, API_BASE_URL } from "@/utils/api";

/* URL racine de l'API Nest */
const API = API_BASE_URL ?? import.meta.env.VITE_NEST_API_URL ?? '';

interface Chat {
  id: string;
  participants: any[];
  lastMessage?: string;
  updatedAt?: string;
  createdAt?: string;
  unreadCount?: number;
}
interface Contact {
  id: string;
  name: string;
  role: string;
}
export interface ChatMessage {
  id: string;
  authorId: string;
  content: string;
  sentAt: string;
  editedAt?: string;
}

export const useChatStore = defineStore("chat", () => {
  const auth = useAuthStore();

  /* state */
  const chats = ref<Chat[]>([]);
  const contacts = ref<Contact[]>([]);
  const messages = reactive<Record<string, ChatMessage[]>>({});

  /* évite les doubles initialisations */
  const initialized = ref(false);
  const fetchingContacts = ref(false);

  /* helpers */
  function authHeaders() {
    return {
      Authorization: `Bearer ${auth.token}`,
      "Content-Type": "application/json",
    };
  }

  /* actions */

  async function fetchChats() {
    try {
      const raw = await secureJsonCall(`${API}/chats`);
      chats.value = raw.map((c: any) => ({
        ...c,
        id: c.id ?? c._id,
        updatedAt: c.updatedAt,
        lastMessage: c.lastMessage,
        createdAt: c.createdAt,
        unreadCount: c.unreadCount ?? 0,
      }));
    } catch (error) {
      console.error("Erreur fetchChats:", error);
    }
  }

  async function fetchContacts() {
    // Empêcher les appels multiples simultanés
    if (fetchingContacts.value) {
      return;
    }
    
    try {
      fetchingContacts.value = true;
      const rawContacts = await secureJsonCall(`${API}/chats/contacts`) as Contact[];
      
      // Déduplication côté client en plus du backend par sécurité
      const uniqueContacts = Array.from(
        new Map(rawContacts.map((c: Contact) => [c.id, c])).values()
      );
      
      contacts.value = uniqueContacts;
    } catch (err: any) {
      console.error("Erreur chargement contacts", err);
      const notification = (
        await import("./notificationStore")
      ).useNotificationStore?.();
      notification?.showNotification(
        "Impossible de charger les contacts",
        "error"
      );
    } finally {
      fetchingContacts.value = false;
    }
  }

  async function fetchMessages(chatId: string, limit = 100) {
    try {
      const raw = await secureJsonCall(
        `${API}/chats/${chatId}/messages?limit=${limit}`
      );
      messages[chatId] = raw
        .map((m: any) => ({
          id: m._id ?? m.id,
          authorId: m.authorId ?? m.author,
          content: m.content,
          sentAt: m.sentAt,
          editedAt: m.editedAt,
        }))
        .sort(
          (a: ChatMessage, b: ChatMessage) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
        );
    } catch (error) {
      console.error("Erreur fetchMessages:", error);
    }
  }

  async function createChatWith(userId: string) {
    const myId = auth.user?.id ?? "";
    const existing = chats.value.find(
      (c) => c.participants.includes(myId) && c.participants.includes(userId)
    );
    if (existing) {
      router.push({ name: "Chat", params: { id: existing.id } });
      return;
    }
    try {
      const res = await secureJsonCall(`${API}/chats`, {
        method: "POST",
        body: JSON.stringify({ participants: [myId, userId] }),
      });
      const chatId = res.id ?? res._id;
      if (!chatId) throw new Error("id manquant dans la réponse createChat");

      // Rafraîchir la liste des chats après création
      await fetchChats();

      // rejoindre la nouvelle conversation pour recevoir les messages
      socket.emit("joinChat", chatId);

      router.push({ name: "Chat", params: { id: chatId } });
    } catch (err: any) {
      const notification = (
        await import("./notificationStore")
      ).useNotificationStore?.();
      notification?.showNotification(
        err?.message || "Impossible de créer la conversation",
        "error"
      );
      throw err; // rethrow si un composant plus haut veut gérer
    }
  }

  function join(chatId?: string) {
    if (!chatId) return;
    socket.emit("joinChat", chatId);
    if (!messages[chatId]) messages[chatId] = [];
  }

  function send(chatId: string, content: string) {
    if (!chatId || !content.trim()) return;

    // Optimistic UI: ajoute localement le message
    const trimmed = content.trim();
    const tempId = `tmp_${Date.now()}`;
    const nowIso = new Date().toISOString();
    
    if (!messages[chatId]) messages[chatId] = [];
    messages[chatId].push({
      id: tempId,
      authorId: auth.user?.id || "",
      content: trimmed,
      sentAt: nowIso,
    });

    // Met à jour le résumé de la conversation
    const chat = chats.value.find((c) => c.id === chatId);
    if (chat) {
      chat.lastMessage = trimmed;
      chat.updatedAt = nowIso;

      // Remonte la conversation en tête
      const idx = chats.value.findIndex((c) => c.id === chatId);
      if (idx > 0) {
        const [mv] = chats.value.splice(idx, 1);
        chats.value.unshift(mv);
      } else if (idx === 0) {
        // Forcer la réactivité Vue
        chats.value = [...chats.value];
      }
    }

    socket.emit("sendMessage", { chatId, content: trimmed });
    
    // Fallback si le message temporaire n'est pas confirmé
    setTimeout(() => {
      const msgList = messages[chatId];
      if (msgList) {
        const idx = msgList.findIndex((m) => m.id === tempId);
        if (idx !== -1) {
          // Vérifier si WebSocket est déconnecté
          if (!socket?.connected) {
            socket?.connect();
          }
          // En cas d'échec WebSocket, rafraîchir les messages depuis l'API
          fetchMessages(chatId);
          fetchChats(); // Rafraîchir aussi la liste des conversations
        }
      }
    }, 8000); // 8 secondes pour laisser plus de temps
  }

  function editMessage(chatId: string, msgId: string, content: string) {
    socket.emit("editMessage", { chatId, msgId, content });
  }

  function deleteMessage(chatId: string, msgId: string) {
    socket.emit("deleteMessage", { chatId, msgId });
  }

  async function markAsRead(chatId: string) {
    const chat = chats.value.find((c) => c.id === chatId);
    if (!chat) return;

    // Réinitialise localement
    chat.unreadCount = 0;

    // Signale au backend pour persistance avec CSRF
    try {
      await secureJsonCall(`${API}/chats/${chatId}/read`, {
        method: "PATCH",
      });
    } catch (err) {
      console.error("Erreur markAsRead", err);
    }
  }

  async function init() {
    if (initialized.value) {
      return;
    }
    
    // Vérifier si l'utilisateur est connecté avant de faire les appels API
    if (!auth.token || !auth.user?.id) {
      return;
    }
    
    // Vérifier la validité du token en faisant un appel test
    try {
      await secureJsonCall(`${API}/auth/profile`);
    } catch (error) {
      console.error("[ChatStore] Token invalide, nettoyage et arrêt:", error);
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      auth.logout();
      return;
    }
    
    console.log("[ChatStore] Initialisation...");
    initialized.value = true;
    
    // Réinitialiser l'état
    chats.value = [];
    contacts.value = [];
    Object.keys(messages).forEach(key => delete messages[key]);
    
    initSocket(auth.token ?? "");
    
    // Configurer la rejointure automatique après reconnexion
    setAutoRejoinCallback(() => {
      if (chats.value.length > 0) {
        chats.value.forEach((c) => {
          if (c.id) {
            socket.emit("joinChat", c.id);
          }
        });
      }
    });

    // Demander permission pour les notifications
    if (Notification.permission === "default") {
      await Notification.requestPermission();
    }

    socket.on("newMessage", (msg: any) => {
      console.log("[ChatStore] Nouveau message reçu via WebSocket:", msg);
      if (!messages[msg.chatId]) messages[msg.chatId] = [];

      // Chercher un message temporaire à remplacer
      const tempIdx = messages[msg.chatId].findIndex(
        (m) =>
          m.id.startsWith("tmp_") &&
          m.authorId === msg.authorId &&
          m.content === msg.content
      );

      if (tempIdx !== -1) {
        // Remplacer le message temporaire par le vrai
        messages[msg.chatId][tempIdx] = {
          id: msg.msgId ?? "",
          authorId: msg.authorId,
          content: msg.content,
          sentAt: msg.sentAt,
        };
      } else {
        // Nouveau message reçu (pas de notre part)
        const already = messages[msg.chatId].some(
          (m) => m.id === (msg.msgId ?? "")
        );
        if (!already) {
          messages[msg.chatId].push({
            id: msg.msgId ?? "",
            authorId: msg.authorId,
            content: msg.content,
            sentAt: msg.sentAt,
          });

          // Notification pour les messages reçus (pas envoyés par nous)
          if (msg.authorId !== auth.user?.id) {
            const contact = contacts.value.find((c) => c.id === msg.authorId);
            const senderName = contact?.name || "Quelqu'un";

            // Notification native du navigateur
            if (Notification.permission === "granted") {
              new Notification(`Nouveau message de ${senderName}`, {
                body: msg.content,
                icon: "/favicon.ico",
              });
            }
          }
        }
      }

      // Mettre à jour la conversation dans la liste
      const chat = chats.value.find((c) => c.id === msg.chatId);
      if (chat) {
        console.log("[ChatStore] Mise à jour conversation existante:", chat.id);
        chat.updatedAt = msg.sentAt;
        chat.lastMessage = msg.content;

        // Incrémenter le compteur de non lus si ce n'est pas notre message
        if (msg.authorId !== auth.user?.id) {
          chat.unreadCount = (chat.unreadCount || 0) + 1;
        }

        // Réorganiser la liste (mettre le chat en premier)
        const index = chats.value.findIndex((c) => c.id === msg.chatId);
        if (index > 0) {
          const [movedChat] = chats.value.splice(index, 1);
          chats.value.unshift(movedChat);
        } else if (index === 0) {
          // Forcer la réactivité Vue
          chats.value = [...chats.value];
        }
      } else {
        console.log("[ChatStore] Conversation non trouvée dans la liste, rafraîchissement...");
        // Chat pas encore dans la liste locale, rafraîchir
        fetchChats();
      }
    });

    socket.on("messageUpdated", (m: any) => {
      const arr = messages[m.chatId];
      if (!arr) return;
      const idx = arr.findIndex((x) => x.id === m.msgId);
      if (idx !== -1) {
        arr[idx].content = m.content;
        arr[idx].editedAt = m.editedAt;

        // Mettre à jour le lastMessage si c'est le dernier message
        const chat = chats.value.find((c) => c.id === m.chatId);
        if (chat && arr[idx] === arr[arr.length - 1]) {
          chat.lastMessage = m.content;
        }
      }
    });

    socket.on(
      "messageDeleted",
      ({ chatId, msgId }: { chatId: string; msgId: string }) => {
        const arr = messages[chatId];
        if (!arr) return;
        messages[chatId] = arr.filter((x) => x.id !== msgId);

        // Mettre à jour le lastMessage après suppression
        const chat = chats.value.find((c) => c.id === chatId);
        if (chat) {
          const remainingMessages = messages[chatId];
          if (remainingMessages.length > 0) {
            chat.lastMessage =
              remainingMessages[remainingMessages.length - 1].content;
          } else {
            chat.lastMessage = undefined;
          }
        }
      }
    );

    // Nouveau chat créé (par un autre utilisateur)
    socket.on("newChat", (c: any) => {
      // éviter doublon
      if (!chats.value.find((x) => x.id === (c.id ?? c._id))) {
        chats.value.unshift({
          id: c.id ?? c._id,
          participants: c.participants,
          updatedAt: c.updatedAt,
          createdAt: c.createdAt,
          lastMessage: c.lastMessage,
          unreadCount: 0,
        });
        // rejoindre la room
        socket.emit("joinChat", c.id ?? c._id);
      }
    });

    // Mise à jour d'un chat existant (nouveau message dans une room non rejointe)
    socket.on("chatUpdated", (u: any) => {
      console.log("[ChatStore] Notification chatUpdated reçue pour chat:", u.chatId);
      const chat = chats.value.find((ch) => ch.id === u.chatId);
      if (chat) {
        chat.lastMessage = u.lastMessage;
        chat.updatedAt = u.sentAt;
        if (u.authorId !== auth.user?.id) {
          chat.unreadCount = (chat.unreadCount || 0) + 1;
        }

        // Remonter en haut
        const idx = chats.value.findIndex((ch) => ch.id === u.chatId);
        if (idx > 0) {
          const [mv] = chats.value.splice(idx, 1);
          chats.value.unshift(mv);
        }
      } else {
        console.log("[ChatStore] Chat non trouvé pour chatUpdated:", u.chatId);
      }
    });

    await Promise.all([fetchChats(), fetchContacts()]);

    function joinAllChats() {
      console.log(`[ChatStore] Jointure automatique de ${chats.value.length} conversations`);
      chats.value.forEach((c) => {
        if (c.id) {
          socket.emit("joinChat", c.id);
        }
      });
    }

    // si socket déjà connecté
    if (socket.connected) {
      joinAllChats();
    } else {
      socket.on("connect", joinAllChats);
    }
  }

  function reset() {
    console.log("[ChatStore] Reset du store");
    initialized.value = false;
    fetchingContacts.value = false;
    chats.value = [];
    contacts.value = [];
    Object.keys(messages).forEach(key => delete messages[key]);
  }

  function forceReconnect() {
    console.log("[ChatStore] Forcer la reconnexion WebSocket");
    if (socket) {
      socket.disconnect();
      socket.connect();
    }
  }

  // Fallback pour s'assurer que les conversations sont à jour
  function refreshConversations() {
    console.log("[ChatStore] Rafraîchissement manuel des conversations");
    return fetchChats();
  }

  // Vérifier l'état de la connexion WebSocket
  function getSocketStatus() {
    return {
      connected: socket?.connected || false,
      id: socket?.id || null,
      transport: socket?.io?.engine?.transport?.name || null,
    };
  }

  return {
    chats,
    contacts,
    messages,
    fetchChats,
    fetchContacts,
    fetchMessages,
    createChatWith,
    join,
    send,
    editMessage,
    deleteMessage,
    markAsRead,
    init,
    reset,
    forceReconnect,
    refreshConversations,
    getSocketStatus,
  };
});
