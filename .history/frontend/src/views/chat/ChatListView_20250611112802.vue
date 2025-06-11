<template>
    <div class="chat-list">
      <header>
        <h1>Conversations</h1>
        <button @click="showNew = true">Nouvelle discussion</button>
      </header>
  
      <ul>
        <li v-for="c in chats" :key="c.id" @click="open(c.id)">
          <span class="name">{{ otherName(c.participants) }}</span>
          <small class="preview">{{ c.lastMessage }}</small>
        </li>
      </ul>
  
      <modal v-if="showNew" @close="showNew = false">
        <h2>Nouvelle conversation</h2>
        <ul class="contacts">
          <li v-for="u in contacts" :key="u.id">
            {{ u.name }} ({{ u.role }})
            <button @click="start(u.id)">→</button>
          </li>
        </ul>
      </modal>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, onMounted } from 'vue';
  import { useChatStore } from '@/stores/chatStore';
  import { useAuthStore } from '@/stores/auth';
  import { useRouter } from 'vue-router';
  
  const chatStore = useChatStore();
  const auth = useAuthStore();
  const router = useRouter();
  
  const showNew = ref(false);
  
  onMounted(async () => {
    await chatStore.fetchChats();
    await chatStore.fetchContacts();
  });
  
  function open(id: string) {
    router.push({ name: 'Chat', params: { id } });
  }
  
  function start(userId: string) {
    chatStore.createChatWith(userId);
  }
  </script>
  
  <style scoped>
  .chat-list { padding: 16px; }
  header { display: flex; justify-content: space-between; align-items: center; }
  ul { list-style: none; padding: 0; }
  li { padding: 8px; border-bottom: 1px solid #eee; cursor: pointer; }
  .name { font-weight: bold; }
  .preview { display: block; color: #888; font-size: 0.9em; }
  .contacts button { margin-left: 8px; }
  </style>
  