<template>
  <div class="chat-view" role="main" aria-label="Interface de messagerie">
    <!-- Annonces pour les lecteurs d'écran -->
    <div 
      id="chat-announcements"
      aria-live="polite" 
      aria-atomic="true"
      class="sr-only"
    >
      {{ currentAnnouncement }}
    </div>
    
    <!-- Notifications critiques -->
    <div 
      id="chat-alerts"
      aria-live="assertive" 
      aria-atomic="true"
      class="sr-only"
    >
      {{ criticalAlert }}
    </div>
    
    <!-- Zone de statut pour les actions -->
    <div 
      id="chat-status"
      role="status"
      aria-live="polite"
      class="sr-only"
    >
      {{ statusMessage }}
    </div>

    <!-- En-tête principal -->
    <header class="chat-header" role="banner">
      <h1 id="chat-main-title">Messagerie</h1>
      <div class="chat-header-controls" role="toolbar" aria-label="Actions de messagerie">
        <button 
          class="new-chat-btn"
          @click="showNewChatModal = true"
          aria-label="Démarrer une nouvelle conversation"
          aria-describedby="new-chat-help"
          type="button"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2"/>
          </svg>
          Nouvelle conversation
        </button>
        
        <div id="new-chat-help" class="sr-only">
          Ouvre une fenêtre pour sélectionner un contact et démarrer une conversation
        </div>
      </div>
    </header>

    <div class="chat-container">
      <!-- Sidebar des conversations -->
      <aside 
        class="chat-sidebar"
        role="complementary"
        aria-label="Liste des conversations"
      >
        <div class="sidebar-header">
          <h2 id="conversations-title">Vos conversations</h2>
          <div 
            class="unread-summary"
            role="status"
            aria-live="polite"
            :aria-label="getUnreadSummary()"
          >
            <span v-if="totalUnreadCount > 0" class="unread-count">
              {{ totalUnreadCount }} non lu{{ totalUnreadCount > 1 ? 's' : '' }}
            </span>
          </div>
        </div>
        
        <nav 
          class="chat-list"
          role="navigation"
          aria-labelledby="conversations-title"
        >
          <ul class="chat-list-items" role="list">
            <li
              v-for="(chat, index) in chats"
              :key="chat.id"
              class="chat-item"
              :class="{ active: currentChatId === chat.id }"
              role="listitem"
            >
              <button
                @click="selectChat(chat.id)"
                @keydown="handleChatItemKeyDown($event, chat.id, index)"
                class="chat-item-button"
                :aria-label="getChatItemLabel(chat)"
                :aria-selected="currentChatId === chat.id"
                :aria-describedby="chat.unreadCount > 0 ? `chat-${chat.id}-unread` : undefined"
                type="button"
              >
                <div class="chat-item-content">
                  <div class="chat-item-header">
                    <span class="chat-item-name">{{ getDisplayName(chat) }}</span>
                    <span class="chat-item-time">{{ formatTime(chat.updatedAt) }}</span>
                  </div>
                  <div class="chat-item-preview">
                    <span class="chat-item-message">{{ getLastMessage(chat) }}</span>
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
                </div>
              </button>
            </li>
          </ul>
          
          <!-- Message si aucune conversation -->
          <div 
            v-if="chats.length === 0" 
            class="no-chats"
            role="status"
            aria-live="polite"
          >
            <p>Aucune conversation pour le moment</p>
            <button 
              class="start-chat-btn"
              @click="showNewChatModal = true"
              aria-label="Commencer votre première conversation"
              type="button"
            >
              Commencer une conversation
            </button>
          </div>
        </nav>
      </aside>

      <!-- Zone principale de conversation -->
      <main class="chat-main">
        <!-- Conversation active -->
        <section 
          v-if="currentChatId"
          class="chat-conversation"
          role="region"
          aria-label="Conversation en cours"
          :aria-describedby="'conversation-' + currentChatId + '-title'"
        >
          <!-- En-tête de conversation -->
          <header class="conversation-header">
            <h3 :id="'conversation-' + currentChatId + '-title'">
              Conversation avec {{ getCurrentChatDisplayName() }}
            </h3>
            <div class="conversation-status" role="status" aria-live="polite">
              <span v-if="isTyping" class="typing-indicator">
                {{ getCurrentChatDisplayName() }} est en train d'écrire...
              </span>
              <span v-else-if="lastSeen" class="last-seen">
                Vu {{ formatTime(lastSeen) }}
              </span>
            </div>
          </header>

          <!-- Messages -->
          <div 
            ref="messagesContainer"
            class="messages-container"
            role="log"
            aria-label="Historique des messages"
            aria-live="polite"
            aria-atomic="false"
            tabindex="0"
            @scroll="handleScroll"
          >
            <!-- Bouton de retour en haut -->
            <button
              v-if="showScrollToTop"
              @click="scrollToTop"
              class="scroll-to-top"
              aria-label="Retourner au début de la conversation"
              type="button"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M7 14l5-5 5 5" stroke="currentColor" stroke-width="2"/>
              </svg>
            </button>
            
            <!-- Indicateur de chargement -->
            <div 
              v-if="loadingMessages" 
              class="loading-indicator"
              role="status"
              aria-live="polite"
              aria-label="Chargement des messages en cours"
            >
              <div class="loading-spinner" aria-hidden="true"></div>
              <span class="sr-only">Chargement des messages...</span>
            </div>

            <!-- Messages -->
            <div
              v-for="(message, index) in messages"
              :key="message.id"
              class="message"
              :class="{ 'own-message': message.author === auth.user?.id }"
              role="article"
              :aria-label="getMessageLabel(message)"
              :aria-describedby="`message-${message.id}-meta`"
              tabindex="0"
              @keydown="handleMessageKeyDown($event, message, index)"
            >
              <div class="message-content">
                <div class="message-text">{{ message.content }}</div>
                <div 
                  :id="`message-${message.id}-meta`"
                  class="message-meta"
                  aria-label="Informations du message"
                >
                  <span class="message-time">{{ formatTime(message.sentAt) }}</span>
                  <span v-if="message.editedAt" class="message-edited">(modifié)</span>
                  <span v-if="message.author === auth.user?.id && message.readBy" class="message-read">
                    ✓✓
                  </span>
                </div>
              </div>
              
              <!-- Actions sur les messages (pour les messages de l'utilisateur) -->
              <div 
                v-if="message.author === auth.user?.id"
                class="message-actions"
                role="group"
                :aria-label="`Actions pour le message: ${message.content.substring(0, 50)}...`"
              >
                <button
                  @click="editMessage(message)"
                  class="message-action-btn edit-btn"
                  aria-label="Modifier ce message"
                  type="button"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="2"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </button>
                <button
                  @click="deleteMessage(message.id)"
                  class="message-action-btn delete-btn"
                  aria-label="Supprimer ce message"
                  type="button"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </button>
              </div>
            </div>
            
            <!-- Indicateur de frappe -->
            <div 
              v-if="isTyping" 
              class="typing-indicator-message"
              role="status"
              aria-live="polite"
              aria-label="Quelqu'un est en train d'écrire"
            >
              <div class="typing-dots" aria-hidden="true">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span class="sr-only">{{ getCurrentChatDisplayName() }} est en train d'écrire</span>
            </div>
          </div>

          <!-- Zone de saisie -->
          <footer class="message-input-container">
            <form 
              @submit.prevent="sendMessage"
              class="message-form"
              role="form"
              aria-label="Formulaire d'envoi de message"
            >
              <div class="message-input-wrapper">
                <label for="message-input" class="sr-only">
                  Tapez votre message à {{ getCurrentChatDisplayName() }}
                </label>
                <textarea
                  id="message-input"
                  ref="messageInput"
                  v-model="newMessage"
                  class="message-input"
                  :placeholder="`Message à ${getCurrentChatDisplayName()}...`"
                  rows="1"
                  maxlength="1000"
                  aria-label="Message à envoyer"
                  aria-describedby="message-help char-count"
                  @keydown="handleMessageInputKeyDown"
                  @input="handleTyping"
                ></textarea>
                
                <div id="message-help" class="sr-only">
                  Appuyez sur Entrée pour envoyer, Maj+Entrée pour une nouvelle ligne
                </div>
                
                <div 
                  id="char-count"
                  class="char-count"
                  :class="{ warning: newMessage.length > 900 }"
                  aria-live="polite"
                >
                  {{ newMessage.length }}/1000
                </div>
                
                <button
                  type="submit"
                  class="send-btn"
                  :disabled="!newMessage.trim() || sendingMessage"
                  :aria-label="sendingMessage ? 'Envoi en cours...' : 'Envoyer le message'"
                >
                  <svg v-if="!sendingMessage" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M2 12l20-8-8 20-4-9-9-4z" stroke="currentColor" stroke-width="2"/>
                  </svg>
                  <div v-else class="sending-spinner" aria-hidden="true"></div>
                </button>
              </div>
            </form>
          </footer>
        </section>

        <!-- Message d'accueil si aucune conversation sélectionnée -->
        <section 
          v-else
          class="welcome-message"
          role="region"
          aria-label="Message d'accueil"
        >
          <h2>Bienvenue dans votre messagerie</h2>
          <p>Sélectionnez une conversation dans la liste de gauche ou créez-en une nouvelle pour commencer à échanger.</p>
          <button 
            class="welcome-new-chat-btn"
            @click="showNewChatModal = true"
            aria-label="Créer votre première conversation"
            type="button"
          >
            Créer une conversation
          </button>
        </section>
      </main>
    </div>

    <!-- Toast de notifications -->
    <div 
      class="toast-container"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast"
        :class="toast.type"
        role="alert"
        :aria-describedby="`toast-${toast.id}-content`"
      >
        <div :id="`toast-${toast.id}-content`" class="toast-content">
          <div class="toast-message">{{ toast.message }}</div>
          <button 
            @click="removeToast(toast.id)"
            class="toast-close"
            aria-label="Fermer cette notification"
            type="button"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Les modales existantes restent inchangées... -->
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/auth';

const chatStore = useChatStore();
const auth = useAuthStore();

// État principal
const currentChatId = ref<string | null>(null);
const newMessage = ref('');
const showNewChatModal = ref(false);
const loadingMessages = ref(false);
const sendingMessage = ref(false);
const isTyping = ref(false);
const lastSeen = ref<Date | null>(null);
const showScrollToTop = ref(false);

// Système d'annonces pour l'accessibilité
const currentAnnouncement = ref('');
const criticalAlert = ref('');
const statusMessage = ref('');
const toasts = ref<Array<{ id: string; message: string; type: string }>>([]);

// Références des éléments
const messagesContainer = ref<HTMLElement | null>(null);
const messageInput = ref<HTMLTextAreaElement | null>(null);

// Données calculées
const chats = computed(() => chatStore.chats);
const messages = computed(() => chatStore.messages);
const totalUnreadCount = computed(() => {
  return chats.value.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
});

// Fonctions d'annonce pour les lecteurs d'écran
const announce = (message: string) => {
  currentAnnouncement.value = message;
  setTimeout(() => {
    currentAnnouncement.value = '';
  }, 3000);
};

const alertCritical = (message: string) => {
  criticalAlert.value = message;
  setTimeout(() => {
    criticalAlert.value = '';
  }, 5000);
};

const updateStatus = (message: string) => {
  statusMessage.value = message;
  setTimeout(() => {
    statusMessage.value = '';
  }, 2000);
};

const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
  const id = Math.random().toString(36).substr(2, 9);
  toasts.value.push({ id, message, type });
  
  // Auto-dismiss après 5 secondes
  setTimeout(() => {
    removeToast(id);
  }, 5000);
};

const removeToast = (id: string) => {
  const index = toasts.value.findIndex(t => t.id === id);
  if (index > -1) {
    toasts.value.splice(index, 1);
  }
};

// Méthodes utilitaires
const getDisplayName = (chat: any) => {
  const otherParticipant = chat.participants.find((p: any) => p !== auth.user?.id);
  const contact = chatStore.allowedContacts.find(c => c.id === otherParticipant);
  return contact?.name || 'Utilisateur inconnu';
};

const getCurrentChatDisplayName = () => {
  if (!currentChatId.value) return '';
  const chat = chats.value.find(c => c.id === currentChatId.value);
  return chat ? getDisplayName(chat) : '';
};

const getLastMessage = (chat: any) => {
  return chat.lastMessage || 'Aucun message';
};

const formatTime = (date: string | Date) => {
  return new Date(date).toLocaleTimeString('fr-FR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

const getChatItemLabel = (chat: any) => {
  const name = getDisplayName(chat);
  const lastMessage = getLastMessage(chat);
  const time = formatTime(chat.updatedAt);
  const unreadText = chat.unreadCount > 0 ? `, ${chat.unreadCount} messages non lus` : '';
  
  return `Conversation avec ${name}, dernier message: ${lastMessage}, ${time}${unreadText}`;
};

const getMessageLabel = (message: any) => {
  const isOwn = message.author === auth.user?.id;
  const author = isOwn ? 'Vous' : getCurrentChatDisplayName();
  const time = formatTime(message.sentAt);
  const editedText = message.editedAt ? ', modifié' : '';
  
  return `Message de ${author}, ${time}${editedText}: ${message.content}`;
};

const getUnreadSummary = () => {
  if (totalUnreadCount.value === 0) {
    return 'Aucun message non lu';
  } else if (totalUnreadCount.value === 1) {
    return '1 message non lu';
  } else {
    return `${totalUnreadCount.value} messages non lus`;
  }
};

// Gestion de la navigation clavier (identique à ChatModalContent)
const handleChatItemKeyDown = (e: KeyboardEvent, chatId: string, index: number) => {
  // ... navigation avec flèches, Enter, etc.
};

const handleMessageKeyDown = (e: KeyboardEvent, message: any, index: number) => {
  // ... navigation dans les messages
};

const handleMessageInputKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
};

// Gestion des actions
const selectChat = async (chatId: string) => {
  try {
    loadingMessages.value = true;
    updateStatus('Chargement de la conversation...');
    
    currentChatId.value = chatId;
    await chatStore.loadMessages(chatId);
    await chatStore.markAsRead(chatId);
    
    const chatName = getCurrentChatDisplayName();
    announce(`Conversation avec ${chatName} ouverte`);
    updateStatus('');
    
    // Focus sur le champ de saisie
    nextTick(() => {
      messageInput.value?.focus();
    });
  } catch (error) {
    alertCritical('Erreur lors du chargement de la conversation');
    showToast('Impossible de charger la conversation', 'error');
  } finally {
    loadingMessages.value = false;
  }
};

const sendMessage = async () => {
  if (!newMessage.value.trim() || !currentChatId.value || sendingMessage.value) return;
  
  try {
    sendingMessage.value = true;
    updateStatus('Envoi du message...');
    
    const messageContent = newMessage.value;
    await chatStore.send(currentChatId.value, messageContent);
    
    newMessage.value = '';
    announce('Message envoyé');
    updateStatus('');
    
    // Auto-resize du textarea
    if (messageInput.value) {
      messageInput.value.style.height = 'auto';
    }
    
    // Scroll vers le bas
    scrollToBottom();
  } catch (error) {
    alertCritical('Erreur lors de l\'envoi du message');
    showToast('Impossible d\'envoyer le message', 'error');
  } finally {
    sendingMessage.value = false;
  }
};

const handleTyping = () => {
  // Gérer l'indicateur de frappe
  // ... logique existante
};

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
};

const scrollToTop = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = 0;
    announce('Retour au début de la conversation');
  }
};

const handleScroll = () => {
  if (messagesContainer.value) {
    const { scrollTop, scrollHeight, clientHeight } = messagesContainer.value;
    showScrollToTop.value = scrollTop > 200;
  }
};

// Watchers pour les annonces automatiques
watch(messages, (newMessages, oldMessages) => {
  if (newMessages.length > (oldMessages?.length || 0)) {
    const lastMessage = newMessages[newMessages.length - 1];
    if (lastMessage && lastMessage.author !== auth.user?.id) {
      announce(`Nouveau message de ${getCurrentChatDisplayName()}: ${lastMessage.content}`);
    }
  }
});

watch(totalUnreadCount, (newCount, oldCount) => {
  if (newCount > (oldCount || 0)) {
    const diff = newCount - (oldCount || 0);
    announce(`${diff} nouveau${diff > 1 ? 'x' : ''} message${diff > 1 ? 's' : ''} reçu${diff > 1 ? 's' : ''}`);
  }
});

// Lifecycle
onMounted(async () => {
  await chatStore.init();
  await chatStore.loadAllowedContacts();
  announce('Interface de messagerie chargée');
});
</script>

<style scoped>
/* ... styles existants ... */

/* Nouvelles classes pour l'accessibilité */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.char-count {
  font-size: 0.8rem;
  color: #6c757d;
  margin-left: 8px;
}

.char-count.warning {
  color: #dc3545;
  font-weight: 600;
}

.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.loading-spinner,
.sending-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.typing-indicator-message {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  margin: 8px 0;
}

.typing-dots {
  display: flex;
  gap: 4px;
}

.typing-dots span {
  width: 6px;
  height: 6px;
  background: #6c757d;
  border-radius: 50%;
  animation: typing 1.4s infinite ease-in-out;
}

.typing-dots span:nth-child(1) { animation-delay: -0.32s; }
.typing-dots span:nth-child(2) { animation-delay: -0.16s; }

@keyframes typing {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

.scroll-to-top {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(0, 123, 255, 0.9);
  color: white;
  border: none;
  padding: 8px;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transition: all 0.2s ease;
  z-index: 10;
}

.scroll-to-top:hover {
  background: rgba(0, 86, 179, 0.9);
  transform: translateY(-2px);
}

.scroll-to-top:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8);
}

.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1050;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.toast {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 300px;
  max-width: 400px;
  padding: 0;
  border-left: 4px solid;
  animation: slideIn 0.3s ease-out;
}

.toast.success {
  border-left-color: #28a745;
}

.toast.error {
  border-left-color: #dc3545;
}

.toast.info {
  border-left-color: #007bff;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.toast-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px;
}

.toast-message {
  flex: 1;
  font-size: 0.9rem;
  line-height: 1.4;
}

.toast-close {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: #6c757d;
  border-radius: 4px;
  margin-left: 12px;
  transition: all 0.2s ease;
}

.toast-close:hover {
  background: #f8f9fa;
  color: #495057;
}

.toast-close:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.5);
}

/* Accessibilité - animations réduites */
@media (prefers-reduced-motion: reduce) {
  .loading-spinner,
  .sending-spinner,
  .typing-dots span {
    animation: none;
  }
  
  .toast {
    animation: none;
  }
  
  .scroll-to-top:hover {
    transform: none;
  }
}

/* Accessibilité - contraste élevé */
@media (prefers-contrast: high) {
  .toast {
    border: 2px solid #000;
  }
  
  .scroll-to-top:focus {
    box-shadow: 0 0 0 3px #000;
  }
}
</style>
