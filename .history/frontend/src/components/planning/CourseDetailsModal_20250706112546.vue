<template>
  <div class="modal-overlay" @click="closeModal" @keydown.esc="closeModal">
    <div 
      class="modal-content" 
      @click.stop 
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
      ref="modalContent"
      tabindex="-1"
    >
      <div class="modal-header">
        <h2 id="modal-title">
          <i class="material-icons" aria-hidden="true">event</i>
          Détails du cours
        </h2>
        <button 
          @click="closeModal" 
          class="close-btn" 
          aria-label="Fermer la modale des détails du cours"
          ref="closeButton"
        >
          <i class="material-icons" aria-hidden="true">close</i>
        </button>
      </div>

      <div class="modal-body" id="modal-description">
        <div class="course-info">
          <div class="info-row">
            <strong>Activité :</strong>
            <span 
              :class="{ 'activity-cancelled': course.cancelled, 'activity-vacation': course.vacation }"
              :aria-label="course.cancelled ? 'Cours annulé' : course.vacation ? 'Période de vacances' : 'Cours normal'"
            >
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
          <h3 id="children-heading">
            <i class="material-icons" aria-hidden="true">child_care</i>
            Enfants concernés ({{ course.children.length }})
          </h3>

          <div v-if="course.children.length > 0" class="children-grid" role="list" aria-labelledby="children-heading">
            <div
              v-for="child in course.children"
              :key="child.id"
              class="child-card"
              role="listitem"
              :aria-label="`Enfant: ${child.firstName} ${child.lastName}`"
            >
              <div class="child-avatar" aria-hidden="true">
                <i class="material-icons">person</i>
              </div>
              <div class="child-info">
                <h4>{{ child.firstName }} {{ child.lastName }}</h4>
              </div>
            </div>
          </div>

          <div v-else class="empty-state" role="status" aria-live="polite">
            <i class="material-icons" aria-hidden="true">person_off</i>
            <p>Aucun enfant associé à cette activité</p>
          </div>
        </div>

        <div v-if="course.cancelled" class="warning-section" role="alert" aria-live="assertive">
          <i class="material-icons" aria-hidden="true">warning</i>
          <div>
            <strong>Cours annulé</strong>
            <p>Ce cours a été annulé. Les enfants ont été réaffectés automatiquement.</p>
          </div>
        </div>

        <div v-if="course.vacation" class="info-section" role="status">
          <i class="material-icons" aria-hidden="true">beach_access</i>
          <div>
            <strong>Période spéciale</strong>
            <p>Cette période correspond à des vacances scolaires ou un jour férié.</p>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button 
          @click="closeModal" 
          class="btn btn-secondary"
          :aria-label="'Fermer la modale des détails du cours ' + course.title"
        >
          <i class="material-icons" aria-hidden="true">close</i>
          Fermer
        </button>
        
        <!-- Les boutons d'action ne sont visibles que pour les éducateurs/administrateurs -->
        <button 
          v-if="!course.vacation && canManageCourse" 
          @click="handleCancelCourse"
          class="btn btn-warning"
          :aria-label="course.cancelled ? 'Réactiver le cours ' + course.title : 'Annuler le cours ' + course.title"
        >
          <i class="material-icons" aria-hidden="true">{{ course.cancelled ? 'refresh' : 'cancel' }}</i>
          {{ course.cancelled ? 'Réactiver' : 'Annuler' }} le cours
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { withDefaults, ref, onMounted, onUnmounted, nextTick } from 'vue'

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
  canManageCourse?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  canManageCourse: true
})

const emit = defineEmits<{
  close: []
  cancelCourse: [course: Course]
  reassignChildren: [sourceId: string, targetId: string]
}>()

const modalContent = ref<HTMLElement>()
const closeButton = ref<HTMLElement>()
const previouslyFocusedElement = ref<HTMLElement>()

onMounted(async () => {
  // Sauvegarder l'élément qui avait le focus
  previouslyFocusedElement.value = document.activeElement as HTMLElement
  
  // Attendre que le DOM soit rendu
  await nextTick()
  
  // Mettre le focus sur le premier élément focusable
  if (closeButton.value) {
    closeButton.value.focus()
  }
  
  // Ajouter les listeners pour le focus trap
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
  
  // Restaurer le focus à l'élément précédent
  if (previouslyFocusedElement.value) {
    previouslyFocusedElement.value.focus()
  }
})

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Tab') {
    handleTabKey(event)
  }
}

function handleTabKey(event: KeyboardEvent) {
  if (!modalContent.value) return
  
  const focusableElements = modalContent.value.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )
  
  const firstElement = focusableElements[0] as HTMLElement
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement
  
  if (event.shiftKey) {
    // Shift + Tab
    if (document.activeElement === firstElement) {
      event.preventDefault()
      lastElement.focus()
    }
  } else {
    // Tab
    if (document.activeElement === lastElement) {
      event.preventDefault()
      firstElement.focus()
    }
  }
}

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
  
  &:focus {
    outline: 2px solid #4338ca;
    outline-offset: 2px;
  }
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
    color: #4b5563; /* Couleur plus foncée pour meilleur contraste */
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 0.375rem;
    transition: all 0.2s ease;

    &:hover {
      background: #f3f4f6;
      color: #1f2937; /* Couleur plus foncée au hover */
    }

    &:focus {
      outline: 2px solid #4338ca;
      outline-offset: 2px;
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
      color: #1f2937; /* Couleur plus foncée pour meilleur contraste */
      font-weight: 600;
    }

    span {
      color: #374151; /* Couleur plus foncée pour meilleur contraste */
      
      &.activity-cancelled {
        color: #6b7280;
        font-weight: 500;
        text-decoration: line-through;
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
        color: #374151; /* Couleur plus foncée pour meilleur contraste */
        font-size: 0.75rem;
      }
    }
  }

  .empty-state {
    text-align: center;
    padding: 2rem;
    color: #374151; /* Couleur plus foncée pour meilleur contraste */

    i {
      font-size: 2rem;
      margin-bottom: 0.5rem;
      opacity: 0.7;
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

    &:focus {
      outline: 2px solid #4338ca;
      outline-offset: 2px;
    }

    &.btn-secondary {
      background: #f8fafc;
      color: #1f2937; /* Couleur plus foncée pour meilleur contraste */
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

/* Mode contraste élevé */
@media (prefers-contrast: high) {
  .modal-content {
    border: 2px solid #000;
  }
  
  .course-info .info-row span {
    color: #000;
  }
  
  .child-card {
    border: 2px solid #000;
  }
  
  .btn {
    border: 2px solid #000 !important;
  }
}

/* Mode mouvement réduit */
@media (prefers-reduced-motion: reduce) {
  .modal-content {
    animation: none;
  }
  
  .child-card {
    transition: none;
  }
  
  .btn {
    transition: none;
  }
}
</style> 