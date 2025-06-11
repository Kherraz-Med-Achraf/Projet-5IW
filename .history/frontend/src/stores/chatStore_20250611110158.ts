import { defineStore } from 'pinia';
import { ref, reactive } from 'vue';
import { socket, initSocket } from '@/plugins/socket';
import axios from 'axios';
import { useAuthStore } from './authStore';

export const useChatStore = defineStore('chat', () => {
  const auth = useAuthStore();
  const chats = ref<{ id: string; participants: any[] }[]>([]);
  const messages = reactive<Record<string, { authorId: string; content: string; sentAt: string }[]>>({});

  async function fetchChats() {
    const res = await axios.get('/chats', { headers: { Authorization: `Bearer ${auth.token}` } });
    chats.value = res.data;
  }

  function join(chatId: string) {
    socket.emit('joinChat', chatId);
    if (!messages[chatId]) messages[chatId] = [];
  }

  function send(chatId: string, content: string) {
    socket.emit('sendMessage', { chatId, content });
  }

  socket.on('newMessage', (msg: any) => {
    if (!messages[msg.chatId]) messages[msg.chatId] = [];
    messages[msg.chatId].push({ authorId: msg.authorId, content: msg.content, sentAt: msg.sentAt });
  });

  function init() {
    initSocket();
    fetchChats();
  }

  return { chats, messages, fetchChats, join, send, init };
});
