// src/stores/chatStore.ts
import { defineStore } from "pinia";
import { ref, reactive } from "vue";
import { socket, initSocket } from "@/plugins/socket";
import router from "@/router";
import { useAuthStore } from "./auth";
import { secureJsonCall, API_BASE_URL } from "@/utils/api";

/* URL racine de l'API Nest */
const API = import.meta.env.VITE_NEST_API_URL ?? "";

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
      console.log("Chats reçus du backend:", raw);
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
    try {
      contacts.value = await secureJsonCall(`${API}/chats/contacts`);
    } catch (err: any) {
      console.error("Erreur chargement contacts", err);
      const notification = (
        await import("./notificationStore")
      ).useNotificationStore?.();
      notification?.showNotification(
        "Impossible de charger les contacts",
        "error"
      );
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
      }
    }

    socket.emit("sendMessage", { chatId, content: trimmed });
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
    if (initialized.value) return; // déjà fait
    initialized.value = true;
    initSocket(auth.token ?? "");

    // Demander permission pour les notifications
    if (Notification.permission === "default") {
      await Notification.requestPermission();
    }

    socket.on("newMessage", (msg: any) => {
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

      const chat = chats.value.find((c) => c.id === msg.chatId);
      if (chat) {
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
        }
      } else if (!chat && msg.authorId !== auth.user?.id) {
        // Chat pas encore dans la liste locale, rafraîchir
        fetchChats();
      } else {
        // Nouveau chat reçu, rafraîchir la liste
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
      }
    });

    await Promise.all([fetchChats(), fetchContacts()]);

    function joinAllChats() {
      chats.value.forEach((c) => c.id && socket.emit("joinChat", c.id));
    }

    // si socket déjà connecté
    if (socket.connected) {
      joinAllChats();
    } else {
      socket.on("connect", joinAllChats);
    }
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
  };
});
