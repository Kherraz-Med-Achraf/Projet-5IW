<template>
    <div class="chat-container">
      <aside class="sidebar">
        <section class="section pinned">
          <h3>Pinned</h3>
          <ul>
            <li v-for="c in pinnedChats" :key="c.id"
                :class="{ active: c.id === chatId }"
                @click="openChat(c.id)">
              <img :src="c.avatar" class="avatar" /><span>{{ c.name }}</span>
            </li>
          </ul>
        </section>
        <section class="section recent">
          <h3>Recent</h3>
          <ul>
            <li v-for="c in recentChats" :key="c.id"
                :class="{ active: c.id === chatId }"
                @click="openChat(c.id)">
              <img :src="c.avatar" class="avatar" /><span>{{ c.name }}</span>
              <small class="preview">{{ c.lastMessage }}</small>
            </li>
          </ul>
        </section>
      </aside>
  
      <div class="content">
        <header class="chat-header">
          <img :src="currentChat.avatar" class="avatar-lg" />
          <h2>{{ currentChat.name }}</h2>
          <!-- boutons appels, fichiers, ... -->
        </header>
  
        <div class="messages">
          <div v-for="msg in messages" :key="msg.sentAt"
               :class="['message', msg.authorId === userId ? 'mine' : 'theirs']">
            <img v-if="msg.authorId !== userId" :src="currentChat.avatar" class="avatar-sm" />
            <div class="bubble">
              <p>{{ msg.content }}</p>
              <time>{{ formatTime(msg.sentAt) }}</time>
            </div>
          </div>
        </div>
  
        <form class="composer" @submit.prevent="send">
          <input v-model="draft" placeholder="Type a new message" />
          <button type="submit">Send</button>
        </form>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { onMounted, computed, ref } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import { useChatStore } from '@/stores/chatStore';
  import { useAuthStore } from '@/stores/auth'

  
  const route = useRoute();
  const router = useRouter();
  const chatStore = useChatStore();
  const auth = useAuthStore();
  
  const chatId = route.params.id as string;
  const userId = auth.user.id;
  
  const draft = ref('');
  
  // charger les conversations et rejoindre
  onMounted(async () => {
    await chatStore.init();
    chatStore.join(chatId);
  });
  
  // données calculées
  const chats       = computed(() => chatStore.chats);
  const messages    = computed(() => chatStore.messages[chatId] || []);
  const currentChat = computed(() => chats.value.find(c => c.id === chatId) || { name: '', avatar: '' });
  const pinnedChats = computed(() => chats.value.filter(c => c.pinned));
  const recentChats = computed(() => chats.value.filter(c => !c.pinned));
  
  // méthodes
  function openChat(id: string) {
    router.push({ name: 'Chat', params: { id } });
  }
  
  function send() {
    if (draft.value.trim()) {
      chatStore.send(chatId, draft.value);
      draft.value = '';
    }
  }
  
  function formatTime(ts: string) {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  </script>
  
  <style scoped>
  .chat-container {
    display: flex; height: 100vh;
  }
  
  .sidebar {
    width: 260px;
    background: #f3f2f1; /* gris clair */
    border-right: 1px solid #ddd;
    overflow-y: auto;
  }
  .section {
    padding: 16px;
  }
  .section h3 {
    margin-bottom: 8px;
    font-size: 0.9rem; color: #666;
  }
  .section ul {
    list-style: none; padding: 0; margin: 0;
  }
  .section li {
    display: flex; align-items: center;
    padding: 8px; border-radius: 4px;
    cursor: pointer; margin-bottom: 4px;
  }
  .section li.active,
  .section li:hover {
    background: #e1dfdd;
  }
  .avatar {
    width: 32px; height: 32px; border-radius: 50%;
    margin-right: 8px;
  }
  .preview {
    font-size: 0.75rem; color: #888; margin-left: auto;
  }
  
  .content {
    flex: 1; display: flex; flex-direction: column;
  }
  .chat-header {
    display: flex; align-items: center;
    padding: 16px; border-bottom: 1px solid #ddd;
  }
  .avatar-lg {
    width: 40px; height: 40px; border-radius: 50%;
    margin-right: 12px;
  }
  .messages {
    flex: 1; padding: 16px;
    overflow-y: auto; background: #fff;
  }
  .message {
    display: flex; margin-bottom: 12px;
  }
  .message.mine {
    justify-content: flex-end;
  }
  .message.theirs {
    justify-content: flex-start;
  }
  .avatar-sm {
    width: 24px; height: 24px; border-radius: 50%;
    margin-right: 8px;
  }
  .bubble {
    max-width: 60%;
    padding: 10px 14px;
    border-radius: 8px;
    background: var(--bubble-bg);
    position: relative;
  }
  .message.mine .bubble {
    background: #605e5c; /* violet Teams */
    color: #fff;
  }
  .message.theirs .bubble {
    background: #f3f2f1;
    color: #000;
  }
  .bubble time {
    display: block;
    font-size: 0.6rem;
    color: rgba(0,0,0,0.45);
    margin-top: 4px;
    text-align: right;
  }
  
  .composer {
    display: flex; padding: 12px; border-top: 1px solid #ddd;
  }
  .composer input {
    flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 4px;
  }
  .composer button {
    margin-left: 8px; padding: 8px 16px; border: none; border-radius: 4px;
    background: #6264a7; color: #fff;
  }
  .avatar, .avatar-sm, .avatar-lg {
  display:inline-flex; align-items:center; justify-content:center;
  color:#fff; font-weight:600; border-radius:50%;
}
.avatar     { width:32px; height:32px; font-size:.9rem; margin-right:8px; }
.avatar-sm  { width:24px; height:24px; font-size:.7rem; margin-right:8px; }
.avatar-lg  { width:40px; height:40px; font-size:1rem; margin-right:12px; }
  </style>
  