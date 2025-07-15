<template>
  <div 
    v-if="shouldShow" 
    class="pending-signatures-badge"
    :class="{ 'has-pending': pendingCount > 0 }"
    role="status"
    :aria-label="`${pendingCount} document${pendingCount > 1 ? 's' : ''} en attente de signature`"
  >
    <div class="badge-content">
      <i class="material-icons" aria-hidden="true">
        {{ pendingCount > 0 ? 'pending_actions' : 'check_circle' }}
      </i>
      <div class="badge-text">
        <span class="count" v-if="pendingCount > 0">{{ pendingCount }}</span>
        <span class="label">
          {{ pendingCount === 0 ? 'Aucune signature en attente' : 
             pendingCount === 1 ? 'signature en attente' : 
             'signatures en attente' }}
        </span>
      </div>
      <button 
        v-if="pendingCount > 0 && showViewButton"
        @click="handleViewClick"
        class="view-button"
        type="button"
        :aria-label="`Voir les ${pendingCount} documents en attente de signature`"
      >
        <i class="material-icons" aria-hidden="true">arrow_forward</i>
        Voir
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useDocumentStore } from '@/stores/documentStore'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

interface Props {
  showViewButton?: boolean
  autoRefresh?: boolean
  refreshInterval?: number // en millisecondes
}

const props = withDefaults(defineProps<Props>(), {
  showViewButton: true,
  autoRefresh: true,
  refreshInterval: 30000, // 30 secondes par défaut
})

const emit = defineEmits<{
  click: [count: number]
  view: [count: number]
}>()

const documentStore = useDocumentStore()
const authStore = useAuthStore()
const router = useRouter()

// Computed properties
const pendingCount = computed(() => documentStore.pendingSignaturesCount)
const shouldShow = computed(() => {
  return authStore.user?.role === 'PARENT' && authStore.isAuthenticated
})

// Auto-refresh
let refreshTimer: ReturnType<typeof setInterval> | null = null

const startAutoRefresh = () => {
  if (props.autoRefresh && shouldShow.value) {
    refreshTimer = setInterval(() => {
      documentStore.fetchPendingSignaturesCount()
    }, props.refreshInterval)
  }
}

const stopAutoRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

// Event handlers
const handleViewClick = () => {
  emit('view', pendingCount.value)
  // Navigation vers la page des documents avec filtre signatures en attente
  router.push('/documents?filter=pending-signatures')
}

const handleBadgeClick = () => {
  emit('click', pendingCount.value)
  if (pendingCount.value > 0) {
    handleViewClick()
  }
}

// Lifecycle
onMounted(async () => {
  if (shouldShow.value) {
    await documentStore.fetchPendingSignaturesCount()
    startAutoRefresh()
  }
})

onUnmounted(() => {
  stopAutoRefresh()
})

// Expose refresh method for manual calls
defineExpose({
  refresh: () => documentStore.fetchPendingSignaturesCount(),
  startAutoRefresh,
  stopAutoRefresh,
})
</script>

<style scoped>
.pending-signatures-badge {
  background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
  border: 2px solid #d1d5db;
  border-radius: 12px;
  padding: 16px;
  margin: 12px 0;
  transition: all 0.3s ease;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.pending-signatures-badge:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.pending-signatures-badge.has-pending {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-color: #f59e0b;
  animation: pulse-subtle 2s infinite;
}

.pending-signatures-badge.has-pending:hover {
  background: linear-gradient(135deg, #fde68a 0%, #fcd34d 100%);
}

@keyframes pulse-subtle {
  0%, 100% {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05), 0 0 0 0 rgba(245, 158, 11, 0.1);
  }
  50% {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1), 0 0 0 4px rgba(245, 158, 11, 0.2);
  }
}

.badge-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.badge-content .material-icons {
  font-size: 24px;
  color: #6b7280;
  flex-shrink: 0;
}

.has-pending .badge-content .material-icons {
  color: #f59e0b;
}

.badge-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.count {
  font-size: 1.5rem;
  font-weight: 700;
  color: #f59e0b;
  line-height: 1;
}

.label {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
}

.has-pending .label {
  color: #92400e;
}

.view-button {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #f59e0b;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.view-button:hover {
  background: #d97706;
  transform: translateX(2px);
}

.view-button:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.3);
}

.view-button .material-icons {
  font-size: 16px;
}

/* Responsive */
@media (max-width: 768px) {
  .pending-signatures-badge {
    padding: 12px;
    margin: 8px 0;
  }
  
  .badge-content {
    gap: 8px;
  }
  
  .badge-content .material-icons {
    font-size: 20px;
  }
  
  .count {
    font-size: 1.25rem;
  }
  
  .label {
    font-size: 0.8rem;
  }
  
  .view-button {
    padding: 6px 10px;
    font-size: 0.8rem;
  }
}

/* Mode sombre (si supporté) */
@media (prefers-color-scheme: dark) {
  .pending-signatures-badge {
    background: linear-gradient(135deg, #374151 0%, #4b5563 100%);
    border-color: #6b7280;
  }
  
  .badge-content .material-icons {
    color: #d1d5db;
  }
  
  .label {
    color: #d1d5db;
  }
  
  .pending-signatures-badge.has-pending {
    background: linear-gradient(135deg, #92400e 0%, #b45309 100%);
    border-color: #f59e0b;
  }
  
  .has-pending .label {
    color: #fde68a;
  }
}

/* Accessibilité */
@media (prefers-reduced-motion: reduce) {
  .pending-signatures-badge {
    animation: none;
    transition: none;
  }
  
  .view-button:hover {
    transform: none;
  }
}

/* États focus pour navigation clavier */
.pending-signatures-badge:focus-within {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}
</style> 