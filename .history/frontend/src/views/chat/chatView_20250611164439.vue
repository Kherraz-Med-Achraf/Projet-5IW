<template>
    <div class="chat-container">
      <!-- ───────── Barre latérale ───────── -->
      <aside class="sidebar">
        <section class="section recent">
          <h3>Recent</h3>
          <ul>
            <li v-for="c in recentChats"
                :key="c.id"
                :class="{ active: c.id === activeId }"
                @click="openChat(c.id)">
              <span class="avatar" :style="{ background: colorFromId(c.id) }">
                {{ initials(displayName(c)) }}
              </span>
              <span>{{ displayName(c) }}</span>
            </li>
          </ul>
        </section>
      </aside>
  
      <!-- ───────── Contenu principal ───────── -->
      <div class="content">
        <header class="chat-header">
          <span class="avatar-lg"
                :style="{ background: colorFromId(activeId) }">
            {{ initials(headerName) }}
          </span>
          <h2>{{ headerName }}</h2>
        </header>
  
        <!-- Messages -->
        <div class="messages">
          <div v-for="msg in messages"
               :key="msg.id"
               :class="['message', msg.authorId === userId ? 'mine' : 'theirs']">
            <span v-if="msg.authorId !== userId"
                  class="avatar-sm"
                  :style="{ background: colorFromId(activeId) }">
              {{ initials(headerName) }}
            </span>
  
            <div class="bubble">
              <!-- affichage / édition inline -->
              <template v-if="editingId === msg.id">
                <textarea v-model="editDraft"
                          @keydown.enter.prevent="confirmEdit(msg.id)"
                          class="edit-box" />
                <div class="edit-actions">
                  <button @click="confirmEdit(msg.id)">Enregistrer</button>
                  <button @click="cancelEdit">Annuler</button>
                </div>
              </template>
              <template v-else>
                <p>{{ msg.content }}</p>
                <time>{{ formatTime(msg.sentAt) }}
                  <span v-if="msg.editedAt">(édité)</span>
                </time>
              </template>
            </div>
  
            <!-- actions (edit / delete) visibles uniquement pour l'auteur -->
            <div v-if="msg.authorId === userId && editingId !== msg.id"
                 class="actions">
              <button class="icon-btn" @click="startEdit(msg)">✏️</button>
              <button class="icon-btn" @click="askDelete(msg)">🗑️</button>
            </div>
          </div>
        </div>
  
        <!-- Composer -->
        <form class="composer" @submit.prevent="send">
          <input v-model="draft" placeholder="Veuillez écrire un nouveau message" />
          <button type="submit">Envoyer</button>
        </form>
      </div>
  
      <!-- Modal confirmation suppression -->
      <div v-if="deleteId" class="modal-overlay" @click.self="deleteId=null">
        <div class="modal">
          <p>Supprimer ce message&nbsp;?</p>
          <div class="modal-btns">
            <button @click="performDelete">Oui</button>
            <button @click="deleteId=null">Non</button>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, computed, watch, onMounted } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import { useChatStore, ChatMessage } from '@/stores/chatStore';
  import { useAuthStore } from '@/stores/auth';
  import { initials, colorFromId } from '@/utils/avatar';
  
  const route     = useRoute();
  const router    = useRouter();
  const chatStore = useChatStore();
  const auth      = useAuthStore();
  
  const userId   = auth.user.id;
  const activeId = ref(route.params.id as string);
  const draft    = ref('');
  
  /* édition / suppression */
  const editingId = ref<string|null>(null);
  const editDraft = ref('');
  const deleteId  = ref<string|null>(null);
  
  /* chargement initial */
  onMounted(async () => {
    await chatStore.init();
    await chatStore.fetchMessages(activeId.value);
    chatStore.join(activeId.value);
  });
  
  /* changement d’URL */
  watch(() => route.params.id, async (id) => {
    if (typeof id === 'string') {
      activeId.value = id;
      await chatStore.fetchMessages(id);
      chatStore.join(id);
    }
  });
  
  /* données */
  const chats = computed(() => chatStore.chats);
  const recentChats = computed(() =>
    chats.value.slice().sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)),
  );
  const messages = computed<ChatMessage[]>(
    () => chatStore.messages[activeId.value] || [],
  );
  
  /* nom interlocuteur */
  const headerName = computed(() => {
    const chat = chats.value.find(c => c.id === activeId.value);
    if (!chat) return 'Conversation';
    const otherId = chat.participants.find((p: any) => p !== userId);
    const c = chatStore.contacts.find(ct => ct.id === otherId);
    return c?.name || otherId;
  });
  
  /* helper */
  function displayName(chat: any) {
    const otherId = chat.participants.find((p: any) => p !== userId);
    const c = chatStore.contacts.find(ct => ct.id === otherId);
    return c?.name || otherId;
  }
  
  /* navigation */
  function openChat(id?: string) {
    if (id) router.push({ name: 'Chat', params: { id } });
  }
  
  /* envoi */
  function send() {
    if (draft.value.trim()) {
      chatStore.send(activeId.value, draft.value.trim());
      draft.value = '';
    }
  }
  
  /* édition */
  function startEdit(msg: ChatMessage) {
    editingId.value = msg.id;
    editDraft.value = msg.content;
  }
  async function confirmEdit(msgId: string) {
    if (!editDraft.value.trim()) return;
    await chatStore.editMessage(activeId.value, msgId, editDraft.value.trim());
    editingId.value = null;
    editDraft.value = '';
  }
  function cancelEdit() {
    editingId.value = null;
    editDraft.value = '';
  }
  
  /* suppression */
  function askDelete(msg: ChatMessage) {
    deleteId.value = msg.id;
  }
  async function performDelete() {
    if (!deleteId.value) return;
    await chatStore.deleteMessage(activeId.value, deleteId.value);
    deleteId.value = null;
  }
  
  function formatTime(ts: string) {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

/* édition */
.edit-box{width:100%;min-height:48px;border:1px solid #ccc;border-radius:6px;padding:6px}
.edit-actions{display:flex;gap:6px;margin-top:4px}

/* actions icônes */
.actions{display:flex;flex-direction:column;margin-left:4px}
.icon-btn{background:none;border:none;cursor:pointer;font-size:14px}

/* modal suppression */
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center}
.modal{background:#fff;padding:24px;border-radius:6px}
.modal-btns{display:flex;gap:8px;margin-top:12px}

  </style>
  