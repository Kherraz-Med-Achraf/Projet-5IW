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
              :class="{ 'error': fieldErrors.firstName }"
              @blur="validateFormField('firstName')"
              @input="validateFormField('firstName')"
            />
            <span v-if="fieldErrors.firstName" class="error-message">
              {{ fieldErrors.firstName }}
            </span>
          </div>

          <div class="form-group">
            <label>Nom</label>
            <input 
              v-model="editForm.lastName" 
              type="text" 
              placeholder="Votre nom"
              required
              :class="{ 'error': fieldErrors.lastName }"
              @blur="validateFormField('lastName')"
              @input="validateFormField('lastName')"
            />
            <span v-if="fieldErrors.lastName" class="error-message">
              {{ fieldErrors.lastName }}
            </span>
          </div>

          <div class="form-group">
            <label>Téléphone</label>
            <input 
              v-model="editForm.phone" 
              type="tel" 
              placeholder="Votre numéro de téléphone"
              pattern="[0-9\s\-\+\(\)]{10,}"
              :class="{ 'error': fieldErrors.phone }"
              @blur="validateFormField('phone')"
              @input="validateFormField('phone')"
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
            <button type="submit" class="btn-primary" :disabled="loading || !isFormValid">
              {{ loading ? 'Enregistrement...' : 'Enregistrer' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, reactive } from 'vue';
import { useAuthSecureStore, SecureHttpClient } from '@/stores/authSecure';
import { useToast } from 'vue-toastification';
import { validateProfile, validateField, type ProfileFormData } from '@/utils/validation';
import { API_ENDPOINTS } from '@/config/api';

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
const auth = useAuthSecureStore();
const toast = useToast();

/* ─────────────────────────────────────────────────────────────────────────── */
/*                                 Reactive                                    */
/* ─────────────────────────────────────────────────────────────────────────── */
const loading = ref(false);

const editForm = reactive<ProfileFormData>({
  firstName: '',
  lastName: '',
  phone: ''
});

const fieldErrors = reactive<Record<string, string>>({});
const isFormValid = ref(false);

/* ─────────────────────────────────────────────────────────────────────────── */
/*                                 Functions                                   */
/* ─────────────────────────────────────────────────────────────────────────── */
function closeModal() {
  emit('close');
}

// Validation en temps réel
function validateFormField(field: keyof ProfileFormData) {
  const value = editForm[field];
  const result = validateField(field, value);
  
  if (result.isValid) {
    delete fieldErrors[field];
  } else {
    fieldErrors[field] = result.error || '';
  }
  
  // Vérifier si tout le formulaire est valide
  const validation = validateProfile(editForm);
  isFormValid.value = validation.success;
}

async function saveProfile() {
  // Validation complète avant envoi
  const validation = validateProfile(editForm);
  if (!validation.success) {
    if (validation.errors) {
      Object.assign(fieldErrors, validation.errors);
    }
    toast.error('Veuillez corriger les erreurs dans le formulaire');
    return;
  }

  loading.value = true;
  try {
    const response = await SecureHttpClient.request(API_ENDPOINTS.AUTH.PROFILE, {
      method: 'PATCH',
      body: JSON.stringify(editForm)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Erreur lors de la mise à jour');
    }
    
    emit('updated', { ...editForm });
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
    editForm.firstName = props.currentProfile.firstName || '';
    editForm.lastName = props.currentProfile.lastName || '';
    editForm.phone = props.currentProfile.phone || '';
    // Réinitialiser les erreurs
    Object.keys(fieldErrors).forEach(key => delete fieldErrors[key]);
    // Valider le formulaire
    validateFormField('firstName');
    validateFormField('lastName');
    validateFormField('phone');
  }
});

// Watch for profile changes
watch(() => props.currentProfile, (newProfile) => {
  if (newProfile && props.isOpen) {
    editForm.firstName = newProfile.firstName || '';
    editForm.lastName = newProfile.lastName || '';
    editForm.phone = newProfile.phone || '';
    // Réinitialiser les erreurs
    Object.keys(fieldErrors).forEach(key => delete fieldErrors[key]);
    // Valider le formulaire
    validateFormField('firstName');
    validateFormField('lastName');
    validateFormField('phone');
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
  background: #4444ac;
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
      border-color: #4444ac;
      box-shadow: 0 0 0 3px rgba(68, 68, 172, 0.1);
    }

    &.disabled-input {
      background: #f9fafb;
      color: #6b7280;
      cursor: not-allowed;
      border-color: #d1d5db;
    }

    &.error {
      border-color: #dc3545;
      box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.1);
    }
  }

  .error-message {
    color: #dc3545;
    font-size: 0.875rem;
    margin-top: 0.25rem;
    display: block;
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
  background: #4444ac;
  color: white;
  border: 2px solid transparent;

  &:hover:not(:disabled) {
    background: #3333a0;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(68, 68, 172, 0.3);
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