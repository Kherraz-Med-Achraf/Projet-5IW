<template>
  <div class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>
          <i class="material-icons">swap_horiz</i>
          Transfert des enfants
        </h2>
        <button @click="closeModal" class="close-btn" aria-label="Fermer la modale">
          <i class="material-icons">close</i>
        </button>
      </div>

      <div class="modal-body">
        <div class="cancelled-course-info">
          <h3>
            <i class="material-icons">cancel</i>
            Cours annulé
          </h3>
          <div class="course-card cancelled">
            <div class="course-title">{{ cancelledCourse.title }}</div>
            <div class="course-details">
              <span>{{ formatTime(cancelledCourse.start) }} - {{ formatTime(cancelledCourse.end) }}</span>
              <span>{{ formatDate(cancelledCourse.start) }}</span>
            </div>
          </div>
        </div>

        <div class="transfer-section" v-if="childrenToTransfer.length > 0">
          <h3>
            <i class="material-icons">child_care</i>
            Répartir les enfants ({{ childrenToTransfer.length }})
          </h3>

          <div class="children-list">
            <div
              v-for="child in childrenToTransfer"
              :key="child.id"
              class="child-transfer-item"
            >
              <div class="child-info">
                <div class="child-avatar">
                  <i class="material-icons">person</i>
                </div>
                <div class="child-details">
                  <h4>{{ child.firstName }} {{ child.lastName }}</h4>
                  <span class="child-status">À transférer</span>
                </div>
              </div>

              <div class="transfer-options">
                <label class="transfer-label">Nouveau cours :</label>
                <select 
                  v-model="transfers[child.id]"
                  class="course-select"
                  @change="updateTransfer(child.id, $event.target.value)"
                >
                  <option value="">-- Choisir un cours --</option>
                  <option 
                    v-for="alternative in alternatives"
                    :key="alternative.id"
                    :value="alternative.id"
                  >
                    {{ alternative.activity }} 
                    ({{ getStaffName(alternative.staffId) }})
                    - {{ alternative.children.length }} enfant(s)
                  </option>
                </select>
              </div>
            </div>
          </div>

          <div v-if="alternatives.length === 0" class="no-alternatives">
            <i class="material-icons">warning</i>
            <p>Aucun cours alternatif disponible au même horaire.</p>
            <p class="help-text">Les enfants resteront associés au cours annulé.</p>
          </div>
        </div>

        <div v-else class="no-children">
          <i class="material-icons">info</i>
          <p>Aucun enfant n'était inscrit à ce cours.</p>
        </div>
      </div>

      <div class="modal-footer">
        <button @click="closeModal" class="btn btn-secondary">
          <i class="material-icons">close</i>
          Annuler
        </button>
        
        <button 
          @click="confirmTransfers"
          class="btn btn-primary"
          :disabled="!allChildrenAssigned && childrenToTransfer.length > 0"
        >
          <i class="material-icons">check</i>
          Confirmer les transferts
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface Child {
  id: number
  firstName: string
  lastName: string
}

interface Course {
  id: string
  title: string
  start: Date
  end: Date
  staffId: string
  children: Child[]
}

interface Alternative {
  id: string
  activity: string
  staffId: string
  children: Child[]
}

interface Props {
  cancelledCourse: Course
  alternatives: Alternative[]
  staffList: Array<{ id: number; firstName: string; lastName: string; userId: string }>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  transferChildren: [transfers: Record<number, string>]
}>()

// État des transferts : childId -> targetCourseId
const transfers = ref<Record<number, string>>({})
const childrenToTransfer = ref<Child[]>([])

// Computed pour vérifier si tous les enfants ont un cours assigné
const allChildrenAssigned = computed(() => {
  if (childrenToTransfer.value.length === 0) return true
  return childrenToTransfer.value.every(child => transfers.value[child.id])
})

onMounted(() => {
  // Initialiser la liste des enfants à transférer
  childrenToTransfer.value = [...props.cancelledCourse.children]
  
  // Initialiser les transferts vides
  childrenToTransfer.value.forEach(child => {
    transfers.value[child.id] = ''
  })
})

function updateTransfer(childId: number, targetCourseId: string) {
  transfers.value[childId] = targetCourseId
}

function getStaffName(userId: string): string {
  const staff = props.staffList.find(s => s.userId === userId)
  return staff ? `${staff.firstName} ${staff.lastName}` : 'Inconnu'
}

function formatTime(date: Date): string {
  const hours = date.getUTCHours().toString().padStart(2, '0')
  const minutes = date.getUTCMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC'
  }).format(date)
}

function closeModal() {
  emit('close')
}

function confirmTransfers() {
  // Filtrer seulement les transferts avec une destination
  const validTransfers = Object.fromEntries(
    Object.entries(transfers.value).filter(([_, targetId]) => targetId)
  )
  
  emit('transferChildren', validTransfers)
}
</script>

<style scoped lang="scss">
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: white;
  border-radius: 1rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  max-width: 800px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #e2e8f0;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  border-radius: 1rem 1rem 0 0;

  h2 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;

    i {
      color: white;
    }
  }

  .close-btn {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 0.375rem;
    transition: all 0.2s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    i {
      font-size: 1.5rem;
    }
  }
}

.modal-body {
  padding: 2rem;
}

.cancelled-course-info {
  margin-bottom: 2rem;

  h3 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0 0 1rem 0;
    color: #dc2626;
    font-size: 1.125rem;
    font-weight: 600;

    i {
      color: #dc2626;
    }
  }

  .course-card {
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 0.5rem;
    padding: 1rem;

    &.cancelled {
      border-left: 4px solid #dc2626;
    }

    .course-title {
      font-weight: 600;
      color: #dc2626;
      margin-bottom: 0.5rem;
    }

    .course-details {
      display: flex;
      gap: 1rem;
      font-size: 0.875rem;
      color: #6b7280;

      span {
        background: white;
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        border: 1px solid #e5e7eb;
      }
    }
  }
}

.transfer-section {
  h3 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0 0 1.5rem 0;
    color: #1e293b;
    font-size: 1.125rem;
    font-weight: 600;

    i {
      color: #4338ca;
    }
  }
}

.children-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.child-transfer-item {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 1.5rem;
  transition: all 0.2s ease;

  &:hover {
    border-color: #4338ca;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  }
}

.child-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;

  .child-avatar {
    width: 3rem;
    height: 3rem;
    background: linear-gradient(135deg, #4338ca 0%, #3730a3 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 1.5rem;
  }

  .child-details {
    h4 {
      margin: 0;
      color: #1e293b;
      font-weight: 600;
    }

    .child-status {
      font-size: 0.875rem;
      color: #f59e0b;
      font-weight: 500;
    }
  }
}

.transfer-options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  .transfer-label {
    font-weight: 500;
    color: #374151;
    font-size: 0.875rem;
  }

  .course-select {
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    background: white;
    font-size: 0.875rem;
    transition: all 0.2s ease;

    &:focus {
      outline: none;
      border-color: #4338ca;
      box-shadow: 0 0 0 3px rgba(67, 56, 202, 0.1);
    }

    option {
      padding: 0.5rem;
    }
  }
}

.no-alternatives, .no-children {
  text-align: center;
  padding: 2rem;
  color: #6b7280;

  i {
    font-size: 3rem;
    color: #d1d5db;
    margin-bottom: 1rem;
  }

  p {
    margin: 0.5rem 0;
  }

  .help-text {
    font-size: 0.875rem;
    color: #9ca3af;
  }
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  padding: 1.5rem 2rem;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
  border-radius: 0 0 1rem 1rem;

  .btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    font-weight: 500;
    transition: all 0.2s ease;
    cursor: pointer;
    border: none;

    &.btn-secondary {
      background: #6b7280;
      color: white;

      &:hover:not(:disabled) {
        background: #4b5563;
      }
    }

    &.btn-primary {
      background: linear-gradient(135deg, #4338ca 0%, #3730a3 100%);
      color: white;

      &:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(67, 56, 202, 0.4);
      }

      &:disabled {
        background: #d1d5db;
        color: #9ca3af;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }
    }

    i {
      font-size: 1.125rem;
    }
  }
}

@media (max-width: 768px) {
  .modal-content {
    width: 95%;
    margin: 1rem;
  }

  .child-transfer-item {
    padding: 1rem;
  }

  .child-info {
    .child-avatar {
      width: 2.5rem;
      height: 2.5rem;
      font-size: 1.25rem;
    }
  }

  .modal-footer {
    flex-direction: column;
    gap: 1rem;

    .btn {
      justify-content: center;
    }
  }
}
</style> 