// src/stores/chatStore.ts
import { defineStore } from 'pinia';
import { ref, reactive } from 'vue';
import { socket, initSocket } from '@/plugins/socket';
import router from '@/router';
import { useAuthStore } from './auth';

/* URL racine de l’API Nest */
const API = import.meta.env.VITE_NEST_API_URL ?? '';

interface Chat {
  id: string;
  participants: any[];
  lastMessage?: string;
  updatedAt?: string;       // ← utilisé pour trier « Recent »
}
interface Contact {
  id: string;
  name: string;
  role: string;
}
export interface ChatMessage {
  authorId: string;
  content : string;
  sentAt  : string;
}

export const useChatStore = defineStore('chat', () => {
  const auth = useAuthStore();

  /* ---------------- state ---------------- */
  const chats     = ref<Chat[]>([]);
  const contacts  = ref<Contact[]>([]);
  const messages  = reactive<Record<string, ChatMessage[]>>({});

  /* --------------- helpers --------------- */
  function authHeaders() {
    return { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' };
  }
  async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, init);
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<T>;
  }

  /* ---------------- actions -------------- */

  /** Charge la liste des chats */
  async function fetchChats() {
    const raw = await fetchJSON<any[]>(`${API}/chats`, { headers: authHeaders() });
    chats.value = raw.map(c => ({
      ...c,
      id: c.id ?? c._id,
      updatedAt: c.updatedAt,
      lastMessage: c.lastMessage,
    }));
  }

  /** Contacts autorisés */
  async function fetchContacts() {
    contacts.value = await fetchJSON<Contact[]>(`${API}/chats/contacts`, {
      headers: authHeaders(),
    });
  }

  /** Historique normalisé */
  async function fetchMessages(chatId: string, limit = 100) {
    const raw = await fetchJSON<any[]>(
      `${API}/chats/${chatId}/messages?limit=${limit}`,
      { headers: authHeaders() },
    );

    messages[chatId] = raw.map(m => ({
      authorId: m.authorId ?? m.author,
      content : m.content,
      sentAt  : m.sentAt,
    }));
  }

  /** Crée ou ré-ouvre une conversation */
  async function createChatWith(userId: string) {
    const existing = chats.value.find(c =>
      c.participants.includes(auth.user.id) && c.participants.includes(userId),
    );
    if (existing) {
      router.push({ name: 'Chat', params: { id: existing.id } });
      return;
    }

    const res = await fetchJSON<{ id?: string; _id?: string }>(`${API}/chats`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ participants: [auth.user.id, userId] }),
    });
    const chatId = res.id ?? res._id;
    if (!chatId) throw new Error('id manquant dans la réponse createChat');

    router.push({ name: 'Chat', params: { id: chatId } });
  }

  /** Rejoint la room socket */
  function join(chatId?: string) {
    if (!chatId) return;
    socket.emit('joinChat', chatId);
    if (!messages[chatId]) messages[chatId] = [];
  }

  /** Envoie un message temps réel */
  function send(chatId: string, content: string) {
    if (!chatId || !content.trim()) return;
    socket.emit('sendMessage', { chatId, content });
  }

  /** Initialisation (socket + data) */
  async function init() {
    /* 1. init WebSocket */
    initSocket(auth.token);

    /* 2. écoute temps réel */
    socket.on('newMessage', (msg: any) => {
      if (!messages[msg.chatId]) messages[msg.chatId] = [];
      messages[msg.chatId].push({
        authorId: msg.authorId,
        content : msg.content,
        sentAt  : msg.sentAt,
      });

      /* ➜ mettre à jour updatedAt + lastMessage pour le tri */
      const chat = chats.value.find(c => c.id === msg.chatId);
      if (chat) {
        chat.updatedAt  = msg.sentAt;
        chat.lastMessage = msg.content;
      }
    });

    /* 3. charge données initiales */
    await Promise.all([fetchChats(), fetchContacts()]);
  }

  /* --------------- expose --------------- */
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
    init,
  };
});
