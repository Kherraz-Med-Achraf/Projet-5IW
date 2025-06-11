<template>
  <div class="chat-container">
    <aside class="sidebar">
      <section v-if="pinnedChats.length" class="section pinned">
        <h3>Pinned</h3>
        <ul>
          <li
            v-for="c in pinnedChats"
            :key="c.id"
            :class="{ active: c.id === activeId }"
            @click="openChat(c.id)"
          >
            <span class="avatar"
                  :style="{ background: colorFromId(c.id) }">
              {{ initials(c.name) }}
            </span>
            <span>{{ c.name }}</span>
          </li>
        </ul>
      </section>

      <section class="section recent">
        <h3>Recent</h3>
        <ul>
          <li
            v-for="c in recentChats"
            :key="c.id"
            :class="{ active: c.id === activeId }"
            @click="openChat(c.id)"
          >
            <span class="avatar"
                  :style="{ background: colorFromId(c.id) }">
              {{ initials(c.name) }}
            </span>
            <span>{{ c.name }}</span>
            <small class="preview">{{ c.lastMessage || '' }}</small>
          </li>
        </ul>
      </section>
    </aside>

    <div class="content">
      <header class="chat-header">
        <span class="avatar-lg"
              :style="{ background: colorFromId(currentChat.id || activeId) }">
          {{ initials(currentChat.name || '') }}
        </span>
        <h2>{{ currentChat.name || 'Conversation' }}</h2>
      </header>

      <div class="messages">
        <div
          v-for="msg in messages"
          :key="msg.sentAt"
          :class="['message', msg.authorId === userId ? 'mine' : 'theirs']"
        >
          <span v-if="msg.authorId !== userId"
                class="avatar-sm"
                :style="{ background: colorFromId(currentChat.id || '') }">
            {{ initials(currentChat.name || '') }}
          </span>

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
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/auth';
import { initials, colorFromId } from '@/utils/avatar';

const route      = useRoute();
const router     = useRouter();
const chatStore  = useChatStore();
const authStore  = useAuthStore();

const userId   = authStore.user.id;
const activeId = ref(route.params.id as string);
const draft    = ref('');

onMounted(async () => {
  await chatStore.init();
  chatStore.join(activeId.value);
});

watch(() => route.params.id, (id) => {
  if (typeof id === 'string') {
    activeId.value = id;
    chatStore.join(id);
  }
});

const chats       = computed(() => chatStore.chats);
const messages    = computed(() => chatStore.messages[activeId.value] || []);
const currentChat = computed(() =>
  chats.value.find(c => c.id === activeId.value) || { id: '', name: '' }
);
const pinnedChats = computed(() => chats.value.filter((c: any) => c.pinned));
const recentChats = computed(() => chats.value.filter((c: any) => !c.pinned));

function openChat(id?: string) {
  if (!id) return;
  router.push({ name: 'Chat', params: { id } });
}

function send() {
  if (draft.value.trim()) {
    chatStore.send(activeId.value, draft.value.trim());
    draft.value = '';
  }
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
</script>

<style scoped>
/* (Your existing styles, plus avatar rules) */

.avatar, .avatar-sm, .avatar-lg {
  display:inline-flex; align-items:center; justify-content:center;
  color:#fff; font-weight:600; border-radius:50%;
}
.avatar     { width:32px; height:32px; font-size:.9rem; margin-right:8px; }
.avatar-sm  { width:24px; height:24px; font-size:.7rem; margin-right:8px; }
.avatar-lg  { width:40px; height:40px; font-size:1rem; margin-right:12px; }

/* ...rest of your ChatView styles... */
</style>
