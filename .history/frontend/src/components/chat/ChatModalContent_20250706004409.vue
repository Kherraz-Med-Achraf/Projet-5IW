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
            v-for="(chat, index) in chats"
            :key="chat.id"
            :class="{
              active: currentChatId === chat.id,
              unread: chat.unreadCount && chat.unreadCount > 0,
            }"
            @click="selectChat(chat.id)"
            @keydown="handleChatItemKeyDown($event, chat.id, index)"
            role="listitem"
            tabindex="0"
            :aria-label="getChatItemLabel(chat)"
            :aria-selected="currentChatId === chat.id"
            :aria-describedby="chat.unreadCount > 0 ? `chat-${chat.id}-unread` : undefined"
          >
            <span class="avatar" :style="{ background: colorFromId(chat.id) }">
              {{ initials(getDisplayName(chat)) }}
            </span>
            <div class="chat-info">
              <span class="chat-name">{{ getDisplayName(chat) }}</span>
              <span class="chat-preview">{{ getLastMessage(chat) }}</span>
            </div>
            <div class="chat-meta">
              <span class="chat-time">{{ formatTime(chat.updatedAt) }}</span>
              <div 
                v-if="chat.unreadCount > 0" 
                class="unread-badge"
                :id="`chat-${chat.id}-unread`"
                :aria-label="`${chat.unreadCount} messages non lus`"
                role="status"
              >
                {{ chat.unreadCount }}
              </div>
            </div>
          </li>
        </ul>
      </section>
    </aside>

    <!-- ───────── Contenu principal ───────── -->
    <div class="content">
      <!-- Placeholder si aucune conversation -->
      <div v-if="!currentChatId" class="placeholder">
        <p>
          Sélectionnez une conversation dans la liste ou cliquez sur
          <strong>Nouvelle</strong> pour démarrer un échange.
        </p>
      </div>

      <template v-else>
        <header class="chat-header">
          <span
            class="avatar-lg"
            :style="{ background: colorFromId(String(currentChatId)) }"
          >
            {{ initials(getDisplayName(chats.value.find(c => c.id === currentChatId))) }}
          </span>
          <h2>{{ getDisplayName(chats.value.find(c => c.id === currentChatId)) }}</h2>
        </header>

        <!-- Messages -->
        <div class="messages">
          <div
            v-for="(message, index) in messages[currentChatId]"
            :key="message.id"
            :class="['message', message.author === userId ? 'mine' : 'theirs']"
            role="article"
            :aria-label="getMessageLabel(message)"
            :aria-describedby="`message-${message.id}-meta`"
            tabindex="0"
            @keydown="handleMessageKeyDown($event, message, index)"
          >
            <span
              v-if="message.author !== userId"
              class="avatar-sm"
              :style="{ background: colorFromId(String(currentChatId)) }"
            >
              {{ initials(getDisplayName(chats.value.find(c => c.id === currentChatId))) }}
            </span>

            <div class="bubble">
              <!-- affichage / édition inline -->
              <template v-if="editingId === message.id">
                <textarea
                  v-model="editDraft"
                  @keydown.enter.prevent="confirmEdit(message.id)"
                  class="edit-box"
                />
                <div class="edit-actions">
                  <button @click="confirmEdit(message.id)">Enregistrer</button>
                  <button @click="cancelEdit">Annuler</button>
                </div>
              </template>
              <template v-else>
                <p>{{ message.content }}</p>
                <time
                  >{{ formatTime(message.sentAt) }}
                  <span v-if="message.editedAt">(édité)</span>
                </time>
              </template>
            </div>

            <!-- actions (edit / delete) visibles uniquement pour l'auteur -->
            <div
              v-if="message.author === userId && editingId !== message.id"
              class="actions"
            >
              <button class="icon-btn edit" @click="startEdit(message)" title="Modifier">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                </svg>
              </button>
              <button class="icon-btn delete" @click="askDelete(message)" title="Supprimer">
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
const currentChatId = ref<string | null>(null);
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
});

/* données - exactement comme ChatView */
const chats = computed(() => chatStore.chats);
const messages = computed<ChatMessage[]>(() => {
  if (!currentChatId.value) return [];
  return chatStore.messages[currentChatId.value] || [];
});

/* Auto-scroll quand nouveaux messages - exactement comme ChatView */
watch(
  messages,
  () => {
    scrollToBottom();
    if (currentChatId.value) {
      chatStore.markAsRead(currentChatId.value);
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

/* nom interlocuteur - exactement comme ChatView */
const getDisplayName = (chat: any) => {
  const otherId = chat.participants.find((p: any) => p !== userId);
  const c = chatStore.contacts.find((ct) => ct.id === otherId);
  return c?.name || otherId;
};

/* navigation - modifié pour ne pas utiliser le router */
function selectChat(id?: string) {
  if (!id) return;
  currentChatId.value = id;
  chatStore.fetchMessages(id);
  chatStore.join(id);
  chatStore.markAsRead(id);
  scrollToBottom();
}

/* envoi - exactement comme ChatView */
function send() {
  if (!currentChatId.value || !draft.value.trim()) return;
  chatStore.send(currentChatId.value, draft.value.trim());
  draft.value = "";
}

/* édition - exactement comme ChatView */
function startEdit(msg: ChatMessage) {
  editingId.value = msg.id;
  editDraft.value = msg.content;
}
async function confirmEdit(msgId: string) {
  if (!currentChatId.value || !editDraft.value.trim()) return;
  await chatStore.editMessage(currentChatId.value, msgId, editDraft.value.trim());
  editingId.value = null;
  editDraft.value = "";
}
function cancelEdit() {
  editingId.value = null;
  editDraft.value = "";
}

/* suppression - exactement comme ChatView */
function askDelete(msg: ChatMessage) {
  deleteId.value = msg.id;
}
async function performDelete() {
  if (!currentChatId.value || !deleteId.value) return;
  await chatStore.deleteMessage(currentChatId.value, deleteId.value);
  deleteId.value = null;
}

/* formatage des temps - exactement comme ChatView */
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

/* démarrer une nouvelle discussion - exactement comme ChatView mais sans router */
async function startChat(contactId: string) {
  const existing = chatStore.chats.find(
    (c) => c.participants.includes(userId) && c.participants.includes(contactId)
  );
  if (existing) {
    selectChat(existing.id);
  } else {
    await chatStore.createChatWith(contactId);
    // Après création, chercher le nouveau chat
    const newChat = chatStore.chats.find(
      (c) => c.participants.includes(userId) && c.participants.includes(contactId)
    );
    if (newChat) {
      selectChat(newChat.id);
    }
  }
  showNew.value = false;
}

function closeNew() {
  showNew.value = false;
}

function translateRole(role: string) {
  const roleTranslations: Record<string, string> = {
    'DIRECTOR': 'Directeur',
    'SERVICE_MANAGER': 'Chef de service',
    'SECRETARY': 'Secrétaire',
    'STAFF': 'Educateur',
    'PARENT': 'Parent'
  };
  return roleTranslations[role] || role;
}

function getChatItemLabel(chat: any) {
  const name = getDisplayName(chat);
  const lastMessage = getLastMessage(chat);
  const time = formatTime(chat.updatedAt);
  const unreadText = chat.unreadCount > 0 ? `, ${chat.unreadCount} messages non lus` : '';
  
  return `Conversation avec ${name}, dernier message: ${lastMessage}, ${time}${unreadText}`;
}

function getMessageLabel(message: any) {
  const isOwn = message.author === userId;
  const author = isOwn ? 'Vous' : 'Correspondant';
  const time = formatTime(message.sentAt);
  const editedText = message.editedAt ? ', modifié' : '';
  
  return `Message de ${author}, ${time}${editedText}: ${message.content}`;
}

function getLastMessage(chat: any) {
  return chat.lastMessage || 'Aucun message';
}

function handleChatItemKeyDown(e: KeyboardEvent, chatId: string, index: number) {
  const chatItems = document.querySelectorAll('.chat-item');
  
  switch (e.key) {
    case 'Enter':
    case ' ':
      e.preventDefault();
      selectChat(chatId);
      break;
    case 'ArrowDown':
      e.preventDefault();
      if (index < chatItems.length - 1) {
        (chatItems[index + 1] as HTMLElement).focus();
      }
      break;
    case 'ArrowUp':
      e.preventDefault();
      if (index > 0) {
        (chatItems[index - 1] as HTMLElement).focus();
      }
      break;
    case 'Home':
      e.preventDefault();
      (chatItems[0] as HTMLElement).focus();
      break;
    case 'End':
      e.preventDefault();
      (chatItems[chatItems.length - 1] as HTMLElement).focus();
      break;
  }
}

function handleMessageKeyDown(e: KeyboardEvent, message: any, index: number) {
  const messageElements = document.querySelectorAll('.message');
  
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      if (index < messageElements.length - 1) {
        (messageElements[index + 1] as HTMLElement).focus();
      }
      break;
    case 'ArrowUp':
      e.preventDefault();
      if (index > 0) {
        (messageElements[index - 1] as HTMLElement).focus();
      }
      break;
    case 'Enter':
      if (message.author === userId) {
        e.preventDefault();
        startEdit(message);
      }
      break;
    case 'Delete':
      if (message.author === userId) {
        e.preventDefault();
        askDelete(message);
      }
      break;
  }
}
</script>

<style scoped>
.chat-modal-container {
  display: flex;
  height: 100%;
  width: 100%;
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
  background: #007bff;
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
  background: #007bff;
  color: #fff;
  font-weight: 500;
  transition: all 0.2s ease;
}
.composer button:hover {
  background: #0056b3;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
}

/* bouton nouvelle conv */
.btn-new {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: none;
  background: #007bff;
  color: #fff;
  cursor: pointer;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.2s ease;
}
.btn-new:hover {
  background: #0056b3;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
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
  background: #007bff;
  color: #fff;
  border: none;
  padding: 6px 12px;
  cursor: pointer;
  border-radius: 16px;
  font-weight: 500;
  transition: all 0.2s ease;
}
.btn-start:hover {
  background: #0056b3;
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
  opacity: 0;
  transition: opacity 0.2s ease;
}
.message:hover .actions {
  opacity: 1;
}
.icon-btn {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  cursor: pointer;
  font-size: 14px;
  padding: 6px 8px;
  border-radius: 6px;
  transition: all 0.2s ease;
  min-width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.icon-btn:hover {
  background: #e9ecef;
  border-color: #dee2e6;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
.icon-btn.edit {
  color: #6c757d;
}
.icon-btn.edit:hover {
  color: #495057;
  background: #e3f2fd;
  border-color: #bbdefb;
}
.icon-btn.delete {
  color: #dc3545;
}
.icon-btn.delete:hover {
  color: #c82333;
  background: #ffebee;
  border-color: #ffcdd2;
}

/* édition */
.edit-box {
  width: 100%;
  min-height: 48px;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  padding: 8px 12px;
  font-family: inherit;
  resize: vertical;
  font-size: 14px;
  line-height: 1.4;
  transition: border-color 0.2s ease;
}
.edit-box:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}
.edit-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  justify-content: flex-end;
}
.edit-actions button {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s ease;
  min-width: 80px;
}
.edit-actions button:first-child {
  background: #007bff;
  color: white;
}
.edit-actions button:first-child:hover {
  background: #0056b3;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 123, 255, 0.3);
}
.edit-actions button:last-child {
  background: #6c757d;
  color: white;
}
.edit-actions button:last-child:hover {
  background: #5a6268;
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