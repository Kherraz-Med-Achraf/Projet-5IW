<template>
  <div class="page-header">
    <div class="header-content">
      <div class="title-section">
        <div class="page-icon">
          <i class="material-icons">{{ icon }}</i>
        </div>
        <div class="title-info">
          <h1>{{ title }}</h1>
          <p v-if="subtitle" class="subtitle">{{ subtitle }}</p>
        </div>
      </div>
      
      <!-- Indicateur de statut optionnel -->
      <div v-if="statusText" class="status-indicator" :class="statusClass">
        <i class="material-icons">{{ statusIcon }}</i>
        <span>{{ statusText }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title: string
  subtitle?: string
  icon: string
  statusText?: string
  statusIcon?: string
  statusClass?: string
}

withDefaults(defineProps<Props>(), {
  subtitle: '',
  statusText: '',
  statusIcon: 'info',
  statusClass: 'status-default'
})
</script>

<style scoped>
/* ===== HEADER MODERNE RÉUTILISABLE ===== */
.page-header {
  background: #4444ac;
  border-radius: 1.5rem;
  padding: 2.5rem 2rem;
  color: white;
  box-shadow: 0 10px 30px rgba(68, 68, 172, 0.3);
  margin-bottom: 2rem;
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

.page-icon {
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

.page-icon i {
  font-size: 2rem;
  color: white;
}

.title-info h1 {
  margin: 0;
  font-size: 2.5rem;
  font-weight: 700;
  color: white;
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
}

/* Classes de statut */
.status-default {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.status-pending {
  background: rgba(251, 191, 36, 0.9);
  color: #92400e;
}

.status-validated {
  background: rgba(52, 211, 153, 0.9);
  color: #047857;
}

.status-info {
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border: 1px solid #bfdbfe;
  color: #1e40af;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 0.75rem;
}

.status-info i {
  color: #3b82f6;
  font-size: 1.1rem;
  flex-shrink: 0;
}

.status-warning {
  background: rgba(251, 191, 36, 0.9);
  color: #92400e;
}

.status-success {
  background: rgba(52, 211, 153, 0.9);
  color: #047857;
}

/* Responsive Design */
@media (max-width: 768px) {
  .page-header {
    padding: 2rem 1.5rem;
  }
  
  .header-content {
    flex-direction: column;
    text-align: center;
  }
  
  .title-info h1 {
    font-size: 2rem;
  }
  
  .page-icon {
    width: 3rem;
    height: 3rem;
  }
  
  .page-icon i {
    font-size: 1.5rem;
  }
  
  .status-indicator {
    padding: 0.75rem 1rem;
    font-size: 0.8rem;
  }
}

@media (max-width: 480px) {
  .page-header {
    padding: 1.5rem 1rem;
  }
  
  .title-info h1 {
    font-size: 1.75rem;
  }
}
</style> 