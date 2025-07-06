<template>
  <div class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>
          <i class="material-icons">swap_horiz</i>
          Transfert d'enfants
        </h2>
        <button @click="closeModal" class="close-btn" aria-label="Fermer la modale">
          <i class="material-icons">close</i>
        </button>
      </div>

      <div class="modal-body">
        <div class="warning-section">
          <i class="material-icons">info</i>
          <div>
            <strong>Cours annulé avec succès</strong>
            <p>Le cours "{{ cancelledCourse?.activity }}" a été annulé. Vous pouvez maintenant transférer les {{ cancelledCourse?.children.length }} enfants vers un autre cours disponible au même horaire.</p>
          </div>
        </div>

        <div v-if="children.length > 0" class="children-section">
          <h3>
            <i class="material-icons">child_care</i>
            Enfants à transférer ({{ children.length }})
          </h3>

          <div class="children-grid">
            <div
              v-for="child in children"
              :key="child.id"
              class="child-card"
            >
              <div class="child-avatar">
                <i class="material-icons">person</i>
              </div>
              <div class="child-info">
                <h4>{{ child.firstName }} {{ child.lastName }}</h4>
              </div>
            </div>
          </div>
        </div>

        <div v-if="alternatives.length > 0" class="alternatives-section">
          <h3>
            <i class="material-icons">schedule</i>
            Cours disponibles au même horaire
          </h3>

          <div class="alternatives-grid">
            <div
              v-for="course in alternatives"
              :key="course.id"
              :class="['alternative-card', { 'selected': selectedAlternative?.id === course.id }]"
              @click="selectAlternative(course)"
            >
              <div class="course-info">
                <h4>{{ course.activity }}</h4>
                <p class="educator-name">{{ getEducatorName(course.staffId) }}</p>
                <div class="course-details">
                  <span class="time">{{ formatTime(course.startTime) }} - {{ formatTime(course.endTime) }}</span>
                  <span class="children-count">{{ course.children.length }} enfants déjà inscrits</span>
                </div>
              </div>
              <div class="selection-indicator">
                <i class="material-icons">{{ selectedAlternative?.id === course.id ? 'radio_button_checked' : 'radio_button_unchecked' }}</i>
              </div>
            </div>
          </div>
        </div>

        <div v-if="alternatives.length === 0" class="no-alternatives">
          <i class="material-icons">error_outline</i>
          <div>
            <h3>Aucun cours alternatif disponible</h3>
            <p>Il n'y a pas d'autres cours disponibles au même horaire pour transférer les enfants automatiquement.</p>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button @click="closeModal" class="btn btn-secondary">
          <i class="material-icons">close</i>
          Fermer sans transférer
        </button>
        
        <button 
          v-if="selectedAlternative && children.length > 0"
          @click="confirmTransfer"
          :disabled="loading"
          class="btn btn-primary"
        >
          <i class="material-icons">{{ loading ? 'hourglass_empty' : 'swap_horiz' }}</i>
          {{ loading ? 'Transfert...' : `Transférer vers "${selectedAlternative.activity}"` }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Child {
  id: number
  firstName: string
  lastName: string
}

interface Course {
  id: string
  activity: string
  staffId: string
  startTime: string
  endTime: string
  children: Child[]
}

interface StaffMember {
  userId: string
  firstName: string
  lastName: string
}

interface Props {
  cancelledCourse: Course | null
  alternatives: Course[]
  staffList: StaffMember[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  transfer: [sourceId: string, targetId: string]
}>()

const selectedAlternative = ref<Course | null>(null)
const loading = ref(false)

const children = computed(() => props.cancelledCourse?.children || [])

function closeModal() {
  emit('close')
}

function selectAlternative(course: Course) {
  selectedAlternative.value = course
}

function getEducatorName(staffId: string): string {
  const educator = props.staffList.find(s => s.userId === staffId)
  return educator ? `${educator.firstName} ${educator.lastName}` : 'Éducateur inconnu'
}

function formatTime(isoTime: string): string {
  const date = new Date(isoTime)
  return `${date.getUTCHours().toString().padStart(2, '0')}:${date.getUTCMinutes().toString().padStart(2, '0')}`
}

async function confirmTransfer() {
  if (!selectedAlternative.value || !props.cancelledCourse) return
  
  loading.value = true
  try {
    emit('transfer', props.cancelledCourse.id, selectedAlternative.value.id)
  } finally {
    loading.value = false
  }
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

  h2 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    color: #1e293b;
    font-size: 1.25rem;
    font-weight: 600;

    i {
      color: #4338ca;
    }
  }

  .close-btn {
    background: none;
    border: none;
    color: #6b7280;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 0.375rem;
    transition: all 0.2s ease;

    &:hover {
      background: #f3f4f6;
      color: #374151;
    }

    i {
      font-size: 1.5rem;
    }
  }
}

.modal-body {
  padding: 2rem;
}

.warning-section {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  border-radius: 0.5rem;
  margin-bottom: 2rem;
  background: #ecfdf5;
  border: 1px solid #d1fae5;
  color: #065f46;

  i {
    font-size: 1.25rem;
    margin-top: 0.125rem;
    color: #10b981;
  }

  strong {
    display: block;
    margin-bottom: 0.25rem;
    font-weight: 600;
  }

  p {
    margin: 0;
    font-size: 0.875rem;
  }
}

.children-section {
  margin-bottom: 2rem;

  h3 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0 0 1rem 0;
    color: #1e293b;
    font-size: 1.125rem;
    font-weight: 600;

    i {
      color: #4338ca;
    }
  }

  .children-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem;
  }

  .child-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;

    .child-avatar {
      width: 2.5rem;
      height: 2.5rem;
      background: #e0e7ff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;

      i {
        color: #4338ca;
        font-size: 1.25rem;
      }
    }

    .child-info h4 {
      margin: 0;
      color: #1e293b;
      font-size: 0.875rem;
      font-weight: 600;
    }
  }
}

.alternatives-section {
  margin-bottom: 2rem;

  h3 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0 0 1rem 0;
    color: #1e293b;
    font-size: 1.125rem;
    font-weight: 600;

    i {
      color: #4338ca;
    }
  }

  .alternatives-grid {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .alternative-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.5rem;
    border: 2px solid #e2e8f0;
    border-radius: 0.75rem;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      border-color: #cbd5e1;
      background: #f8fafc;
    }

    &.selected {
      border-color: #4338ca;
      background: #f0f9ff;
    }

    .course-info {
      flex: 1;

      h4 {
        margin: 0 0 0.25rem 0;
        color: #1e293b;
        font-size: 1rem;
        font-weight: 600;
      }

      .educator-name {
        margin: 0 0 0.5rem 0;
        color: #6b7280;
        font-size: 0.875rem;
      }

      .course-details {
        display: flex;
        gap: 1rem;
        font-size: 0.75rem;
        color: #6b7280;

        .time {
          font-weight: 500;
        }
      }
    }

    .selection-indicator {
      margin-left: 1rem;

      i {
        color: #4338ca;
        font-size: 1.5rem;
      }
    }
  }
}

.no-alternatives {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 2rem;
  text-align: center;
  background: #fef3c7;
  border: 1px solid #fcd34d;
  border-radius: 0.75rem;
  color: #92400e;

  i {
    font-size: 1.5rem;
    margin-top: 0.125rem;
    color: #d97706;
  }

  h3 {
    margin: 0 0 0.5rem 0;
    font-weight: 600;
  }

  p {
    margin: 0;
    font-size: 0.875rem;
  }
}

.modal-footer {
  padding: 1.5rem 2rem;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-end;
  gap: 1rem;

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 0.5rem;
    font-weight: 600;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s ease;

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    &.btn-secondary {
      background: #f8fafc;
      color: #475569;
      border: 1px solid #e2e8f0;

      &:hover:not(:disabled) {
        background: #f1f5f9;
        border-color: #cbd5e1;
      }
    }

    &.btn-primary {
      background: #4338ca;
      color: white;

      &:hover:not(:disabled) {
        background: #3730a3;
      }
    }
  }
}

/* Responsive */
@media (max-width: 768px) {
  .modal-content {
    width: 95%;
    margin: 1rem;
  }

  .modal-header {
    padding: 1rem 1.5rem;
  }

  .modal-body {
    padding: 1.5rem;
  }

  .modal-footer {
    padding: 1rem 1.5rem;
    flex-direction: column;
  }

  .children-grid {
    grid-template-columns: 1fr;
  }

  .course-details {
    flex-direction: column;
    gap: 0.25rem !important;
  }
}
</style> 