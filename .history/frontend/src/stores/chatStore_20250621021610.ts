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
  updatedAt?: string;
}
interface Contact {
  id: string;
  name: string;
  role: string;
}
export interface ChatMessage {
  id: string;
  authorId: string;
  content : string;
  sentAt  : string;
  editedAt?: string;
}

export const useChatStore = defineStore('chat', () => {
  const auth = useAuthStore();

  /* state */
  const chats    = ref<Chat[]>([]);
  const contacts = ref<Contact[]>([]);
  const messages = reactive<Record<string, ChatMessage[]>>({});

  /* helpers */
  function authHeaders() {
    return { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' };
  }
  async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, init);
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<T>;
  }

  /* actions */

  async function fetchChats() {
    const raw = await fetchJSON<any[]>(`${API}/chats`, { headers: authHeaders() });
    chats.value = raw.map(c => ({
      ...c,
      id: c.id ?? c._id,
      updatedAt: c.updatedAt,
      lastMessage: c.lastMessage,
    }));
  }

  async function fetchContacts() {
    contacts.value = await fetchJSON<Contact[]>(`${API}/chats/contacts`, {
      headers: authHeaders(),
    });
  }

  async function fetchMessages(chatId: string, limit = 100) {
    const raw = await fetchJSON<any[]>(
      `${API}/chats/${chatId}/messages?limit=${limit}`,
      { headers: authHeaders() },
    );
    messages[chatId] = raw
      .map(m => ({
        id: m._id ?? m.id,
        authorId: m.authorId ?? m.author,
        content: m.content,
        sentAt: m.sentAt,
        editedAt: m.editedAt,
      }))
      .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
  }

  async function createChatWith(userId: string) {
    const existing = chats.value.find(c =>
      c.participants.includes(auth.user.id) && c.participants.includes(userId),
    );
    if (existing) {
      router.push({ name: 'Chat', params: { id: existing.id } });
      return;
    }
    try {
      const res = await fetchJSON<{ id?: string; _id?: string }>(`${API}/chats`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ participants: [auth.user.id, userId] }),
      });
      const chatId = res.id ?? res._id;
      if (!chatId) throw new Error('id manquant dans la réponse createChat');
      router.push({ name: 'Chat', params: { id: chatId } });
    } catch (err: any) {
      const notification = (await import('./notificationStore')).useNotificationStore?.();
      notification?.showNotification(err?.message || 'Impossible de créer la conversation', 'error');
      throw err; // rethrow si un composant plus haut veut gérer
    }
  }

  function join(chatId?: string) {
    if (!chatId) return;
    socket.emit('joinChat', chatId);
    if (!messages[chatId]) messages[chatId] = [];
  }

  function send(chatId: string, content: string) {
    if (!chatId || !content.trim()) return;
    socket.emit('sendMessage', { chatId, content });
  }

  function editMessage(chatId: string, msgId: string, content: string) {
    socket.emit('editMessage', { chatId, msgId, content });
  }

  function deleteMessage(chatId: string, msgId: string) {
    socket.emit('deleteMessage', { chatId, msgId });
  }

  async function init() {
    initSocket(auth.token);

    socket.on('newMessage', (msg: any) => {
      if (!messages[msg.chatId]) messages[msg.chatId] = [];
      messages[msg.chatId].push({
        id: msg.msgId ?? '',
        authorId: msg.authorId,
        content: msg.content,
        sentAt: msg.sentAt,
      });
      const chat = chats.value.find(c => c.id === msg.chatId);
      if (chat) {
        chat.updatedAt = msg.sentAt;
        chat.lastMessage = msg.content;
      }
    });

    socket.on('messageUpdated', (m: any) => {
      const arr = messages[m.chatId];
      if (!arr) return;
      const idx = arr.findIndex(x => x.id === m.msgId);
      if (idx !== -1) {
        arr[idx].content  = m.content;
        arr[idx].editedAt = m.editedAt;
      }
    });

    socket.on('messageDeleted', ({ chatId, msgId }: { chatId: string; msgId: string }) => {
      const arr = messages[chatId];
      if (!arr) return;
      messages[chatId] = arr.filter(x => x.id !== msgId);
    });

    await Promise.all([fetchChats(), fetchContacts()]);
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
    init,
  };
});
