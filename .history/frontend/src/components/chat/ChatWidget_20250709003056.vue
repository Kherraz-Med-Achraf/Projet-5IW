<template>
  <div class="chat-widget" v-if="auth.isAuthenticated">
    <!-- Bulle de chat flottante -->
    <div
      ref="chatBubble"
      class="chat-bubble"
      :class="{ 'dragging': isDragging }"
      :style="{ 
        left: position.x + 'px', 
        top: position.y + 'px',
        transform: isDragging ? 'scale(1.05)' : 'scale(1)'
      }"
      @mousedown="startDrag"
      @click="handleClick"
      role="button"
      tabindex="0"
      :aria-label="unreadCount > 0 ? `Ouvrir les messages (${unreadCount} non lus)` : 'Ouvrir les messages'"
      :aria-expanded="isModalOpen"
      :aria-haspopup="true"
      :aria-describedby="unreadCount > 0 ? 'chat-unread-description' : undefined"
      @keydown="handleKeyDown"
    >
      <!-- Icône de chat -->
      <svg 
        width="24" 
        height="24" 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4v3c0 .6.4 1 1 1 .2 0 .3 0 .5-.1l4.5-3H20c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"
          fill="currentColor"
        />
      </svg>
      
      <!-- Badge de notification -->
      <div 
        v-if="unreadCount > 0" 
        class="unread-badge"
        :aria-label="`${unreadCount} messages non lus`"
        role="status"
        aria-live="polite"
      >
        {{ unreadCount }}
      </div>
    </div>

    <!-- Description pour les lecteurs d'écran -->
    <div 
      v-if="unreadCount > 0" 
      id="chat-unread-description" 
      class="sr-only"
      aria-live="polite"
    >
      Vous avez {{ unreadCount }} nouveaux messages non lus
    </div>

    <!-- Modal de chat -->
    <div
      v-if="isModalOpen"
      class="chat-modal-overlay"
      @click="closeModal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="chat-modal-title"
      aria-describedby="chat-modal-description"
    >
      <div 
        class="chat-modal-content" 
        @click.stop
        ref="chatModalContent"
      >
        <!-- En-tête du modal -->
        <div class="chat-modal-header">
          <h2 id="chat-modal-title" class="chat-modal-title">
            Mes messages
          </h2>
          <button
            @click="closeModal"
            class="chat-modal-close"
            aria-label="Fermer les messages"
            type="button"
          >
            <svg 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </div>

        <!-- Description du modal pour les lecteurs d'écran -->
        <div id="chat-modal-description" class="sr-only">
          Interface de messagerie pour consulter et envoyer des messages
        </div>

        <!-- Contenu du chat -->
        <div class="chat-modal-body">
          <ChatModalContent 
            :aria-describedby="'chat-modal-description'"
            role="main"
            aria-label="Zone de conversation"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/auth';
import ChatModalContent from './ChatModalContent.vue';

const chatStore = useChatStore();
const auth = useAuthStore();

// État de drag and drop
const isDragging = ref(false);
const dragStartX = ref(0);
const dragStartY = ref(0);
const initialPosition = ref({ x: 0, y: 0 });
const hasMoved = ref(false);
const DRAG_THRESHOLD = 5;

// Position de la bulle
const position = ref({
  x: 20,
  y: window.innerHeight - 100
});

// État du modal
const isModalOpen = ref(false);
const chatBubble = ref<HTMLElement | null>(null);
const chatModalContent = ref<HTMLElement | null>(null);

// Compteur de messages non lus
const unreadCount = computed(() => {
  return chatStore.chats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
});

// Gestion du drag and drop
const startDrag = (e: MouseEvent) => {
  isDragging.value = true;
  dragStartX.value = e.clientX;
  dragStartY.value = e.clientY;
  initialPosition.value = { ...position.value };
  hasMoved.value = false;
  
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', stopDrag);
  
  e.preventDefault();
};

const handleMouseMove = (e: MouseEvent) => {
  if (!isDragging.value) return;
  
  const deltaX = e.clientX - dragStartX.value;
  const deltaY = e.clientY - dragStartY.value;
  
  // Vérifier si on a dépassé le seuil de drag
  if (Math.abs(deltaX) > DRAG_THRESHOLD || Math.abs(deltaY) > DRAG_THRESHOLD) {
    hasMoved.value = true;
  }
  
  // Calculer la nouvelle position
  const newX = initialPosition.value.x + deltaX;
  const newY = initialPosition.value.y + deltaY;
  
  // Contraintes de position
  const maxX = window.innerWidth - 60;
  const maxY = window.innerHeight - 60;
  
  position.value = {
    x: Math.max(0, Math.min(newX, maxX)),
    y: Math.max(0, Math.min(newY, maxY))
  };
};

const stopDrag = () => {
  isDragging.value = false;
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', stopDrag);
  
  // Snapping aux bords
  if (hasMoved.value) {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const bubbleWidth = 60;
    const bubbleHeight = 60;
    
    // Snap horizontal
    if (position.value.x < windowWidth / 2) {
      position.value.x = 20;
    } else {
      position.value.x = windowWidth - bubbleWidth - 20;
    }
    
    // Contraintes verticales
    if (position.value.y < 20) {
      position.value.y = 20;
    } else if (position.value.y > windowHeight - bubbleHeight - 20) {
      position.value.y = windowHeight - bubbleHeight - 20;
    }
  }
};

// Gestion des clics
const handleClick = () => {
  if (!hasMoved.value) {
    openModal();
  }
};

// Gestion du clavier
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    openModal();
  }
  
  // Navigation avec les flèches
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    e.preventDefault();
    moveBubbleWithKeyboard(e.key);
  }
};

// Déplacement au clavier
const moveBubbleWithKeyboard = (key: string) => {
  const step = 10;
  const newPosition = { ...position.value };
  
  switch (key) {
    case 'ArrowUp':
      newPosition.y = Math.max(0, newPosition.y - step);
      break;
    case 'ArrowDown':
      newPosition.y = Math.min(window.innerHeight - 60, newPosition.y + step);
      break;
    case 'ArrowLeft':
      newPosition.x = Math.max(0, newPosition.x - step);
      break;
    case 'ArrowRight':
      newPosition.x = Math.min(window.innerWidth - 60, newPosition.x + step);
      break;
  }
  
  position.value = newPosition;
};

// Gestion du modal
const openModal = () => {
  isModalOpen.value = true;
  
  // Focus sur le modal après l'ouverture
  setTimeout(() => {
    const firstFocusable = chatModalContent.value?.querySelector('button, input, textarea, select, [tabindex]:not([tabindex="-1"])');
    if (firstFocusable) {
      (firstFocusable as HTMLElement).focus();
    }
  }, 100);
};

const closeModal = () => {
  isModalOpen.value = false;
  
  // Remettre le focus sur la bulle
  setTimeout(() => {
    chatBubble.value?.focus();
  }, 100);
};

// Gestion du redimensionnement
const handleResize = () => {
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  const bubbleWidth = 60;
  const bubbleHeight = 60;
  
  // Ajuster la position si elle est hors écran
  if (position.value.x > windowWidth - bubbleWidth) {
    position.value.x = windowWidth - bubbleWidth - 20;
  }
  if (position.value.y > windowHeight - bubbleHeight) {
    position.value.y = windowHeight - bubbleHeight - 20;
  }
};

// Gestion des raccourcis clavier globaux
const handleGlobalKeyDown = (e: KeyboardEvent) => {
  // Échap pour fermer le modal
  if (e.key === 'Escape' && isModalOpen.value) {
    closeModal();
  }
  
  // Ctrl/Cmd + M pour ouvrir/fermer le chat
  if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
    e.preventDefault();
    if (isModalOpen.value) {
      closeModal();
    } else {
      openModal();
    }
  }
};

// Watcher pour surveiller l'état d'authentification
watch(
  () => auth.isAuthenticated,
  (isAuthenticated) => {
    if (isAuthenticated) {
      chatStore.init();
    } else {
      // Fermer le modal si l'utilisateur se déconnecte
      isModalOpen.value = false;
    }
  },
  { immediate: true }
);

// Lifecycle
onMounted(() => {
  window.addEventListener('resize', handleResize);
  document.addEventListener('keydown', handleGlobalKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  document.removeEventListener('keydown', handleGlobalKeyDown);
});
</script>

<style scoped>
.chat-widget {
  position: fixed;
  z-index: 1000;
  pointer-events: none;
}

.chat-bubble {
  position: fixed;
  width: 60px;
  height: 60px;
  background: #007bff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: white;
  box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
  transition: all 0.3s ease;
  pointer-events: auto;
  user-select: none;
  border: 2px solid transparent;
}

.chat-bubble:hover {
  background: #0056b3;
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(0, 123, 255, 0.4);
}

.chat-bubble:focus {
  outline: none;
  border-color: #ffffff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.5);
}

.chat-bubble.dragging {
  transform: scale(1.05);
  cursor: grabbing;
}

.unread-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  background: #dc3545;
  color: white;
  padding: 2px 6px;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 600;
  min-width: 18px;
  text-align: center;
  line-height: 1;
  box-shadow: 0 2px 4px rgba(220, 53, 69, 0.3);
}

.chat-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001;
  pointer-events: auto;
}

.chat-modal-content {
  background: white;
  border-radius: 12px;
  width: 90vw;
  height: 85vh;
  max-width: 800px;
  max-height: 600px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.chat-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e9ecef;
  background: #4444ac;
  color: white;
}

.chat-modal-title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: white;
}

.chat-modal-close {
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.8);
  border-radius: 6px;
  transition: all 0.2s ease;
}

.chat-modal-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.chat-modal-close:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.5);
}

.chat-modal-body {
  flex: 1;
  overflow: hidden;
}

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

/* Animations pour l'accessibilité */
@media (prefers-reduced-motion: reduce) {
  .chat-bubble {
    transition: none;
  }
  
  .chat-bubble:hover {
    transform: none;
  }
  
  .chat-bubble.dragging {
    transform: none;
  }
}

/* Contraste élevé */
@media (prefers-contrast: high) {
  .chat-bubble {
    border: 2px solid #000;
  }
  
  .chat-bubble:focus {
    border-color: #000;
    box-shadow: 0 0 0 3px #000;
  }
}
</style>
