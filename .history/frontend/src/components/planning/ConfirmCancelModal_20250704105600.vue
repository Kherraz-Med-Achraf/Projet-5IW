<template>
  <div class="modal-overlay" @click="$emit('cancel')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>
          <i class="material-icons">warning</i>
          Confirmer l'annulation
        </h2>
        <button @click="$emit('cancel')" class="close-btn" aria-label="Fermer">
          <i class="material-icons">close</i>
        </button>
      </div>

      <div class="modal-body">
        <div class="warning-content">
          <div class="warning-icon">
            <i class="material-icons">cancel</i>
          </div>
          <div class="warning-text">
            <h3>Êtes-vous sûr de vouloir annuler ce cours ?</h3>
            <p><strong>{{ course?.title }}</strong></p>
            <p class="warning-message">
              Cette action annulera le cours et les enfants devront être réaffectés vers d'autres créneaux.
            </p>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button @click="$emit('cancel')" class="btn btn-secondary">
          <i class="material-icons">close</i>
          Annuler
        </button>
        <button @click="$emit('confirm')" class="btn btn-danger">
          <i class="material-icons">delete</i>
          Confirmer l'annulation
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Course {
  id?: string
  title?: string
  [key: string]: any
}

interface Props {
  course: Course | null
}

defineProps<Props>()

defineEmits<{
  confirm: []
  cancel: []
}>()
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
  max-width: 500px;
  width: 90%;
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
    color: #dc2626;
    font-size: 1.25rem;
    font-weight: 600;

    i {
      color: #dc2626;
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

.warning-content {
  display: flex;
  gap: 1rem;
  align-items: flex-start;

  .warning-icon {
    width: 3rem;
    height: 3rem;
    background: #fee2e2;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    i {
      color: #dc2626;
      font-size: 1.5rem;
    }
  }

  .warning-text {
    flex: 1;

    h3 {
      margin: 0 0 0.5rem 0;
      color: #1e293b;
      font-size: 1.125rem;
      font-weight: 600;
    }

    p {
      margin: 0 0 0.75rem 0;
      color: #6b7280;
      line-height: 1.6;

      strong {
        color: #374151;
      }
    }

    .warning-message {
      color: #dc2626;
      font-weight: 500;
      font-size: 0.875rem;
    }
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

    &.btn-secondary {
      background: #f8fafc;
      color: #475569;
      border: 1px solid #e2e8f0;

      &:hover {
        background: #f1f5f9;
        border-color: #cbd5e1;
      }
    }

    &.btn-danger {
      background: #dc2626;
      color: white;

      &:hover {
        background: #b91c1c;
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

  .warning-content {
    flex-direction: column;
    text-align: center;
  }
}
</style> 