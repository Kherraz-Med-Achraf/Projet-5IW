<template>
  <!-- Floating Chat Launcher Button - Draggable -->
  <div 
    class="chat-launcher" 
    :class="{ dragging: isDragging }"
    :style="{ left: position.x + 'px', top: position.y + 'px' }"
    @mousedown="startDrag"
    @click="handleClick"
    :title="launcherTitle"
  >
    💬
    <span v-if="totalUnread > 0" class="badge">{{ totalUnread }}</span>
  </div>

  <!-- Mini Chat Modal -->
  <div v-if="showChatModal" class="chat-modal-overlay" @click.self="closeChatModal">
    <div class="chat-modal">
      <div class="modal-header">
        <h3>Messages</h3>
        <button class="close-btn" @click="closeChatModal">×</button>
      </div>
      <div class="modal-body">
        <ChatView />
      </div>
    </div>
  </div>


</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick, onMounted, onUnmounted } from "vue";
import { useChatStore } from "@/stores/chatStore";
import { useAuthStore } from "@/stores/auth";
import { colorFromId, initials } from "@/utils/avatar";
import ChatView from "@/views/chat/ChatView.vue";

const chatStore = useChatStore();
const auth = useAuthStore();

const showChatModal = ref(false);
const userId = auth.user?.id || "";

// Drag and Drop functionality
const isDragging = ref(false);
const dragStart = reactive({ x: 0, y: 0 });
const position = reactive({ 
  x: 24, // Position initiale (bottom-left)
  y: window.innerHeight - 80 // 80px du bas
});

// Mettre à jour la position Y quand la fenêtre se redimensionne
const updatePosition = () => {
  if (position.y > window.innerHeight - 80) {
    position.y = window.innerHeight - 80;
  }
};

onMounted(() => {
  // init du chat (idempotent)
  chatStore.init();
  
  // Écouter le redimensionnement de la fenêtre
  window.addEventListener('resize', updatePosition);
  
  // Écouter les événements de souris globaux
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
});

// Nettoyage des event listeners
onUnmounted(() => {
  window.removeEventListener('resize', updatePosition);
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('mouseup', onMouseUp);
});

const totalUnread = computed(() =>
  chatStore.chats.reduce((sum, c) => sum + (c.unreadCount || 0), 0)
);
const launcherTitle = computed(() =>
  totalUnread.value ? `${totalUnread.value} nouveaux messages` : "Messages"
);



// Fonctions pour la modale de chat
function toggleChatModal() {
  showChatModal.value = !showChatModal.value;
}

function closeChatModal() {
  showChatModal.value = false;
}

function handleClick(event: MouseEvent) {
  // Ne pas ouvrir le menu si on vient de finir un drag
  if (isDragging.value) return;
  
  // Petit délai pour éviter les clics accidentels après drag
  setTimeout(() => {
    if (!isDragging.value) {
      toggleChatModal();
    }
  }, 10);
}



// Drag and Drop functions
function startDrag(event: MouseEvent) {
  isDragging.value = true;
  dragStart.x = event.clientX - position.x;
  dragStart.y = event.clientY - position.y;
  
  // Empêcher la sélection de texte pendant le drag
  event.preventDefault();
}

function onMouseMove(event: MouseEvent) {
  if (!isDragging.value) return;
  
  const newX = event.clientX - dragStart.x;
  const newY = event.clientY - dragStart.y;
  
  // Limiter la position dans les limites de l'écran
  const maxX = window.innerWidth - 56; // 56px = taille de la bulle
  const maxY = window.innerHeight - 56;
  
  position.x = Math.max(0, Math.min(newX, maxX));
  position.y = Math.max(0, Math.min(newY, maxY));
}

function onMouseUp() {
  if (isDragging.value) {
    isDragging.value = false;
    
    // Optionnel : faire "coller" la bulle sur les bords comme Messenger
    const threshold = 20; // Distance du bord pour "coller"
    const centerX = window.innerWidth / 2;
    
    if (position.x < threshold) {
      position.x = 0; // Coller à gauche
    } else if (position.x > window.innerWidth - 56 - threshold) {
      position.x = window.innerWidth - 56; // Coller à droite
    }
  }
}
</script>

<style scoped>
.chat-launcher {
  position: fixed;
  width: 56px;
  height: 56px;
  background: #007bff;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  cursor: grab;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  transition: box-shadow 0.2s ease, transform 0.1s ease;
  user-select: none; /* Empêcher la sélection de texte */
}

.chat-launcher:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
}

.chat-launcher.dragging {
  cursor: grabbing;
  transform: scale(1.1);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.5);
  transition: none; /* Pas de transition pendant le drag */
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

/* Mini Chat Modal Styles */
.chat-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001;
}

.chat-modal {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  width: 90vw;
  max-width: 1200px;
  height: 85vh;
  max-height: 700px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e9ecef;
  background: #f8f9fa;
  border-radius: 12px 12px 0 0;
}

.modal-header h3 {
  margin: 0;
  color: #2c3e50;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #6c757d;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: #e9ecef;
  color: #495057;
}

.modal-body {
  flex: 1;
  overflow: hidden;
}
</style>
