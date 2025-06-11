// src/stores/chatStore.ts
import { defineStore } from 'pinia';
import { ref, reactive } from 'vue';
import { socket, initSocket } from '@/plugins/socket';
import axios from 'axios';
import router from '@/router';
import { useAuthStore } from './auth'

export const useChatStore = defineStore('chat', () => {
  const auth = useAuthStore();

  // liste des conversations existantes
  const chats = ref<Array<{ id: string; participants: any[]; lastMessage?: string }>>([]);
  // liste des contacts autorisés pour démarrer une nouvelle conversation
  const contacts = ref<Array<{ id: string; name: string; role: string }>>([]);
  // messages par conversation
  const messages = reactive<Record<string, Array<{ authorId: string; content: string; sentAt: string }>>>({});

  /** Charge toutes les conversations de l'utilisateur */
  async function fetchChats() {
    const res = await axios.get('/chats', {
      headers: { Authorization: `Bearer ${auth.token}` }
    });
    chats.value = res.data;
  }

  /** Charge la liste des contacts autorisés selon la matrice */
  async function fetchContacts() {
    const res = await axios.get('/chats/contacts', {
      headers: { Authorization: `Bearer ${auth.token}` }
    });
    contacts.value = res.data;
  }

  /** Crée une conversation avec un autre utilisateur et navigue vers elle */
  async function createChatWith(userId: string) {
    const res = await axios.post('/chats', {
      participants: [auth.user.id, userId]
    }, {
      headers: { Authorization: `Bearer ${auth.token}` }
    });
    const chatId = res.data.id || res.data._id;
    router.push({ name: 'Chat', params: { id: chatId } });
  }

  /** Rejoint une room Socket.IO et initialise le tableau messages si nécessaire */
  function join(chatId: string) {
    socket.emit('joinChat', chatId);
    if (!messages[chatId]) {
      messages[chatId] = [];
    }
  }

  /** Envoie un message sur Socket.IO */
  function send(chatId: string, content: string) {
    socket.emit('sendMessage', { chatId, content });
  }

  // Réception en temps réel des nouveaux messages
  socket.on('newMessage', (msg: any) => {
    if (!messages[msg.chatId]) {
      messages[msg.chatId] = [];
    }
    messages[msg.chatId].push({
      authorId: msg.authorId,
      content: msg.content,
      sentAt: msg.sentAt,
    });
  });

  /** Initialise Socket & charge les données de base */
  async function init() {
    initSocket();
    await fetchChats();
    await fetchContacts();
  }

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
