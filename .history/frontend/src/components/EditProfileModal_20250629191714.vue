<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="closeModal">
    <div class="modal-content">
      <div class="modal-header">
        <h4>
          <i class="material-icons">edit</i>
          Modifier mon profil
        </h4>
        <button class="close-btn" @click="closeModal">×</button>
      </div>

      <div class="modal-body">
        <form @submit.prevent="saveProfile">
          <div class="form-group">
            <label>Prénom</label>
            <input 
              v-model="editForm.firstName" 
              type="text" 
              placeholder="Votre prénom"
              required
            />
          </div>

          <div class="form-group">
            <label>Nom</label>
            <input 
              v-model="editForm.lastName" 
              type="text" 
              placeholder="Votre nom"
              required
            />
          </div>

          <div class="form-group">
            <label>Téléphone</label>
            <input 
              v-model="editForm.phone" 
              type="tel" 
              placeholder="Votre numéro de téléphone"
              pattern="[0-9\s\-\+\(\)]{10,}"
            />
            <small>
              <i class="material-icons small-icon">info</i>
              Format: 06 12 34 56 78 ou +33 6 12 34 56 78
            </small>
          </div>

          <div class="form-group">
            <label>Email</label>
            <input 
              :value="auth.user?.email" 
              type="email" 
              disabled
              class="disabled-input"
            />
            <small>
              <i class="material-icons small-icon">info</i>
              L'email ne peut pas être modifié car il sert d'identifiant unique pour la connexion et la sécurité
            </small>
          </div>

          <div class="form-actions">
            <button type="button" class="btn-secondary" @click="closeModal">
              Annuler
            </button>
            <button type="submit" class="btn-primary" :disabled="loading">
              {{ loading ? 'Enregistrement...' : 'Enregistrer' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useToast } from 'vue-toastification';

/* ─────────────────────────────────────────────────────────────────────────── */
/*                                   Props                                     */
/* ─────────────────────────────────────────────────────────────────────────── */
interface Props {
  isOpen: boolean;
  currentProfile?: any;
}

const props = defineProps<Props>();

/* ─────────────────────────────────────────────────────────────────────────── */
/*                                   Emits                                     */
/* ─────────────────────────────────────────────────────────────────────────── */
const emit = defineEmits<{
  close: [];
  updated: [data: { firstName: string; lastName: string; phone: string }];
}>();

/* ─────────────────────────────────────────────────────────────────────────── */
/*                                 Composables                                 */
/* ─────────────────────────────────────────────────────────────────────────── */
const auth = useAuthStore();
const toast = useToast();

/* ─────────────────────────────────────────────────────────────────────────── */
/*                                 Reactive                                    */
/* ─────────────────────────────────────────────────────────────────────────── */
const loading = ref(false);

const editForm = ref({
  firstName: '',
  lastName: '',
  phone: ''
});

/* ─────────────────────────────────────────────────────────────────────────── */
/*                                 Functions                                   */
/* ─────────────────────────────────────────────────────────────────────────── */
function closeModal() {
  emit('close');
}

async function saveProfile() {
  loading.value = true;
  try {
    const response = await fetch('http://localhost:3000/auth/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(editForm.value)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Erreur lors de la mise à jour');
    }
    
    emit('updated', { ...editForm.value });
    toast.success('Profil mis à jour avec succès');
    closeModal();
  } catch (error: any) {
    toast.error(error.message || 'Erreur lors de la mise à jour du profil');
    console.error('Erreur profile update');
  } finally {
    loading.value = false;
  }
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*                                 Watchers                                    */
/* ─────────────────────────────────────────────────────────────────────────── */
// Reset form when modal opens
watch(() => props.isOpen, (isOpen) => {
  if (isOpen && props.currentProfile) {
    editForm.value.firstName = props.currentProfile.firstName || '';
    editForm.value.lastName = props.currentProfile.lastName || '';
    editForm.value.phone = props.currentProfile.phone || '';
  }
});

// Watch for profile changes
watch(() => props.currentProfile, (newProfile) => {
  if (newProfile && props.isOpen) {
    editForm.value.firstName = newProfile.firstName || '';
    editForm.value.lastName = newProfile.lastName || '';
    editForm.value.phone = newProfile.phone || '';
  }
});
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
  max-width: 500px;
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
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #2c3e50;
  color: white;

  h4 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.5rem;

    .material-icons {
      font-size: 1.4rem;
    }
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: rgba(255, 255, 255, 0.8);
    padding: 0.25rem;
    border-radius: 4px;
    transition: all 0.2s ease;
    line-height: 1;

    &:hover {
      color: white;
      background-color: rgba(255, 255, 255, 0.1);
    }
  }
}

.modal-body {
  padding: 2rem;
}

.form-group {
  margin-bottom: 1.5rem;

  label {
    display: block;
    font-weight: 500;
    color: #374151;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
  }

  input {
    width: 100%;
    padding: 0.875rem;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    font-size: 1rem;
    transition: all 0.2s ease;
    background: white;

    &:focus {
      outline: none;
      border-color: #2c3e50;
      box-shadow: 0 0 0 3px rgba(44, 62, 80, 0.1);
    }

    &.disabled-input {
      background: #f9fafb;
      color: #6b7280;
      cursor: not-allowed;
      border-color: #d1d5db;
    }
  }

  small {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    color: #6b7280;
    font-size: 0.75rem;
    margin-top: 0.25rem;
    font-style: italic;

    .small-icon {
      font-size: 0.875rem;
    }
  }
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.btn-secondary, .btn-primary {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.875rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.925rem;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
  }
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
  border: 2px solid #e5e7eb;

  &:hover:not(:disabled) {
    background: #e5e7eb;
    border-color: #d1d5db;
  }
}

.btn-primary {
  background: #2c3e50;
  color: white;
  border: 2px solid transparent;

  &:hover:not(:disabled) {
    background: #34495e;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(44, 62, 80, 0.3);
  }
}

/* ───── Responsive ───── */
@media (max-width: 640px) {
  .modal-content {
    width: 95%;
    margin: 1rem;
  }

  .modal-header {
    padding: 1rem;
  }

  .modal-body {
    padding: 1.5rem;
  }

  .form-actions {
    flex-direction: column;
  }
}
</style> 