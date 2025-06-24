<template>
  <div class="chat-container">
    <!-- ───────── Barre latérale ───────── -->
    <aside class="sidebar">
      <section class="section recent">
        <h3>Conversations</h3>
        <button class="btn-new" @click="showNew = true">
          <span class="btn-icon">+</span>
          Nouvelle
        </button>
        <ul>
          <li
            v-for="c in recentChats"
            :key="c.id"
            :class="{
              active: c.id === activeId,
              unread: c.unreadCount && c.unreadCount > 0,
            }"
            @click="openChat(c.id)"
          >
            <span class="avatar" :style="{ background: colorFromId(c.id) }">
              {{ initials(displayName(c)) }}
            </span>
            <div class="chat-info">
              <span class="chat-name">{{ displayName(c) }}</span>
              <span class="chat-preview">{{ c.lastMessage }}</span>
            </div>
            <div class="chat-meta">
              <span class="chat-time">{{ formatChatTime(c.updatedAt) }}</span>
              <span
                v-if="c.unreadCount && c.unreadCount > 0"
                class="unread-badge"
                >{{ c.unreadCount }}</span
              >
            </div>
          </li>
        </ul>
      </section>
    </aside>

    <!-- ───────── Contenu principal ───────── -->
    <div class="content">
      <!-- Placeholder si aucune conversation -->
      <div v-if="!activeId" class="placeholder">
        <p>
          Sélectionnez une conversation dans la liste ou cliquez sur
          <strong>Nouvelle</strong> pour démarrer un échange.
        </p>
      </div>

      <template v-else>
        <header class="chat-header">
          <span
            class="avatar-lg"
            :style="{ background: colorFromId(String(activeId)) }"
          >
            {{ initials(headerName) }}
          </span>
          <h2>{{ headerName }}</h2>
        </header>

        <!-- Messages -->
        <div class="messages">
          <div
            v-for="msg in messages"
            :key="msg.id"
            :class="['message', msg.authorId === userId ? 'mine' : 'theirs']"
          >
            <span
              v-if="msg.authorId !== userId"
              class="avatar-sm"
              :style="{ background: colorFromId(String(activeId)) }"
            >
              {{ initials(headerName) }}
            </span>

            <div class="bubble">
              <!-- affichage / édition inline -->
              <template v-if="editingId === msg.id">
                <textarea
                  v-model="editDraft"
                  @keydown.enter.prevent="confirmEdit(msg.id)"
                  class="edit-box"
                />
                <div class="edit-actions">
                  <button @click="confirmEdit(msg.id)">Enregistrer</button>
                  <button @click="cancelEdit">Annuler</button>
                </div>
              </template>
              <template v-else>
                <p>{{ msg.content }}</p>
                <time
                  >{{ formatTime(msg.sentAt) }}
                  <span v-if="msg.editedAt">(édité)</span>
                </time>
              </template>
            </div>

            <!-- actions (edit / delete) visibles uniquement pour l'auteur -->
            <div
              v-if="msg.authorId === userId && editingId !== msg.id"
              class="actions"
            >
              <button class="icon-btn" @click="startEdit(msg)">✏️</button>
              <button class="icon-btn" @click="askDelete(msg)">🗑️</button>
            </div>
          </div>
        </div>

        <!-- Composer -->
        <form class="composer" @submit.prevent="send">
          <input
            v-model="draft"
            placeholder="Veuillez écrire un nouveau message"
          />
          <button type="submit">Envoyer</button>
        </form>
      </template>
    </div>

    <!-- Modal confirmation suppression -->
    <div v-if="deleteId" class="modal-overlay" @click.self="deleteId = null">
      <div class="modal">
        <p>Supprimer ce message&nbsp;?</p>
        <div class="modal-btns">
          <button @click="performDelete">Oui</button>
          <button @click="deleteId = null">Non</button>
        </div>
      </div>
    </div>

    <!-- Modal Nouvelle discussion -->
    <div v-if="showNew" class="modal-overlay" @click.self="closeNew">
      <div class="modal">
        <h2>Nouvelle conversation</h2>
        <ul class="contacts">
          <li v-for="c in contacts" :key="c.id" class="contact-item">
            <span
              class="avatar-sm"
              :style="{ background: colorFromId(c.id) }"
              >{{ initials(c.name) }}</span
            >
            <span class="contact-name"
              >{{ c.name }} <em>({{ c.role }})</em></span
            >
            <button class="btn-start" @click="startChat(c.id)">→</button>
          </li>
        </ul>
        <button class="btn-close" @click="closeNew">Fermer</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useChatStore } from "@/stores/chatStore";
import type { ChatMessage } from "@/stores/chatStore";
import { useAuthStore } from "@/stores/auth";
import { initials, colorFromId } from "@/utils/avatar";

const route = useRoute();
const router = useRouter();
const chatStore = useChatStore();
const auth = useAuthStore();

const userId = auth.user?.id || "";
const activeId = ref(route.params.id as string | undefined);
const draft = ref("");

/* édition / suppression */
const editingId = ref<string | null>(null);
const editDraft = ref("");
const deleteId = ref<string | null>(null);

/* nouvelle discussion */
const showNew = ref(false);
const contacts = computed(() => chatStore.contacts);

/* chargement initial */
onMounted(async () => {
  await chatStore.init();
  if (activeId.value) {
    await chatStore.fetchMessages(activeId.value);
    chatStore.join(activeId.value);
    chatStore.markAsRead(activeId.value);
    scrollToBottom();
  }
});

/* changement d'URL */
watch(
  () => route.params.id,
  async (id) => {
    if (typeof id === "string") {
      activeId.value = id;
      await chatStore.fetchMessages(id);
      chatStore.join(id);
      chatStore.markAsRead(id);
      scrollToBottom();
    }
  }
);

/* données */
const chats = computed(() => chatStore.chats);
const recentChats = computed(() =>
  chats.value
    .filter((c) => c.updatedAt !== c.createdAt)
    .slice()
    .sort(
      (a, b) =>
        new Date(b.updatedAt ?? 0).getTime() -
        new Date(a.updatedAt ?? 0).getTime()
    )
);
const messages = computed<ChatMessage[]>(() => {
  if (!activeId.value) return [];
  return chatStore.messages[activeId.value] || [];
});

/* Auto-scroll quand nouveaux messages */
watch(
  messages,
  () => {
    scrollToBottom();
    if (activeId.value) {
      chatStore.markAsRead(activeId.value);
    }
  },
  { deep: true }
);

function scrollToBottom() {
  nextTick(() => {
    const messagesContainer = document.querySelector(".messages");
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  });
}

/* nom interlocuteur */
const headerName = computed(() => {
  const chat = chats.value.find((c) => c.id === activeId.value);
  if (!chat) return "Conversation";
  const otherId = chat.participants.find((p: any) => p !== userId);
  const c = chatStore.contacts.find((ct) => ct.id === otherId);
  return c?.name || otherId;
});

/* helper */
function displayName(chat: any) {
  const otherId = chat.participants.find((p: any) => p !== userId);
  const c = chatStore.contacts.find((ct) => ct.id === otherId);
  return c?.name || otherId;
}

/* navigation */
function openChat(id?: string) {
  if (id) router.push({ name: "Chat", params: { id } });
}

/* envoi */
function send() {
  if (!activeId.value || !draft.value.trim()) return;
  chatStore.send(activeId.value, draft.value.trim());
  draft.value = "";
}

/* édition */
function startEdit(msg: ChatMessage) {
  editingId.value = msg.id;
  editDraft.value = msg.content;
}
async function confirmEdit(msgId: string) {
  if (!activeId.value || !editDraft.value.trim()) return;
  await chatStore.editMessage(activeId.value, msgId, editDraft.value.trim());
  editingId.value = null;
  editDraft.value = "";
}
function cancelEdit() {
  editingId.value = null;
  editDraft.value = "";
}

/* suppression */
function askDelete(msg: ChatMessage) {
  deleteId.value = msg.id;
}
async function performDelete() {
  if (!activeId.value || !deleteId.value) return;
  await chatStore.deleteMessage(activeId.value, deleteId.value);
  deleteId.value = null;
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatChatTime(ts?: string) {
  if (!ts) return "";
  const date = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) return "maintenant";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return date.toLocaleDateString([], { day: "2-digit", month: "2-digit" });
}

/* démarrer une nouvelle discussion */
async function startChat(contactId: string) {
  const existing = chatStore.chats.find(
    (c) => c.participants.includes(userId) && c.participants.includes(contactId)
  );
  if (existing) {
    openChat(existing.id);
  } else {
    await chatStore.createChatWith(contactId);
  }
  showNew.value = false;
}
function closeNew() {
  showNew.value = false;
}
</script>

<style scoped>
.chat-container {
  display: flex;
  height: 100vh;
  background: #f8f9fa;
}

.sidebar {
  width: 280px;
  background: #ffffff;
  border-right: 1px solid #e9ecef;
  overflow-y: auto;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
}
.section {
  padding: 20px 16px;
}
.section h3 {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 1rem;
  color: #2c3e50;
  font-weight: 600;
}
.section ul {
  list-style: none;
  padding: 0;
  margin: 20px 0 0 0;
}
.section li {
  display: flex;
  align-items: center;
  padding: 12px 8px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 2px;
  transition: all 0.2s ease;
  position: relative;
}
.section li.active,
.section li:hover {
  background: #f8f9fa;
  transform: translateX(2px);
}
.section li.active {
  background: #e3f2fd;
  border-left: 3px solid #2196f3;
}
.section li.unread {
  background: #fff3e0;
  border-left: 3px solid #ff9800;
}
.section li.unread .chat-name {
  font-weight: 600;
  color: #e65100;
}
.avatar {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  margin-right: 12px;
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
.chat-info {
  flex: 1;
  min-width: 0;
}
.chat-name {
  display: block;
  font-weight: 500;
  color: #2c3e50;
  font-size: 0.9rem;
  margin-bottom: 2px;
}
.chat-preview {
  display: block;
  font-size: 0.75rem;
  color: #6c757d;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}
.chat-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}
.chat-time {
  font-size: 0.7rem;
  color: #adb5bd;
}
.unread-badge {
  background: #dc3545;
  color: #fff;
  padding: 2px 6px;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 600;
  min-width: 18px;
  text-align: center;
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #ffffff;
}
.chat-header {
  display: flex;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e9ecef;
  background: #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}
.avatar-lg {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  margin-right: 12px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}
.messages {
  flex: 1;
  padding: 20px 24px;
  overflow-y: auto;
  background: #f8f9fa;
}
.message {
  display: flex;
  margin-bottom: 16px;
}
.message.mine {
  justify-content: flex-end;
}
.message.theirs {
  justify-content: flex-start;
}
.avatar-sm {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  margin-right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.bubble {
  max-width: 60%;
  padding: 12px 16px;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: relative;
}
.message.mine .bubble {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border-bottom-right-radius: 4px;
}
.message.theirs .bubble {
  background: #ffffff;
  color: #2c3e50;
  border: 1px solid #e9ecef;
  border-bottom-left-radius: 4px;
}
.bubble time {
  display: block;
  font-size: 0.65rem;
  margin-top: 4px;
  text-align: right;
  opacity: 0.7;
}
.message.mine .bubble time {
  color: rgba(255, 255, 255, 0.8);
}
.message.theirs .bubble time {
  color: #6c757d;
}

.composer {
  display: flex;
  padding: 16px 24px;
  border-top: 1px solid #e9ecef;
  background: #ffffff;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
}
.composer input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #e9ecef;
  border-radius: 24px;
  font-size: 0.9rem;
  transition: border-color 0.2s ease;
}
.composer input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}
.composer button {
  margin-left: 12px;
  padding: 12px 20px;
  border: none;
  border-radius: 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  font-weight: 500;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.composer button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

/* bouton nouvelle conv */
.btn-new {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: none;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  cursor: pointer;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.btn-new:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}
.btn-icon {
  font-size: 1rem;
  font-weight: bold;
}

/* modal nouvelle discussion */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal {
  background: #fff;
  padding: 28px;
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  width: 400px;
  max-width: 90vw;
}
.modal h2 {
  margin: 0 0 20px 0;
  color: #2c3e50;
  font-weight: 600;
}
.contacts {
  list-style: none;
  padding: 0;
  margin: 16px 0;
  max-height: 300px;
  overflow-y: auto;
}
.contact-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  margin-bottom: 4px;
  border-radius: 8px;
  transition: background-color 0.2s ease;
}
.contact-item:hover {
  background: #f8f9fa;
}
.contact-name {
  flex: 1;
  margin-left: 8px;
  color: #2c3e50;
  font-weight: 500;
}
.btn-start {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  padding: 6px 12px;
  cursor: pointer;
  border-radius: 16px;
  font-weight: 500;
  transition: transform 0.2s ease;
}
.btn-start:hover {
  transform: scale(1.05);
}
.btn-close {
  background: none;
  border: none;
  color: #6c757d;
  cursor: pointer;
  margin-top: 12px;
  text-decoration: underline;
  font-weight: 500;
  transition: color 0.2s ease;
}
.btn-close:hover {
  color: #495057;
}

/* placeholder */
.placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #6c757d;
  padding: 0 24px;
}
.placeholder p {
  max-width: 320px;
  font-size: 1.1rem;
  line-height: 1.5;
}

/* actions icônes */
.actions {
  display: flex;
  flex-direction: column;
  margin-left: 8px;
  gap: 4px;
}
.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 4px;
  border-radius: 50%;
  transition: background-color 0.2s ease;
}
.icon-btn:hover {
  background: rgba(0, 0, 0, 0.1);
}

/* édition */
.edit-box {
  width: 100%;
  min-height: 48px;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 6px;
  font-family: inherit;
  resize: vertical;
}
.edit-box:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}
.edit-actions {
  display: flex;
  gap: 6px;
  margin-top: 4px;
}
.edit-actions button {
  padding: 6px 12px;
  border: none;
  border-radius: 16px;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 500;
  transition: transform 0.2s ease;
}
.edit-actions button:first-child {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}
.edit-actions button:last-child {
  background: #e9ecef;
  color: #6c757d;
}
.edit-actions button:hover {
  transform: translateY(-1px);
}

/* modal suppression */
.modal-btns {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
.modal-btns button {
  padding: 8px 16px;
  border: none;
  border-radius: 16px;
  cursor: pointer;
  font-weight: 500;
  transition: transform 0.2s ease;
}
.modal-btns button:first-child {
  background: #dc3545;
  color: white;
}
.modal-btns button:last-child {
  background: #e9ecef;
  color: #6c757d;
}
.modal-btns button:hover {
  transform: translateY(-1px);
}

/* Scrollbar custom */
.sidebar::-webkit-scrollbar,
.messages::-webkit-scrollbar,
.contacts::-webkit-scrollbar {
  width: 6px;
}
.sidebar::-webkit-scrollbar-track,
.messages::-webkit-scrollbar-track,
.contacts::-webkit-scrollbar-track {
  background: transparent;
}
.sidebar::-webkit-scrollbar-thumb,
.messages::-webkit-scrollbar-thumb,
.contacts::-webkit-scrollbar-thumb {
  background: #dee2e6;
  border-radius: 3px;
}
.sidebar::-webkit-scrollbar-thumb:hover,
.messages::-webkit-scrollbar-thumb:hover,
.contacts::-webkit-scrollbar-thumb:hover {
  background: #adb5bd;
}
</style>
