<template>
  <div class="chat-modal-container">
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
        <div class="messages" ref="messagesContainer">
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
              <button class="icon-btn edit" @click="startEdit(msg)" title="Modifier">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                </svg>
              </button>
              <button class="icon-btn delete" @click="askDelete(msg)" title="Supprimer">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3,6 5,6 21,6"></polyline>
                  <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,2h4a2,2 0 0,1 2,2v2"></path>
                </svg>
              </button>
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
              >{{ c.name }} <em>({{ translateRole(c.role) }})</em></span
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
import { useChatStore } from "@/stores/chatStore";
import type { ChatMessage } from "@/stores/chatStore";
import { useAuthStore } from "@/stores/auth";
import { initials, colorFromId } from "@/utils/avatar";

const chatStore = useChatStore();
const auth = useAuthStore();

const userId = auth.user?.id || "";
const activeId = ref<string | undefined>(undefined);
const draft = ref("");

/* édition / suppression */
const editingId = ref<string | null>(null);
const editDraft = ref("");
const deleteId = ref<string | null>(null);

/* nouvelle discussion */
const showNew = ref(false);
const contacts = computed(() => chatStore.contacts);
const messagesContainer = ref<HTMLElement | null>(null);

/* chargement initial */
onMounted(async () => {
  await chatStore.init();
});

// Computed properties
const recentChats = computed(() => chatStore.recentChats);
const messages = computed(() => chatStore.messages);

const headerName = computed(() => {
  if (!activeId.value) return "";
  const chat = recentChats.value.find((c) => c.id === activeId.value);
  return displayName(chat);
});

/* utilitaires */
function displayName(chat: any): string {
  if (!chat) return "";
  return chat.participants
    .filter((p: any) => p.id !== userId)
    .map((p: any) => p.name)
    .join(", ");
}

function formatChatTime(date: string): string {
  const now = new Date();
  const msgDate = new Date(date);
  const diff = now.getTime() - msgDate.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}j`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return "maintenant";
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  if (isToday) {
    return date.toLocaleTimeString("fr-FR", { 
      hour: "2-digit", 
      minute: "2-digit" 
    });
  }
  
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  
  if (isYesterday) {
    return "Hier " + date.toLocaleTimeString("fr-FR", { 
      hour: "2-digit", 
      minute: "2-digit" 
    });
  }
  
  return date.toLocaleDateString("fr-FR", { 
    day: "2-digit", 
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
}

/* actions */
async function openChat(chatId: string) {
  activeId.value = chatId;
  await chatStore.fetchMessages(chatId);
  chatStore.join(chatId);
  chatStore.markAsRead(chatId);
  scrollToBottom();
}

async function send() {
  if (!draft.value.trim() || !activeId.value) return;
  
  const content = draft.value.trim();
  draft.value = "";
  
  await chatStore.sendMessage(activeId.value, content);
  scrollToBottom();
}

/* édition */
function startEdit(msg: ChatMessage) {
  editingId.value = msg.id;
  editDraft.value = msg.content;
}

function cancelEdit() {
  editingId.value = null;
  editDraft.value = "";
}

async function confirmEdit(msgId: string) {
  if (!activeId.value || !editDraft.value.trim()) return;
  
  await chatStore.editMessage(activeId.value, msgId, editDraft.value.trim());
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

/* nouvelle discussion */
function closeNew() {
  showNew.value = false;
}

async function startChat(contactId: string) {
  try {
    const chatId = await chatStore.createChat(contactId);
    activeId.value = chatId;
    showNew.value = false;
    await chatStore.fetchMessages(chatId);
    chatStore.join(chatId);
    scrollToBottom();
  } catch (error) {
    console.error("Erreur lors de la création du chat:", error);
  }
}

function translateRole(role: string): string {
  const roleMap: { [key: string]: string } = {
    DIRECTOR: "Directeur",
    SERVICE_MANAGER: "Chef de service",
    SECRETARY: "Secrétaire",
    STAFF: "Educateur",
    PARENT: "Parent",
  };
  return roleMap[role] || role;
}

// Watcher pour auto-scroll sur nouveaux messages
watch(messages, () => {
  scrollToBottom();
}, { deep: true });
</script>

<style scoped>
.chat-modal-container {
  display: flex;
  height: 100%;
  width: 100%;
  background: #f8f9fa;
  border-radius: 8px;
  overflow: hidden;
}

.sidebar {
  width: 300px;
  background: #ffffff;
  border-right: 1px solid #e9ecef;
  display: flex;
  flex-direction: column;
}

.section {
  padding: 16px;
}

.section h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.btn-new {
  width: 100%;
  padding: 8px 12px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-new:hover {
  background: #0056b3;
}

.btn-icon {
  font-size: 16px;
  font-weight: bold;
}

.sidebar ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.sidebar li {
  display: flex;
  align-items: center;
  padding: 12px 8px;
  cursor: pointer;
  border-radius: 6px;
  margin-bottom: 4px;
  transition: background-color 0.2s;
}

.sidebar li:hover {
  background: #f8f9fa;
}

.sidebar li.active {
  background: #e3f2fd;
}

.sidebar li.unread {
  background: #f0f8ff;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 500;
  font-size: 14px;
  margin-right: 12px;
  flex-shrink: 0;
}

.chat-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.chat-name {
  font-weight: 500;
  color: #333;
  font-size: 14px;
  margin-bottom: 2px;
}

.chat-preview {
  font-size: 12px;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  margin-left: 8px;
}

.chat-time {
  font-size: 11px;
  color: #999;
  margin-bottom: 4px;
}

.unread-badge {
  background: #dc3545;
  color: white;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 16px;
  text-align: center;
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: white;
}

.placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  font-size: 14px;
  text-align: center;
  padding: 20px;
}

.chat-header {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e9ecef;
  background: #f8f9fa;
}

.avatar-lg {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 500;
  font-size: 16px;
  margin-right: 12px;
}

.chat-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.message.mine {
  flex-direction: row-reverse;
}

.message.mine .bubble {
  background: #007bff;
  color: white;
}

.message.theirs .bubble {
  background: #e9ecef;
  color: #333;
}

.avatar-sm {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 500;
  font-size: 12px;
  flex-shrink: 0;
}

.bubble {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 16px;
  word-wrap: break-word;
}

.bubble p {
  margin: 0 0 4px 0;
  font-size: 14px;
  line-height: 1.4;
}

.bubble time {
  font-size: 11px;
  opacity: 0.7;
  display: block;
}

.edit-box {
  width: 100%;
  min-height: 60px;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  resize: vertical;
  font-family: inherit;
}

.edit-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.edit-actions button {
  padding: 4px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.edit-actions button:first-child {
  background: #007bff;
  color: white;
}

.edit-actions button:last-child {
  background: #6c757d;
  color: white;
}

.actions {
  display: flex;
  gap: 4px;
  margin-top: 4px;
}

.icon-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.6;
  transition: all 0.2s;
}

.icon-btn:hover {
  opacity: 1;
  background: rgba(0, 0, 0, 0.1);
}

.icon-btn.edit:hover {
  color: #007bff;
}

.icon-btn.delete:hover {
  color: #dc3545;
}

.composer {
  display: flex;
  gap: 8px;
  padding: 16px 20px;
  border-top: 1px solid #e9ecef;
  background: #f8f9fa;
}

.composer input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #ddd;
  border-radius: 20px;
  font-size: 14px;
  outline: none;
}

.composer input:focus {
  border-color: #007bff;
}

.composer button {
  padding: 12px 20px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.composer button:hover {
  background: #0056b3;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 8px;
  padding: 24px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal h2 {
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.modal p {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: #666;
}

.modal-btns {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.modal-btns button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.modal-btns button:first-child {
  background: #dc3545;
  color: white;
}

.modal-btns button:last-child {
  background: #6c757d;
  color: white;
}

.contacts {
  list-style: none;
  padding: 0;
  margin: 0 0 16px 0;
  max-height: 300px;
  overflow-y: auto;
}

.contact-item {
  display: flex;
  align-items: center;
  padding: 12px 8px;
  border-radius: 6px;
  margin-bottom: 4px;
  transition: background-color 0.2s;
}

.contact-item:hover {
  background: #f8f9fa;
}

.contact-name {
  flex: 1;
  margin-left: 12px;
  font-size: 14px;
  color: #333;
}

.contact-name em {
  color: #666;
  font-style: normal;
}

.btn-start {
  padding: 6px 12px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-start:hover {
  background: #0056b3;
}

.btn-close {
  width: 100%;
  padding: 8px 16px;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-close:hover {
  background: #5a6268;
}
</style> 