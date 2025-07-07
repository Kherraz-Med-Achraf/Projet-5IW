<template>
  <div v-if="isAuthReady" class="auth-ready-wrapper">
    <slot />
  </div>
  <div v-else class="auth-loading">
    <div class="loading-spinner">
      <i class="material-icons spinning">hourglass_empty</i>
      <span>Chargement...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useRoute } from 'vue-router';

// Props
interface Props {
  waitForUser?: boolean;
  requiredRole?: string;
  requiredRoles?: string[];
}

const props = withDefaults(defineProps<Props>(), {
  waitForUser: true,
  requiredRole: undefined,
  requiredRoles: undefined,
});

// Emits
const emit = defineEmits<{
  authReady: [user: any];
}>();

// Stores
const authStore = useAuthStore();
const route = useRoute();

// Computed
const isAuthReady = computed(() => {
  // Si on n'attend pas l'utilisateur, toujours prêt
  if (!props.waitForUser) return true;
  
  // Vérifier que l'utilisateur existe
  if (!authStore.user) return false;
  
  // Vérifier le rôle requis si spécifié
  if (props.requiredRole && authStore.user.role !== props.requiredRole) {
    return false;
  }
  
  // Vérifier les rôles requis si spécifiés
  if (props.requiredRoles && !props.requiredRoles.includes(authStore.user.role)) {
    return false;
  }
  
  return true;
});

// Watcher pour émettre l'événement quand l'auth est prête
watch(
  isAuthReady,
  (ready) => {
    if (ready && authStore.user) {
      console.log('AuthReadyWrapper: Auth ready, emitting event');
      emit('authReady', authStore.user);
    }
  },
  { immediate: true }
);

// Lifecycle
onMounted(() => {
  console.log('AuthReadyWrapper: Mounted, auth ready:', isAuthReady.value);
});
</script>

<style scoped lang="scss">
.auth-ready-wrapper {
  width: 100%;
  height: 100%;
}

.auth-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  width: 100%;
}

.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  color: #6b7280;
  font-size: 0.875rem;
  font-weight: 500;

  .spinning {
    font-size: 2rem;
    animation: spin 1s linear infinite;
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style> 