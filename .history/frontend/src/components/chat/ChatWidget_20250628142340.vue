<template>
  <!-- Floating Chat Launcher Button -->
  <div class="chat-launcher" @click="toggleList" :title="launcherTitle">
    💬
    <span v-if="totalUnread > 0" class="badge">{{ totalUnread }}</span>
  </div>

  <!-- Chats list panel -->
  <div v-if="showList" class="chat-list-panel">
    <header>
      <h3>Messages</h3>
      <button class="close-btn" @click="showList = false">×</button>
    </header>

    <ul>
      <li
        v-for="chat in recentChats"
        :key="chat.id"
        @click="openPopup(chat.id)"
        :class="{ unread: chat.unreadCount && chat.unreadCount > 0 }"
      >
        <span class="avatar-sm" :style="{ background: colorFromId(chat.id) }">
          {{ initials(displayName(chat)) }}
        </span>
        <div class="info">
          <span class="name">{{ displayName(chat) }}</span>
          <span class="preview">{{ chat.lastMessage }}</span>
        </div>
        <span v-if="chat.unreadCount" class="badge">{{
          chat.unreadCount
        }}</span>
      </li>
    </ul>
  </div>

  <!-- Pop-up windows for opened chats -->
  <template v-for="(id, idx) in openPopups" :key="id">
    <div class="chat-popup" :style="{ left: `${20 + idx * 320}px` }">
      <header @click="toggleMinimize(id)">
        <span class="avatar-sm" :style="{ background: colorFromId(id) }">
          {{ initials(headerName(id)) }}
        </span>
        <h4>{{ headerName(id) }}</h4>
        <div class="actions">
          <button @click.stop="closePopup(id)">×</button>
        </div>
      </header>

      <div v-show="!minimized[id]" class="body">
        <div :id="`msgs_${id}`" class="msgs">
          <div
            v-for="msg in widgetMessages(id)"
            :key="msg.id"
            :class="['msg', msg.authorId === userId ? 'mine' : 'theirs']"
          >
            <p>{{ msg.content }}</p>
            <time>{{ formatTime(msg.sentAt) }}</time>
          </div>
        </div>
        <form class="composer" @submit.prevent="send(id)">
          <input v-model="drafts[id]" placeholder="Message…" />
        </form>
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick, onMounted } from "vue";
import { useChatStore } from "@/stores/chatStore";
import { useAuthStore } from "@/stores/auth";
import { colorFromId, initials } from "@/utils/avatar";

const chatStore = useChatStore();
const auth = useAuthStore();

onMounted(() => {
  // init du chat (idempotent)
  chatStore.init();
});

const showList = ref(false);
const openPopups = reactive<string[]>([]);
const minimized = reactive<Record<string, boolean>>({});
const drafts = reactive<Record<string, string>>({});
const userId = auth.user?.id || "";

const totalUnread = computed(() =>
  chatStore.chats.reduce((sum, c) => sum + (c.unreadCount || 0), 0)
);
const launcherTitle = computed(() =>
  totalUnread.value ? `${totalUnread.value} nouveaux messages` : "Messages"
);

const chats = computed(() => chatStore.chats);
const recentChats = computed(() =>
  chats.value.slice().sort((a, b) => {
    return (
      new Date(b.updatedAt ?? 0).getTime() -
      new Date(a.updatedAt ?? 0).getTime()
    );
  })
);

function displayName(chat: any) {
  const otherId = chat.participants.find((p: any) => p !== userId);
  const c = chatStore.contacts.find((ct) => ct.id === otherId);
  return c?.name || otherId;
}
function headerName(chatId: string) {
  const chat = chats.value.find((c) => c.id === chatId);
  if (!chat) return "Conversation";
  const otherId = chat.participants.find((p: any) => p !== userId);
  const c = chatStore.contacts.find((ct) => ct.id === otherId);
  return c?.name || otherId;
}

function toggleList() {
  showList.value = !showList.value;
}

function openPopup(chatId: string) {
  if (!openPopups.includes(chatId)) {
    openPopups.unshift(chatId);
    minimized[chatId] = false;
    drafts[chatId] = "";
    chatStore.join(chatId);
    if (!chatStore.messages[chatId]) {
      chatStore.fetchMessages(chatId);
    }
    chatStore.markAsRead(chatId);
  }
  showList.value = false;
  nextTick(() => scrollToBottom(chatId));
}

function closePopup(chatId: string) {
  const idx = openPopups.indexOf(chatId);
  if (idx !== -1) openPopups.splice(idx, 1);
}
function toggleMinimize(chatId: string) {
  minimized[chatId] = !minimized[chatId];
}

function widgetMessages(chatId: string) {
  return chatStore.messages[chatId] || [];
}

function send(chatId: string) {
  const text = drafts[chatId]?.trim();
  if (!text) return;
  chatStore.send(chatId, text);
  drafts[chatId] = "";
  nextTick(() => scrollToBottom(chatId));
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function scrollToBottom(chatId: string) {
  nextTick(() => {
    const el = document.getElementById(`msgs_${chatId}`);
    if (el) el.scrollTop = el.scrollHeight;
  });
}

watch(
  () => chatStore.chats.map((c) => c.unreadCount),
  () => {
    // reactive totalUnread update handled by computed
  }
);

watch(
  () => chatStore.messages,
  () => {
    openPopups.forEach((id) => scrollToBottom(id));
  },
  { deep: true }
);
</script>

<style scoped>
.chat-launcher {
  position: fixed;
  bottom: 24px;
  left: 24px;
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 1000;
}
.chat-launcher .badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #dc3545;
  color: #fff;
  padding: 2px 6px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.chat-list-panel {
  position: fixed;
  bottom: 90px;
  left: 24px;
  width: 300px;
  max-height: 400px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  z-index: 1000;
}
.chat-list-panel header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #e9ecef;
}
.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
}
.chat-list-panel ul {
  list-style: none;
  padding: 0;
  margin: 0;
  overflow-y: auto;
  flex: 1;
}
.chat-list-panel li {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  cursor: pointer;
  transition: background 0.2s ease;
}
.chat-list-panel li:hover {
  background: #f8f9fa;
}
.chat-list-panel li.unread .name {
  font-weight: 600;
  color: #e65100;
}
.avatar-sm {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 10px;
  font-size: 0.8rem;
  color: #fff;
}
.info {
  flex: 1;
  min-width: 0;
}
.name {
  display: block;
  font-size: 0.85rem;
  color: #2c3e50;
}
.preview {
  font-size: 0.75rem;
  color: #6c757d;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.badge {
  background: #dc3545;
  color: #fff;
  padding: 2px 6px;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 600;
  min-width: 18px;
  text-align: center;
}

.chat-popup {
  position: fixed;
  bottom: 24px;
  width: 300px;
  height: 380px;
  background: #fff;
  border-radius: 12px 12px 0 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  z-index: 1000;
}
.chat-popup header {
  display: flex;
  align-items: center;
  padding: 10px;
  background: #f1f3f5;
  border-radius: 12px 12px 0 0;
  cursor: pointer;
}
.chat-popup header h4 {
  flex: 1;
  font-size: 0.9rem;
  margin-left: 8px;
  color: #2c3e50;
}
.chat-popup header .actions button {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
}
.chat-popup .body {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.msgs {
  flex: 1;
  padding: 10px;
  overflow-y: auto;
}
.msg {
  margin-bottom: 8px;
}
.msg.mine {
  text-align: right;
}
.msg p {
  display: inline-block;
  padding: 6px 10px;
  border-radius: 12px;
  max-width: 80%;
  font-size: 0.85rem;
}
.msg.mine p {
  background: #667eea;
  color: #fff;
  border-bottom-right-radius: 4px;
}
.msg.theirs p {
  background: #f1f3f5;
  color: #2c3e50;
  border-bottom-left-radius: 4px;
}
.msg time {
  font-size: 0.65rem;
  opacity: 0.7;
  display: block;
  margin-top: 2px;
}
.msg.mine time {
  color: rgba(255, 255, 255, 0.8);
}

.composer {
  display: flex;
  padding: 8px 10px;
  border-top: 1px solid #e9ecef;
}
.composer input {
  flex: 1;
  padding: 8px 10px;
  border: 1px solid #e9ecef;
  border-radius: 16px;
  font-size: 0.85rem;
}
.composer input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
}
</style>
