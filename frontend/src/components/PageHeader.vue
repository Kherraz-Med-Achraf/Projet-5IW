<template>
  <header class="page-header" role="banner">
    <div class="header-content">
      <div class="header-icon" v-if="icon" aria-hidden="true">
        <i class="material-icons">{{ icon }}</i>
      </div>
      <div class="header-text">
        <h1 class="page-title">{{ title }}</h1>
        <p v-if="subtitle" class="page-subtitle">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.actions" class="header-actions">
        <slot name="actions"></slot>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
interface Props {
  title: string
  subtitle?: string
  icon?: string
}

defineProps<Props>()
</script>

<style scoped>
.page-header {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  margin-bottom: 1.5rem;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.header-icon {
  background: linear-gradient(135deg, #4444ac 0%, #3a3a9a 100%);
  color: white;
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(68, 68, 172, 0.3);
}

.header-icon .material-icons {
  font-size: 2rem;
}

.header-text {
  flex: 1;
  min-width: 0;
}

.page-title {
  margin: 0 0 0.5rem 0;
  color: #1e293b;
  font-size: 1.875rem;
  font-weight: 700;
  line-height: 1.2;
}

.page-subtitle {
  margin: 0;
  color: #64748b;
  font-size: 1rem;
  line-height: 1.5;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

/* Responsive */
@media (max-width: 768px) {
  .page-header {
    padding: 1.5rem;
    margin-bottom: 1rem;
  }
  
  .header-content {
    flex-direction: column;
    text-align: center;
    gap: 1rem;
  }
  
  .header-icon {
    padding: 0.75rem;
  }
  
  .header-icon .material-icons {
    font-size: 1.5rem;
  }
  
  .page-title {
    font-size: 1.5rem;
  }
  
  .page-subtitle {
    font-size: 0.875rem;
  }
  
  .header-actions {
    justify-content: center;
    flex-wrap: wrap;
  }
}

@media (max-width: 480px) {
  .header-content {
    gap: 0.75rem;
  }
  
  .page-title {
    font-size: 1.25rem;
  }
  
  .header-actions {
    width: 100%;
  }
}
</style> 