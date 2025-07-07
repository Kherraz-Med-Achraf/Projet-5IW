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
            {{ initials(getDisplayName(chats.find(c => c.id === currentChatId))) }}
          </span>
          <h2>{{ getDisplayName(chats.find(c => c.id === currentChatId)) }}</h2>
        </header>

        <!-- Messages -->
        <div class="messages">
          <div
            v-for="(message, index) in messages"
            :key="message.id"
            :class="['message', message.authorId === userId ? 'mine' : 'theirs']"
            role="article"
            :aria-label="getMessageLabel(message)"
            :aria-describedby="`message-${message.id}-meta`"
            tabindex="0"
            @keydown="handleMessageKeyDown($event, message, index)"
          >
            <span
              v-if="message.authorId !== userId"
              class="avatar-sm"
              :style="{ background: colorFromId(String(currentChatId)) }"
            >
              {{ initials(getDisplayName(chats.find(c => c.id === currentChatId))) }}
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
              v-if="message.authorId === userId && editingId !== message.id"
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
import { secureJsonCall } from "@/utils/api";

const chatStore = useChatStore();
const auth = useAuthStore();

// URL racine de l'API Nest
const API_BASE = import.meta.env.VITE_NEST_API_URL ?? "http://localhost:3000";

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
  await chatStore.fetchContacts();
});

/* données - exactement comme ChatView */
const chats = computed(() => chatStore.chats);
const messages = computed(() => {
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

/* démarrer une nouvelle discussion - sans redirection automatique */
async function startChat(contactId: string) {
  const existing = chatStore.chats.find(
    (c) => c.participants.includes(userId) && c.participants.includes(contactId)
  );
  if (existing) {
    selectChat(existing.id);
    showNew.value = false;
    return;
  }

  // Créer une nouvelle conversation sans redirection
  try {
    const res = await secureJsonCall(`${API_BASE}/chats`, {
      method: "POST",
      body: JSON.stringify({ participants: [userId, contactId] }),
    });
    
    const chatId = res.id ?? res._id;
    if (!chatId) throw new Error("id manquant dans la réponse createChat");

    // Rafraîchir la liste des chats après création
    await chatStore.fetchChats();
    
    // Sélectionner la nouvelle conversation dans la modal
    selectChat(chatId);
    showNew.value = false;
    
    // Rejoindre la nouvelle conversation pour recevoir les messages
    chatStore.join(chatId);
    
  } catch (err: any) {
    console.error("Erreur création chat:", err);
    const notification = await import("@/stores/notificationStore");
    notification.useNotificationStore?.()?.showNotification(
      err?.message || "Impossible de créer la conversation",
      "error"
    );
  }
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
  const isOwn = message.authorId === userId;
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
      if (message.authorId === userId) {
        e.preventDefault();
        startEdit(message);
      }
      break;
    case 'Delete':
      if (message.authorId === userId) {
        e.preventDefault();
        askDelete(message);
      }
      break;
  }
}
</script>

<style scoped>
/* =================== CONTENEUR PRINCIPAL =================== */
.chat-modal-container {
  display: flex;
  height: 100%;
  width: 100%;
  background: #f8fafc;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
}

/* =================== SIDEBAR =================== */
.sidebar {
  width: 300px;
  background: white;
  border-right: 1px solid #e5e7eb;
  overflow-y: auto;
  box-shadow: 4px 0 16px rgba(0, 0, 0, 0.05);
}

.sidebar::-webkit-scrollbar {
  width: 6px;
}

.sidebar::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.sidebar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.sidebar::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.section {
  padding: 24px 16px;
  border-bottom: 1px solid #f3f4f6;
}

.section h3 {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  font-size: 1.1rem;
  color: #1f2937;
  font-weight: 600;
}

.section ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.section li {
  margin-bottom: 4px;
  border-radius: 10px;
  overflow: hidden;
  transition: all 0.2s ease;
}

.section li button {
  width: 100%;
  padding: 16px 12px;
  background: white;
  border: none;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.section li button:hover {
  background: #f8fafc;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.section li button:focus {
  outline: none;
  background: #eff6ff;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
}

.section li.active button {
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border-left: 4px solid #3b82f6;
}

.section li.unread button {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-left: 4px solid #f59e0b;
}

.section li.unread .chat-name {
  font-weight: 600;
  color: #92400e;
}

.avatar {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  margin-right: 12px;
  flex-shrink: 0;
  background: linear-gradient(135deg, #4444ac 0%, #3a3a96 100%);
  color: white;
  font-weight: 600;
  font-size: 0.9rem;
  box-shadow: 0 4px 12px rgba(68, 68, 172, 0.3);
}

.chat-info {
  flex: 1;
  min-width: 0;
}

.chat-name {
  display: block;
  font-weight: 600;
  color: #1f2937;
  font-size: 0.95rem;
  margin-bottom: 4px;
}

.chat-preview {
  display: block;
  font-size: 0.85rem;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 160px;
}

.chat-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.chat-time {
  font-size: 0.8rem;
  color: #6b7280;
}

.unread-badge {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 600;
  min-width: 18px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3);
}

/* =================== ZONE PRINCIPALE =================== */
.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: white;
  min-width: 0;
  height: 100%;
}

/* =================== HEADER DE CONVERSATION =================== */
.chat-header {
  display: flex;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid #e5e7eb;
  background: #f8fafc;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
}

.avatar-lg {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  margin-right: 16px;
  background: linear-gradient(135deg, #4444ac 0%, #3a3a96 100%);
  color: white;
  font-weight: 600;
  font-size: 1.1rem;
  box-shadow: 0 4px 12px rgba(68, 68, 172, 0.3);
}

.chat-header h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

/* =================== ZONE DES MESSAGES =================== */
.messages {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  background: #f8fafc;
  scroll-behavior: smooth;
  min-height: 0;
}

.messages::-webkit-scrollbar {
  width: 6px;
}

.messages::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.messages::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.messages::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* =================== MESSAGES =================== */
.message {
  margin-bottom: 16px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.message.mine {
  flex-direction: row-reverse;
}

.avatar-sm {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #4444ac 0%, #3a3a96 100%);
  color: white;
  font-weight: 600;
  font-size: 0.8rem;
  box-shadow: 0 2px 8px rgba(68, 68, 172, 0.3);
  flex-shrink: 0;
}

.bubble {
  max-width: 70%;
  position: relative;
  padding: 12px 16px;
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.message.mine .bubble {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  border-radius: 20px 20px 4px 20px;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.message.theirs .bubble {
  background: white;
  color: #1f2937;
  border-radius: 20px 20px 20px 4px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.message-text {
  font-size: 0.9rem;
  line-height: 1.4;
  word-wrap: break-word;
}

.bubble time {
  display: block;
  font-size: 0.75rem;
  margin-top: 6px;
  text-align: right;
  opacity: 0.8;
}

.message.mine .bubble time {
  color: rgba(255, 255, 255, 0.8);
}

.message.theirs .bubble time {
  color: #6b7280;
}

/* =================== ACTIONS DES MESSAGES =================== */
.message-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.message:hover .message-actions {
  opacity: 1;
}

.message-actions button {
  padding: 6px 8px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
}

.message-actions .btn-edit {
  background: #eff6ff;
  color: #3b82f6;
}

.message-actions .btn-edit:hover {
  background: #3b82f6;
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.message-actions .btn-delete {
  background: #fef2f2;
  color: #ef4444;
}

.message-actions .btn-delete:hover {
  background: #ef4444;
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

/* =================== ZONE D'ÉDITION =================== */
.edit-container {
  margin-top: 12px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}

.edit-container textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.9rem;
  resize: vertical;
  min-height: 80px;
  transition: border-color 0.2s ease;
}

.edit-container textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.edit-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  justify-content: flex-end;
}

.edit-actions button {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.edit-actions .btn-save {
  background: #3b82f6;
  color: white;
}

.edit-actions .btn-save:hover {
  background: #1d4ed8;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.edit-actions .btn-cancel {
  background: #f3f4f6;
  color: #6b7280;
}

.edit-actions .btn-cancel:hover {
  background: #e5e7eb;
  color: #374151;
}

/* =================== ZONE DE SAISIE =================== */
.composer {
  display: flex;
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
  background: white;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
}

.composer input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #d1d5db;
  border-radius: 24px;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  background: #f8fafc;
}

.composer input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  background: white;
}

.composer button {
  margin-left: 12px;
  padding: 12px 20px;
  border: none;
  border-radius: 24px;
  background: linear-gradient(135deg, #4444ac 0%, #3a3a96 100%);
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(68, 68, 172, 0.3);
}

.composer button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(68, 68, 172, 0.4);
}

.composer button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* =================== BOUTON NOUVELLE CONVERSATION =================== */
.btn-new {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: none;
  background: linear-gradient(135deg, #4444ac 0%, #3a3a96 100%);
  color: white;
  cursor: pointer;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(68, 68, 172, 0.3);
}

.btn-new:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(68, 68, 172, 0.4);
}

.btn-new:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(68, 68, 172, 0.3);
}

/* =================== ÉTATS VIDES =================== */
.no-chat-selected {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  padding: 40px;
  color: #6b7280;
}

.no-chat-selected h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.no-chat-selected p {
  font-size: 0.9rem;
  line-height: 1.5;
  max-width: 300px;
}

.no-messages {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  padding: 40px;
  color: #6b7280;
}

.no-messages h4 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.no-messages p {
  font-size: 0.9rem;
  line-height: 1.5;
}

/* =================== ANIMATIONS =================== */
.message-enter-active {
  transition: all 0.3s ease;
}

.message-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.message-leave-active {
  transition: all 0.3s ease;
}

.message-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

/* =================== MODALES =================== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal {
  background: white;
  border-radius: 16px;
  padding: 32px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  animation: modal-appear 0.3s ease;
}

@keyframes modal-appear {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.modal h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 24px;
  text-align: center;
}

.modal p {
  font-size: 1rem;
  color: #4b5563;
  margin-bottom: 24px;
  text-align: center;
}

.contacts {
  list-style: none;
  padding: 0;
  margin: 0 0 24px 0;
  max-height: 300px;
  overflow-y: auto;
}

.contacts::-webkit-scrollbar {
  width: 6px;
}

.contacts::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.contacts::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.contact-item {
  display: flex;
  align-items: center;
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 8px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  transition: all 0.2s ease;
}

.contact-item:hover {
  background: #f1f5f9;
  border-color: #3b82f6;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
}

.contact-item .avatar-sm {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #4444ac 0%, #3a3a96 100%);
  color: white;
  font-weight: 600;
  font-size: 0.9rem;
  margin-right: 16px;
  box-shadow: 0 4px 12px rgba(68, 68, 172, 0.3);
}

.contact-name {
  flex: 1;
  font-size: 0.95rem;
  font-weight: 500;
  color: #1f2937;
}

.contact-name em {
  font-weight: 400;
  color: #6b7280;
  font-style: normal;
}

.btn-start {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
}

.btn-start:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
}

.modal-btns {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.modal-btns button {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;
  min-width: 100px;
}

.modal-btns button:first-child {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.modal-btns button:first-child:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4);
}

.modal-btns button:last-child {
  background: #f3f4f6;
  color: #6b7280;
}

.modal-btns button:last-child:hover {
  background: #e5e7eb;
  color: #374151;
}

.btn-close {
  width: 100%;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  background: #f3f4f6;
  color: #6b7280;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;
}

.btn-close:hover {
  background: #e5e7eb;
  color: #374151;
}

/* =================== PLACEHOLDER =================== */
.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  padding: 40px;
  color: #6b7280;
}

.placeholder p {
  font-size: 1rem;
  line-height: 1.5;
  max-width: 400px;
}

/* =================== ACTIONS DES MESSAGES =================== */
.actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.message:hover .actions {
  opacity: 1;
}

.icon-btn {
  padding: 6px 8px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 4px;
}

.icon-btn.edit {
  background: #eff6ff;
  color: #3b82f6;
}

.icon-btn.edit:hover {
  background: #3b82f6;
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.icon-btn.delete {
  background: #fef2f2;
  color: #ef4444;
}

.icon-btn.delete:hover {
  background: #ef4444;
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.edit-box {
  width: 100%;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.9rem;
  resize: vertical;
  min-height: 80px;
  transition: border-color 0.2s ease;
  margin-bottom: 12px;
}

.edit-box:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.edit-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.edit-actions button {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.edit-actions button:first-child {
  background: #3b82f6;
  color: white;
}

.edit-actions button:first-child:hover {
  background: #1d4ed8;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.edit-actions button:last-child {
  background: #f3f4f6;
  color: #6b7280;
}

.edit-actions button:last-child:hover {
  background: #e5e7eb;
  color: #374151;
}

/* =================== RESPONSIVE =================== */
@media (max-width: 768px) {
  .chat-modal-container {
    flex-direction: column;
  }
  
  .sidebar {
    width: 100%;
    max-height: 40%;
    border-right: none;
    border-bottom: 1px solid #e5e7eb;
  }
  
  .content {
    flex: 1;
    min-height: 0;
  }
  
  .bubble {
    max-width: 85%;
  }
  
  .composer {
    padding: 12px 16px;
  }
  
  .messages {
    padding: 16px;
  }
  
  .modal {
    margin: 20px;
    padding: 24px;
  }
  
  .contacts {
    max-height: 200px;
  }
}
</style> 