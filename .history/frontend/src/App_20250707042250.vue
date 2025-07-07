<script setup lang="ts">
import { RouterView, useRoute } from "vue-router";
import { computed } from "vue";
import Sidebar from "@/components/Sidebar.vue";
import ChatWidget from "@/components/chat/ChatWidget.vue";
import { useAuthStore } from "@/stores/auth";

const route = useRoute();
const auth = useAuthStore();

// Déterminer si la barre latérale doit être affichée
const showSidebar = computed(() => {
  const path = route.path;
  
  // Masquer sur /dashboard, /login et toutes les pages /register
  if (
    path.startsWith("/dashboard") ||
    path.startsWith("/login") ||
    path.startsWith("/register")
  ) {
    return false;
  }
  
  // Masquer sur /privacy si pas connecté
  if (path === "/privacy" && !auth.isAuthenticated) {
    return false;
  }
  
  // Masquer la sidebar si l'utilisateur n'est pas connecté
  if (!auth.isAuthenticated) {
    return false;
  }
  
  return true;
});

</script>

<template>
  <div>
    <!-- Layout avec barre latérale -->
    <div v-if="showSidebar" class="dashboard">
      <Sidebar />

      <div class="main-content">
        <RouterView :key="route.name" />
      </div>
    </div>

    <!-- Layout sans barre latérale -->
    <div v-else>
      <RouterView :key="route.name" />
    </div>

    <!-- Widget de chat global -->
    <ChatWidget v-if="route.name !== 'Chat'" />
  </div>
</template>

<style scoped lang="scss">
.page-enter-active,
.page-leave-active {
  transition: opacity 0.3s ease;
}

.page-enter-from,
.page-leave-to {
  opacity: 0;
}

.dashboard {
  display: flex;
  height: 100vh;
  background-color: #f8fafc;
}

.main-content {
  flex: 1;
  overflow-y: auto;
}
</style>
