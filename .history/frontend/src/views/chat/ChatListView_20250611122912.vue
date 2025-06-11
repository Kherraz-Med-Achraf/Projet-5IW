<template>
    <div class="chat-list-view">
      <header class="header">
        <h1>Conversations</h1>
        <button class="btn-new" @click="showNew = true">Nouvelle discussion</button>
      </header>
  
      <ul class="chat-list">
        <li
          v-for="chat in chats"
          :key="chat.id"
          class="chat-item"
          @click="openChat(chat.id)"
        >
          <span class="chat-name">{{ otherNames(chat.participants) }}</span>
          <small class="chat-preview">{{ chat.lastMessage || '' }}</small>
        </li>
      </ul>
  
      <!-- Modal Nouvelle discussion -->
      <div v-if="showNew" class="modal-overlay" @click.self="closeNew">
        <div class="modal">
          <h2>Nouvelle conversation</h2>
          <ul class="contacts">
            <li v-for="c in contacts" :key="c.id" class="contact-item">
              <span>{{ c.name }} <em>({{ c.role }})</em></span>
              <button class="btn-start" @click="startChat(c.id)">→</button>
            </li>
          </ul>
          <button class="btn-close" @click="closeNew">Fermer</button>
        </div>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, computed, onMounted } from 'vue';
  import { useRouter } from 'vue-router';
  import { useChatStore } from '@/stores/chatStore';
  import { useAuthStore } from '@/stores/auth';
  
  const chatStore = useChatStore();
  const authStore = useAuthStore();
  const router    = useRouter();
  
  const showNew = ref(false);
  
  /* charge toutes les données au montage */
  onMounted(async () => {
    await chatStore.init();        // <-- suffit si tu préfères
    // sinon tu peux garder les appels séparés :
    // await chatStore.fetchChats();
    // await chatStore.fetchContacts();
  });
  
  const chats    = computed(() => chatStore.chats);
  const contacts = computed(() => chatStore.contacts);
  
  /* ouvre un chat existant */
  function openChat(chatId?: string) {
    if (!chatId) return;           // garde-fou
    router.push({ name: 'Chat', params: { id: chatId } });
  }
  
  /* crée une nouvelle conversation puis ferme le modal */
  async function startChat(userId: string) {
    await chatStore.createChatWith(userId);
    showNew.value = false;
  }
  
  /* ferme le modal */
  function closeNew() {
    showNew.value = false;
  }
  
  /* affiche les noms (ou emails) des autres participants */
  function otherNames(participants: any[]) {
    return participants
      .filter((p: any) => p !== authStore.user.id)
      .map((p: any) => {
        const c = chatStore.contacts.find(c => c.id === p);
        return c?.name ?? p;
      })
      .join(', ');
  }
  </script>
  
  <style scoped>
  .chat-list-view { padding: 16px; }
  .header {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 16px;
  }
  .btn-new {
    padding: 6px 12px; border: 1px solid #666; background: #fff; cursor: pointer;
  }
  .chat-list { list-style: none; padding: 0; margin: 0; }
  .chat-item { padding: 12px; border-bottom: 1px solid #eee; cursor: pointer; }
  .chat-item:hover { background: #f9f9f9; }
  .chat-name { font-weight: bold; }
  .chat-preview { display: block; color: #888; font-size: .85em; }
  
  /* Modal */
  .modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,.4);
    display: flex; align-items: center; justify-content: center;
  }
  .modal {
    background: #fff; padding: 24px; border-radius: 4px;
    width: 300px; max-height: 80%; overflow-y: auto;
  }
  .contacts { list-style: none; padding: 0; margin: 16px 0; }
  .contact-item {
    display: flex; justify-content: space-between; margin-bottom: 8px;
  }
  .btn-start {
    background: #6264a7; color: #fff; border: none;
    padding: 4px 8px; cursor: pointer;
  }
  .btn-close {
    background: none; border: none; color: #666; cursor: pointer;
    margin-top: 12px; text-decoration: underline;
  }
  </style>
  