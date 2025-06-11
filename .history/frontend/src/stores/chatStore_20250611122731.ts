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
}
interface Contact {
  id: string;
  name: string;
  role: string;
}
interface ChatMessage {
  authorId: string;
  content: string;
  sentAt: string;
}

export const useChatStore = defineStore('chat', () => {
  const auth = useAuthStore();

  /* --- state -------------------------------------------------------------------- */
  const chats    = ref<Chat[]>([]);
  const contacts = ref<Contact[]>([]);
  const messages = reactive<Record<string, ChatMessage[]>>({});

  /* --- helpers ------------------------------------------------------------------ */
  function authHeaders() {
    return {
      Authorization: `Bearer ${auth.token}`,
      'Content-Type': 'application/json',
    };
  }
  async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, init);
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<T>;
  }

  /* --- actions ------------------------------------------------------------------ */

  /** Charge toutes les conversations de l’utilisateur */
  async function fetchChats() {
    const raw = await fetchJSON<any[]>(`${API}/chats`, {
      headers: authHeaders(),
    });

    /* s’assurer que chaque élément possède un champ id */
    chats.value = raw.map((c) => ({
      ...c,
      id: c.id ?? c._id,           // fallback sur _id (Mongo)
    }));
  }

  /** Charge la liste des contacts autorisés */
  async function fetchContacts() {
    contacts.value = await fetchJSON<Contact[]>(`${API}/chats/contacts`, {
      headers: authHeaders(),
    });
  }

  /** Crée une conversation et navigue vers /chat/:id */
  async function createChatWith(userId: string) {
    const res = await fetchJSON<{ id?: string; _id?: string }>(`${API}/chats`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ participants: [auth.user.id, userId] }),
    });

    const chatId = res.id ?? res._id;
    if (!chatId) throw new Error('id manquant dans la réponse createChat');

    router.push({ name: 'Chat', params: { id: chatId } });
  }

  /** Rejoint une room Socket.IO */
  function join(chatId?: string) {
    if (!chatId) return;
    socket.emit('joinChat', chatId);
    if (!messages[chatId]) messages[chatId] = [];
  }

  /** Envoie un message en temps réel */
  function send(chatId: string, content: string) {
    if (!chatId || !content.trim()) return;
    socket.emit('sendMessage', { chatId, content });
  }

  /** Initialise WS et charge les données */
  async function init() {
    /* 1. init du socket avec le JWT */
    initSocket(auth.token);

    /* 2. écoute des messages entrants */
    socket.on('newMessage', (msg: any) => {
      if (!messages[msg.chatId]) messages[msg.chatId] = [];
      messages[msg.chatId].push({
        authorId: msg.authorId,
        content : msg.content,
        sentAt  : msg.sentAt,
      });
    });

    /* 3. charge chats + contacts */
    await Promise.all([fetchChats(), fetchContacts()]);
  }

  /* --- expose ------------------------------------------------------------------- */
  return {
    chats,
    contacts,
    messages,
    fetchChats,
    fetchContacts,
    createChatWith,
    join,
    send,
    init,
  };
});
