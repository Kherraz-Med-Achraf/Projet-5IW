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
