<template>
  <div class="chat-wrapper" role="main" aria-label="Interface de messagerie">
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

    <!-- Container principal avec espacement correct -->
    <main class="profile-container" role="main" lang="fr" id="main-content">
      <div class="profile-content">
        <div class="content-grid">
          
          <!-- En-tête principal moderne -->
          <div class="chat-header">
            <div class="header-content">
              <div class="title-section">
                <div class="chat-icon">
                  <i class="material-icons">chat</i>
                </div>
                <div class="title-info">
                  <h1 style="color: white;">Messagerie</h1>
                  <p class="subtitle" v-if="chats.length > 0">{{ chats.length }} conversation{{ chats.length > 1 ? 's' : '' }}</p>
                </div>
              </div>
              
              <!-- Indicateur de messages non lus -->
              <div v-if="totalUnreadCount > 0" class="status-indicator">
                <i class="material-icons">notifications</i>
                <span>{{ totalUnreadCount }} message{{ totalUnreadCount > 1 ? 's' : '' }} non lu{{ totalUnreadCount > 1 ? 's' : '' }}</span>
              </div>
            </div>
          </div>

          <!-- Container du chat -->
          <div class="chat-container">
            <!-- Sidebar des conversations -->
            <aside 
              class="chat-sidebar"
              role="complementary"
              aria-label="Liste des conversations"
            >
              <div class="sidebar-header">
                <button 
                  class="new-chat-btn"
                  @click="openNewChatModal"
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
                      <div class="chat-avatar" :style="{ background: getContactColor(getOtherParticipantId(chat)) }">
                        {{ getContactInitials(getDisplayName(chat)) }}
                      </div>
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
                    @click="openNewChatModal"
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
                    :class="{ 'own-message': message.authorId === auth.user?.id }"
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
                        <span v-if="message.authorId === auth.user?.id && message.readBy" class="message-read">
                          ✓✓
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- Indicateur de frappe -->
                  <div 
                    v-if="isTyping" 
                    class="typing-indicator-container"
                    role="status"
                    aria-live="polite"
                  >
                    <div class="typing-indicator">
                      <div class="typing-dots" aria-hidden="true">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Zone de saisie -->
                <div class="message-input-wrapper">
                  <div class="message-input-container">
                    <textarea
                      ref="messageInput"
                      v-model="newMessage"
                      @keydown="handleMessageInputKeyDown"
                      class="message-input"
                      placeholder="Tapez votre message..."
                      rows="1"
                      aria-label="Saisir un message"
                      aria-describedby="message-input-help"
                    ></textarea>
                    <div id="message-input-help" class="sr-only">
                      Appuyez sur Entrée pour envoyer, Maj+Entrée pour nouvelle ligne
                    </div>
                    <button
                      v-if="!sendingMessage"
                      @click="sendMessage"
                      :disabled="!newMessage.trim()"
                      class="send-button"
                      aria-label="Envoyer le message"
                      type="button"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" stroke-width="2"/>
                      </svg>
                    </button>
                    <div v-else class="sending-spinner" aria-hidden="true"></div>
                  </div>
                </div>
              </section>

              <!-- Message d'accueil -->
              <section v-else class="welcome-message">
                <h2>Bienvenue dans la messagerie</h2>
                <p>Sélectionnez une conversation ou créez-en une nouvelle pour commencer</p>
                <button 
                  class="new-chat-btn"
                  @click="openNewChatModal"
                  aria-label="Créer une nouvelle conversation"
                  type="button"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2"/>
                  </svg>
                  Créer une conversation
                </button>
              </section>
            </main>
          </div>
        </div>
      </div>
    </main>

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

    <!-- Modal Nouvelle conversation -->
    <div 
      v-if="showNewChatModal" 
      class="modal-overlay" 
      @click.self="closeNewChatModal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-chat-modal-title"
      aria-describedby="new-chat-modal-description"
    >
      <div class="modal">
        <header class="modal-header">
          <h2 id="new-chat-modal-title">Nouvelle conversation</h2>
          <button
            @click="closeNewChatModal"
            class="modal-close-btn"
            aria-label="Fermer la modal"
            type="button"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>
        </header>
        
        <div id="new-chat-modal-description" class="sr-only">
          Sélectionnez un contact pour démarrer une nouvelle conversation
        </div>
        
        <div class="modal-body">
          <div v-if="chatStore.contacts.length === 0" class="no-contacts">
            <p>Aucun contact disponible pour le moment.</p>
          </div>
          
          <ul v-else class="contacts-list" role="list">
            <li 
              v-for="contact in chatStore.contacts" 
              :key="contact.id" 
              class="contact-item"
              role="listitem"
            >
              <div class="contact-info">
                <span 
                  class="contact-avatar"
                  :style="{ background: getContactColor(contact.id) }"
                  aria-hidden="true"
                >
                  {{ getContactInitials(contact.name) }}
                </span>
                <div class="contact-details">
                  <span class="contact-name">{{ contact.name }}</span>
                  <span class="contact-role">({{ translateRole(contact.role) }})</span>
                </div>
              </div>
              <button 
                class="start-chat-btn"
                @click="startNewChat(contact.id)"
                :aria-label="`Démarrer une conversation avec ${contact.name}`"
                type="button"
              >
                Démarrer
              </button>
            </li>
          </ul>
        </div>
        
        <footer class="modal-footer">
          <button 
            class="modal-cancel-btn" 
            @click="closeNewChatModal"
            type="button"
          >
            Annuler
          </button>
        </footer>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/auth';
import { initials, colorFromId } from '@/utils/avatar';

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
const messages = computed(() => {
  if (!currentChatId.value) return [];
  return chatStore.messages[currentChatId.value] || [];
});
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
  const contact = chatStore.contacts.find(c => c.id === otherParticipant);
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
  const isOwn = message.authorId === auth.user?.id;
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
    await chatStore.fetchMessages(chatId);
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
    if (lastMessage && lastMessage.authorId !== auth.user?.id) {
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

// Gestion des modales
const openNewChatModal = async () => {
  try {
    await chatStore.fetchContacts();
    showNewChatModal.value = true;
  } catch (error) {
    alertCritical('Erreur lors du chargement des contacts');
    showToast('Impossible de charger les contacts', 'error');
  }
};

// Fonctions utilitaires pour la modal
const closeNewChatModal = () => {
  showNewChatModal.value = false;
};

const startNewChat = async (contactId: string) => {
  try {
    await chatStore.createChatWith(contactId);
    closeNewChatModal();
    announce('Nouvelle conversation créée');
    showToast('Conversation créée avec succès', 'success');
  } catch (error) {
    alertCritical('Erreur lors de la création de la conversation');
    showToast('Impossible de créer la conversation', 'error');
  }
};

const translateRole = (role: string) => {
  const roleTranslations: Record<string, string> = {
    'DIRECTOR': 'Directeur',
    'SERVICE_MANAGER': 'Chef de service', 
    'SECRETARY': 'Secrétaire',
    'STAFF': 'Educateur',
    'PARENT': 'Parent'
  };
  return roleTranslations[role] || role;
};

const getContactInitials = (name: string) => {
  return initials(name);
};

const getContactColor = (contactId: string) => {
  return colorFromId(contactId);
};

const getOtherParticipantId = (chat: any) => {
  return chat.participants.find((p: any) => p !== auth.user?.id) || '';
};

// Lifecycle
onMounted(async () => {
  try {
    await chatStore.init();
  } catch (error) {
    alertCritical('Erreur lors de l\'initialisation du chat');
    showToast('Impossible d\'initialiser le chat', 'error');
  }
});
</script>

<style scoped>
/* =================== WRAPPER ET CONTAINERS =================== */
.chat-wrapper {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Container */
.profile-container {
  min-height: 100vh;
  background-color: #f8fafc;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  flex: 1;
}

/* Surcharge des styles globaux pour la largeur complète */
:deep(.profile-content) {
  max-width: none !important;
  width: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
  flex: 1;
  display: flex;
  flex-direction: column;
}

:deep(.content-grid) {
  gap: 1.5rem !important;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.chat-view {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #f8fafc 0%, #e9ecef 100%);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* =================== HEADER MODERNE =================== */
.chat-header {
  background: #4444ac;
  border-radius: 1.5rem;
  padding: 2.5rem 2rem;
  color: white;
  box-shadow: 0 10px 30px rgba(68, 68, 172, 0.3);
  margin: 0 1rem;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.title-section {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.chat-icon {
  width: 4rem;
  height: 4rem;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.chat-icon i {
  font-size: 2rem;
  color: white;
}

.title-info h1 {
  margin: 0;
  font-size: 2.5rem;
  font-weight: 700;
  font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.subtitle {
  margin: 0.5rem 0 0 0;
  font-size: 1.1rem;
  opacity: 0.9;
  font-weight: 400;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-radius: 1rem;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  font-weight: 600;
  font-size: 0.9rem;
  background: rgba(251, 191, 36, 0.9);
  color: #92400e;
}

.chat-header-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.new-chat-btn {
  background: #4444ac;
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(68, 68, 172, 0.3);
  width: 100%;
  justify-content: center;
}

.new-chat-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(68, 68, 172, 0.4);
  background: #3a3a96;
}

.new-chat-btn:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(68, 68, 172, 0.3);
}

/* =================== CONTAINER PRINCIPAL =================== */
.chat-container {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 600px;
  margin: 0 1rem;
  background: white;
  border-radius: 1.5rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

/* =================== SIDEBAR =================== */
.chat-sidebar {
  width: 350px;
  background: white;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.05);
  height: 100%;
  min-height: 0;
}

.sidebar-header {
  padding: 20px 24px 12px 24px;
  border-bottom: 1px solid #f3f4f6;
  background: white;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.sidebar-header h2 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #374151;
  margin: 0;
}

.unread-summary {
  display: flex;
  align-items: center;
  gap: 8px;
}

.unread-count {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(245, 158, 11, 0.3);
}

/* =================== LISTE DES CHATS =================== */
.chat-list {
  flex: 1;
  overflow-y: auto;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  max-height: 500px;
  background: white;
}

.chat-list::-webkit-scrollbar {
  width: 6px;
}

.chat-list::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.chat-list::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.chat-list::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.chat-list-items {
  list-style: none;
  padding: 0;
  margin: 0;
  flex: 1;
}

.chat-item {
  list-style: none;
  margin: 0;
  padding: 0;
}

.chat-item-button {
  width: 100%;
  padding: 16px 24px;
  border: none;
  background: white;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 1px solid #f3f4f6;
  display: flex;
  align-items: center;
  gap: 12px;
}

.chat-item-button:hover {
  background: #f8fafc;
}

.chat-item-button:focus {
  outline: none;
  background: #eff6ff;
  border-left: 4px solid #3b82f6;
}

.chat-item.active .chat-item-button {
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border-left: 4px solid #3b82f6;
}

.chat-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 1rem;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.chat-item-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.chat-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chat-item-name {
  font-weight: 600;
  color: #1f2937;
  font-size: 0.95rem;
}

.chat-item-time {
  font-size: 0.8rem;
  color: #6b7280;
}

.chat-item-preview {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chat-item-message {
  font-size: 0.85rem;
  color: #6b7280;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.no-chats {
  padding: 40px 24px;
  text-align: center;
  color: #6b7280;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.no-chats h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.no-chats p {
  font-size: 0.9rem;
  line-height: 1.5;
  margin-bottom: 20px;
}

.start-chat-btn {
  background: #4444ac;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(68, 68, 172, 0.3);
}

.start-chat-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(68, 68, 172, 0.4);
  background: #3a3a96;
}

.start-chat-btn:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(68, 68, 172, 0.3);
}

/* =================== ZONE PRINCIPALE =================== */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: white;
  min-width: 0;
  height: 100%;
}

/* =================== ZONE DES MESSAGES =================== */
.chat-conversation {
  flex: 1;
  background: white;
  display: flex;
  flex-direction: column;
  position: relative;
  height: 100%;
  min-height: 0;
  max-height: 750px;
}

.conversation-header {
  padding: 16px 24px;
  border-bottom: 1px solid #e5e7eb;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.conversation-header h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.conversation-status {
  font-size: 0.85rem;
  color: #6b7280;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #f8fafc;
  scroll-behavior: smooth;
  min-height: 250px;
  max-height: 550px;
}

.messages-container::-webkit-scrollbar {
  width: 6px;
}

.messages-container::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.messages-container::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.messages-container::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* =================== MESSAGES =================== */
.message {
  margin-bottom: 16px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.message.own-message {
  flex-direction: row-reverse;
}

.message-content {
  max-width: 70%;
  position: relative;
}

.message.own-message .message-content {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  border-radius: 20px 20px 4px 20px;
  padding: 12px 16px;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.message:not(.own-message) .message-content {
  background: white;
  color: #1f2937;
  border-radius: 20px 20px 20px 4px;
  padding: 12px 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}

.message-text {
  font-size: 0.9rem;
  line-height: 1.4;
  word-wrap: break-word;
}

.message-meta {
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem;
}

.message.own-message .message-meta {
  color: rgba(255, 255, 255, 0.8);
}

.message:not(.own-message) .message-meta {
  color: #6b7280;
}

.message-time {
  font-size: 0.75rem;
}

.message-edited {
  font-style: italic;
  opacity: 0.8;
}

.message-read {
  color: #10b981;
  font-weight: 600;
}

/* =================== ACTIONS SUR LES MESSAGES =================== */
.message-actions {
  display: flex;
  gap: 4px;
  margin-top: 8px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.message:hover .message-actions {
  opacity: 1;
}

.message-action-btn {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #e5e7eb;
  padding: 6px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #6b7280;
}

.message-action-btn:hover {
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.edit-btn:hover {
  color: #3b82f6;
  border-color: #3b82f6;
}

.delete-btn:hover {
  color: #ef4444;
  border-color: #ef4444;
}

/* =================== ZONE DE SAISIE =================== */
.message-input-wrapper {
  padding: 16px 24px;
  background: white;
  border-top: 1px solid #e5e7eb;
  flex-shrink: 0;
  margin-top: auto;
}

.message-input-container {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  padding: 0;
  background: transparent;
  border: none;
  transition: none;
}

.message-input-container:focus-within {
  border: none;
  background: transparent;
  box-shadow: none;
}

.message-input {
  flex: 1;
  border: none;
  background: white;
  font-size: 0.9rem;
  line-height: 1.4;
  resize: none;
  outline: none;
  color: #1f2937;
  min-height: 20px;
  max-height: 120px;
  font-family: inherit;
  padding: 8px 12px;
  border-radius: 12px;
  border: 1px solid #f3f4f6;
  transition: all 0.2s ease;
}

.message-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.message-input::placeholder {
  color: #9ca3af;
}

.send-button {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  padding: 10px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  height: 44px;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
}

.send-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
}

.send-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* =================== MESSAGE D'ACCUEIL =================== */
.welcome-message {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 60px 40px;
  background: linear-gradient(135deg, #f8fafc 0%, #e9ecef 100%);
}

.welcome-message h2 {
  font-size: 2rem;
  font-weight: 700;
  color: #4444ac;
  margin-bottom: 16px;
}

.welcome-message p {
  font-size: 1.1rem;
  color: #6b7280;
  line-height: 1.6;
  max-width: 500px;
  margin-bottom: 32px;
}

.welcome-new-chat-btn {
  background: #4444ac;
  color: white;
  border: none;
  padding: 14px 28px;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 16px rgba(68, 68, 172, 0.3);
}

.welcome-new-chat-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(68, 68, 172, 0.4);
  background: #3a3a96;
}

/* =================== INDICATEURS DE CHARGEMENT =================== */
.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: #6b7280;
  font-size: 0.9rem;
}

.loading-spinner,
.sending-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #f3f4f6;
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 8px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* =================== INDICATEUR DE FRAPPE =================== */
.typing-indicator-container {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: white;
  border-radius: 20px 20px 20px 4px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  max-width: 70%;
}

.typing-indicator {
  display: flex;
  gap: 4px;
}

.typing-dots {
  display: flex;
  gap: 4px;
}

.typing-dots span {
  width: 8px;
  height: 8px;
  background: #6b7280;
  border-radius: 50%;
  animation: typing 1.4s infinite ease-in-out;
}

.typing-dots span:nth-child(1) { animation-delay: -0.32s; }
.typing-dots span:nth-child(2) { animation-delay: -0.16s; }

@keyframes typing {
  0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
}

/* =================== BOUTON SCROLL TO TOP =================== */
.scroll-to-top {
  position: absolute;
  top: 20px;
  right: 20px;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  border: none;
  padding: 12px;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  transition: all 0.2s ease;
  z-index: 20;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.scroll-to-top:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
}

.scroll-to-top:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
}

/* =================== TOASTS =================== */
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1050;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.toast {
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  min-width: 320px;
  max-width: 420px;
  padding: 0;
  border-left: 4px solid;
  animation: slideIn 0.3s ease-out;
  backdrop-filter: blur(10px);
}

.toast.success {
  border-left-color: #10b981;
}

.toast.error {
  border-left-color: #ef4444;
}

.toast.info {
  border-left-color: #3b82f6;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(100%) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
}

.toast-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px 20px;
}

.toast-message {
  flex: 1;
  font-size: 0.9rem;
  line-height: 1.4;
  color: #1f2937;
  font-weight: 500;
}

.toast-close {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: #6b7280;
  border-radius: 6px;
  margin-left: 12px;
  transition: all 0.2s ease;
}

.toast-close:hover {
  background: #f3f4f6;
  color: #374151;
}

.toast-close:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
}

/* =================== UTILITAIRES D'ACCESSIBILITÉ =================== */
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

/* =================== RESPONSIVE =================== */
@media (max-width: 768px) {
  .chat-container {
    flex-direction: column;
  }
  
  .chat-sidebar {
    width: 100%;
    height: 40vh;
    border-right: none;
    border-bottom: 1px solid #e5e7eb;
  }
  
  .chat-messages {
    height: 60vh;
  }
  
  .message-content {
    max-width: 85%;
  }
  
  .welcome-message {
    padding: 40px 20px;
  }
  
  .welcome-message h2 {
    font-size: 1.5rem;
  }
  
  .welcome-message p {
    font-size: 1rem;
  }
}

/* =================== ACCESSIBILITÉ =================== */
@media (prefers-reduced-motion: reduce) {
  .loading-spinner,
  .sending-spinner,
  .typing-dots span {
    animation: none;
  }
  
  .toast {
    animation: none;
  }
  
  .scroll-to-top:hover,
  .send-button:hover,
  .new-chat-btn:hover {
    transform: none;
  }
}

@media (prefers-contrast: high) {
  .toast {
    border: 2px solid #000;
  }
  
  .scroll-to-top:focus,
  .send-button:focus,
  .new-chat-btn:focus {
    box-shadow: 0 0 0 3px #000;
  }
}

/* =================== FOCUS MANAGEMENT =================== */
*:focus {
  outline: none;
}

button:focus,
input:focus,
textarea:focus,
[tabindex]:focus {
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
}

/* =================== MODAL NOUVELLE CONVERSATION =================== */
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
  z-index: 1100;
  backdrop-filter: blur(4px);
}

.modal {
  background: white;
  border-radius: 16px;
  width: 90vw;
  max-width: 500px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
  animation: modalAppear 0.3s ease-out;
}

@keyframes modalAppear {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
  background: #f8fafc;
}

.modal-header h2 {
  font-size: 1.2rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.modal-close-btn {
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  color: #6b7280;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.modal-close-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.modal-close-btn:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
}

.modal-body {
  max-height: 400px;
  overflow-y: auto;
  padding: 16px 0;
}

.no-contacts {
  padding: 40px 24px;
  text-align: center;
  color: #6b7280;
}

.contacts-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.contact-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  transition: background 0.2s ease;
}

.contact-item:hover {
  background: #f8fafc;
}

.contact-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.contact-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 0.9rem;
  flex-shrink: 0;
}

.contact-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.contact-name {
  font-weight: 600;
  color: #1f2937;
  font-size: 0.95rem;
}

.contact-role {
  font-size: 0.8rem;
  color: #6b7280;
  font-style: italic;
}

.start-chat-btn {
  background: #4444ac;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(68, 68, 172, 0.3);
}

.start-chat-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(68, 68, 172, 0.4);
  background: #3a3a96;
}

.start-chat-btn:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(68, 68, 172, 0.3);
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
  background: #f8fafc;
  display: flex;
  justify-content: flex-end;
}

.modal-cancel-btn {
  background: #f3f4f6;
  color: #374151;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.modal-cancel-btn:hover {
  background: #e5e7eb;
}

.modal-cancel-btn:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
}
</style>
