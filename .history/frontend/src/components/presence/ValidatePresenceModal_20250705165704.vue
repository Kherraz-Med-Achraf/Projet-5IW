<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="closeModal">
    <div class="modal-content">
      <div class="modal-header">
        <h4>
          <i class="material-icons">event</i>
          Validation de l'appel
        </h4>
        <button class="close-btn" @click="closeModal">×</button>
      </div>

      <div class="modal-body">
        <div class="warning-message">
          <div class="warning-icon">
            <i class="material-icons">warning</i>
          </div>
          <div class="warning-content">
            <p><strong>Attention :</strong> Une fois validé, vous ne pourrez plus modifier la feuille de présence.</p>
            <p>Assurez-vous que toutes les informations sont correctes avant de confirmer.</p>
          </div>
        </div>

        <div class="form-actions">
          <button type="button" class="btn-secondary" @click="closeModal">
            <i class="material-icons">close</i>
            Annuler
          </button>
          <button type="button" class="btn-primary" @click="confirmValidation" :disabled="loading">
            <i class="material-icons">
              {{ loading ? 'hourglass_empty' : 'check_circle' }}
            </i>
            {{ loading ? 'Validation en cours...' : 'Confirmer la validation' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

/* ─────────────────────────────────────────────────────────────────────────── */
/*                                   Props                                     */
/* ─────────────────────────────────────────────────────────────────────────── */
interface Props {
  isOpen: boolean
  presentCount: number
  absentCount: number
  totalCount: number
  date: string
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

/* ─────────────────────────────────────────────────────────────────────────── */
/*                                   Emits                                     */
/* ─────────────────────────────────────────────────────────────────────────── */
const emit = defineEmits<{
  close: []
  confirm: []
}>()

/* ─────────────────────────────────────────────────────────────────────────── */
/*                                 Computed                                    */
/* ─────────────────────────────────────────────────────────────────────────── */
const formattedDate = computed(() => {
  return new Date(props.date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
})

/* ─────────────────────────────────────────────────────────────────────────── */
/*                                 Functions                                   */
/* ─────────────────────────────────────────────────────────────────────────── */
function closeModal() {
  emit('close')
}

function confirmValidation() {
  emit('confirm')
}
</script>

<style scoped lang="scss">
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 550px;
  overflow: hidden;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
  animation: modalAppear 0.3s ease-out;
}

@keyframes modalAppear {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.modal-header {
  background: #4444ac;
  color: white;
  padding: 1.5rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h4 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.modal-header h4 i {
  font-size: 1.5rem;
  color: white;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.close-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.modal-body {
  padding: 2rem;
}

.warning-message {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: #fffbeb;
  border: 1px solid #fed7aa;
  border-radius: 12px;
}

.warning-icon {
  flex-shrink: 0;
  width: 2.5rem;
  height: 2.5rem;
  background: #f59e0b;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.warning-content p {
  margin: 0 0 0.5rem 0;
  color: #92400e;
  line-height: 1.5;
}

.warning-content p:last-child {
  margin-bottom: 0;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.btn-secondary, .btn-primary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  font-size: 0.9rem;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover {
  background: #e5e7eb;
  border-color: #9ca3af;
}

.btn-primary {
  background: #4444ac;
  color: white;
  box-shadow: 0 2px 4px rgba(68, 68, 172, 0.2);
}

.btn-primary:hover:not(:disabled) {
  background: #3333a0;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(68, 68, 172, 0.3);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-primary i.material-icons,
.btn-secondary i.material-icons {
  font-size: 1.125rem;
}
</style> 