<template>
  <div class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>
          <i class="material-icons">event</i>
          Détails du cours
        </h2>
        <button @click="closeModal" class="close-btn" aria-label="Fermer la modale">
          <i class="material-icons">close</i>
        </button>
      </div>

      <div class="modal-body">
        <div class="course-info">
          <div class="info-row">
            <strong>Activité :</strong>
            <span :class="{ 'activity-cancelled': course.cancelled, 'activity-vacation': course.vacation }">
              {{ course.title }}
            </span>
          </div>

          <div class="info-row">
            <strong>Éducateur :</strong>
            <span>{{ staffName }}</span>
          </div>

          <div class="info-row">
            <strong>Horaire :</strong>
            <span>{{ formatTime(course.start) }} - {{ formatTime(course.end) }}</span>
          </div>

          <div class="info-row">
            <strong>Date :</strong>
            <span>{{ formatDate(course.start) }}</span>
          </div>
        </div>

        <div class="children-section">
          <h3>
            <i class="material-icons">child_care</i>
            Enfants concernés ({{ course.children.length }})
          </h3>

          <div v-if="course.children.length > 0" class="children-grid">
            <div
              v-for="child in course.children"
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

          <div v-else class="empty-state">
            <i class="material-icons">person_off</i>
            <p>Aucun enfant associé à cette activité</p>
          </div>
        </div>

        <div v-if="course.cancelled" class="warning-section">
          <i class="material-icons">warning</i>
          <div>
            <strong>Cours annulé</strong>
            <p>Ce cours a été annulé. Les enfants ont été réaffectés automatiquement.</p>
          </div>
        </div>

        <div v-if="course.vacation" class="info-section">
          <i class="material-icons">beach_access</i>
          <div>
            <strong>Période spéciale</strong>
            <p>Cette période correspond à des vacances scolaires ou un jour férié.</p>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button @click="closeModal" class="btn btn-secondary">
          <i class="material-icons">close</i>
          Fermer
        </button>
        
        <button 
          v-if="!course.vacation" 
          @click="handleCancelCourse"
          class="btn btn-warning"
        >
          <i class="material-icons">{{ course.cancelled ? 'refresh' : 'cancel' }}</i>
          {{ course.cancelled ? 'Réactiver' : 'Annuler' }} le cours
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Course {
  id: string
  title: string
  start: Date
  end: Date
  children: Array<{
    id: number
    firstName: string
    lastName: string
  }>
  cancelled: boolean
  vacation: boolean
}

interface Props {
  course: Course
  staffName: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  cancelCourse: [course: Course]
  reassignChildren: [sourceId: string, targetId: string]
}>()

function closeModal() {
  emit('close')
}

function handleCancelCourse() {
  emit('cancelCourse', props.course)
}

function formatTime(date: Date): string {
  // Traiter la date comme étant déjà en heure locale française
  const hours = date.getUTCHours().toString().padStart(2, '0')
  const minutes = date.getUTCMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

function formatDate(date: Date): string {
  // Utiliser UTC pour éviter les conversions de timezone automatiques
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC'
  }).format(date)
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
  max-width: 600px;
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

.course-info {
  margin-bottom: 2rem;
  
  .info-row {
    display: flex;
    align-items: center;
    margin-bottom: 1rem;
    gap: 1rem;

    strong {
      min-width: 100px;
      color: #374151;
      font-weight: 600;
    }

    span {
      color: #6b7280;
      
      &.activity-cancelled {
        color: #b91c1c;
        font-weight: 500;
      }

      &.activity-vacation {
        color: #d97706;
        font-weight: 500;
      }
    }
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
    transition: all 0.2s ease;

    &:hover {
      background: #f1f5f9;
      border-color: #cbd5e1;
    }

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

    .child-info {
      flex: 1;
      min-width: 0;

      h4 {
        margin: 0 0 0.25rem 0;
        color: #1e293b;
        font-size: 0.875rem;
        font-weight: 600;
      }

      small {
        color: #6b7280;
        font-size: 0.75rem;
      }
    }
  }

  .empty-state {
    text-align: center;
    padding: 2rem;
    color: #6b7280;

    i {
      font-size: 2rem;
      margin-bottom: 0.5rem;
      opacity: 0.5;
    }

    p {
      margin: 0;
      font-size: 0.875rem;
    }
  }
}

.warning-section,
.info-section {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  border-radius: 0.5rem;
  margin-bottom: 1rem;

  i {
    font-size: 1.25rem;
    margin-top: 0.125rem;
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

.warning-section {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;

  i {
    color: #dc2626;
  }
}

.info-section {
  background: #fef3c7;
  border: 1px solid #fcd34d;
  color: #92400e;

  i {
    color: #d97706;
  }
}

.modal-footer {
  padding: 1.5rem 2rem;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-end;

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

    &.btn-secondary {
      background: #f8fafc;
      color: #475569;
      border: 1px solid #e2e8f0;

      &:hover {
        background: #f1f5f9;
        border-color: #cbd5e1;
      }
    }

    &.btn-warning {
      background: #fef2f2;
      color: #b91c1c;
      border: 1px solid #fecaca;

      &:hover {
        background: #fef2f2;
        border-color: #fecaca;
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
  }

  .course-info .info-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }

  .children-grid {
    grid-template-columns: 1fr;
  }
}
</style> 