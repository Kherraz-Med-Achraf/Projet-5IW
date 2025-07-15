<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="closeModal">
    <div class="modal-content">
      <div class="modal-header">
        <h4>
          <i class="material-icons">person</i>
          Mon Profil
        </h4>
        <button class="close-btn" @click="closeModal">×</button>
      </div>

      <div class="modal-body">
        <!-- Informations utilisateur -->
        <div class="profile-section">
          <h5>Informations personnelles</h5>
          
          <div v-if="!editMode" class="profile-view">
            <div class="detail-group">
              <label>Nom complet</label>
              <p>{{ fullName || 'Non renseigné' }}</p>
            </div>
            <div class="detail-group">
              <label>Email</label>
              <p>{{ auth.user?.email }}</p>
            </div>
            <div class="detail-group">
              <label>Rôle</label>
              <p class="user-role" :class="getRoleClass(auth.user?.role)">
                {{ getRoleLabel(auth.user?.role) }}
              </p>
            </div>
            <div class="detail-group">
              <label>Compte créé le</label>
              <p>{{ formatDate(auth.user?.createdAt) }}</p>
            </div>
            
            <div class="profile-actions">
              <button class="btn-secondary" @click="editMode = true">
                <i class="material-icons">edit</i>
                Modifier
              </button>
            </div>
          </div>

          <div v-else class="profile-edit">
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
              
              <div class="form-actions">
                <button type="button" class="btn-secondary" @click="cancelEdit">
                  Annuler
                </button>
                <button type="submit" class="btn-primary" :disabled="loading">
                  {{ loading ? 'Enregistrement...' : 'Enregistrer' }}
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- Section OTP -->
        <div class="profile-section">
          <h5>Sécurité - Authentification à deux facteurs</h5>
          
          <div class="otp-section">
            <div class="toggle-container">
              <label class="toggle-switch">
                <input
                  type="checkbox"
                  v-model="otpEnabled"
                  @change="toggleOtp"
                  :disabled="otpLoading"
                />
                <span class="toggle-slider"></span>
              </label>
              <span class="toggle-label">
                {{ otpEnabled ? "OTP Activé" : "Activer OTP" }}
              </span>
            </div>

            <div v-if="otpEnabled && qrCodeDataUrl" class="qr-section">
              <div class="qr-container">
                <img :src="qrCodeDataUrl" alt="QR Code OTP" class="qr-code" />
              </div>
              <div class="qr-info">
                <p class="qr-secret"><strong>Secret:</strong> {{ secret }}</p>
                <p class="qr-instruction">
                  <i class="material-icons">info</i>
                  Scannez le QR code dans votre app d'authentification
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useToast } from 'vue-toastification';
import * as QRCode from 'qrcode';

/* ─────────────────────────────────────────────────────────────────────────── */
/*                                   Props                                     */
/* ─────────────────────────────────────────────────────────────────────────── */
interface Props {
  isOpen: boolean;
}

const props = defineProps<Props>();

/* ─────────────────────────────────────────────────────────────────────────── */
/*                                   Emits                                     */
/* ─────────────────────────────────────────────────────────────────────────── */
const emit = defineEmits<{
  close: [];
}>();

/* ─────────────────────────────────────────────────────────────────────────── */
/*                                 Composables                                 */
/* ─────────────────────────────────────────────────────────────────────────── */
const auth = useAuthStore();
const toast = useToast();

/* ─────────────────────────────────────────────────────────────────────────── */
/*                                 Reactive                                    */
/* ─────────────────────────────────────────────────────────────────────────── */
const editMode = ref(false);
const loading = ref(false);

// Informations profil
const editForm = ref({
  firstName: '',
  lastName: ''
});

// OTP
const otpEnabled = ref(false);
const otpLoading = ref(false);
const qrCodeDataUrl = ref('');
const secret = ref('');

/* ─────────────────────────────────────────────────────────────────────────── */
/*                                 Computed                                    */
/* ─────────────────────────────────────────────────────────────────────────── */
const fullName = computed(() => {
  return `${auth.user?.firstName || ''} ${auth.user?.lastName || ''}`.trim();
});

/* ─────────────────────────────────────────────────────────────────────────── */
/*                                 Functions                                   */
/* ─────────────────────────────────────────────────────────────────────────── */
function closeModal() {
  editMode.value = false;
  emit('close');
}

function getRoleClass(role: string | undefined) {
  const roleClasses: Record<string, string> = {
    ADMIN: 'role-admin',
    DIRECTOR: 'role-director',
    SERVICE_MANAGER: 'role-service-manager',
    SECRETARY: 'role-secretary',
    STAFF: 'role-staff',
    PARENT: 'role-parent',
    CHILD: 'role-child'
  };
  return role ? roleClasses[role] || 'role-default' : 'role-default';
}

function getRoleLabel(role: string | undefined) {
  const roleLabels: Record<string, string> = {
    ADMIN: 'Administrateur',
    DIRECTOR: 'Directeur',
    SERVICE_MANAGER: 'Chef de Service',
    SECRETARY: 'Secrétaire',
    STAFF: 'Personnel',
    PARENT: 'Parent',
    CHILD: 'Enfant'
  };
  return role ? roleLabels[role] || 'Utilisateur' : 'Utilisateur';
}

function formatDate(dateString: string | undefined) {
  if (!dateString) return 'Non renseigné';
  return new Date(dateString).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function cancelEdit() {
  editMode.value = false;
  // Reset form
  editForm.value.firstName = auth.user?.firstName || '';
  editForm.value.lastName = auth.user?.lastName || '';
}

async function saveProfile() {
  loading.value = true;
  try {
    // Ici, vous devrez implémenter l'API pour mettre à jour le profil
    // await auth.updateProfile(editForm.value);
    
    // Pour l'instant, on simule
    toast.success('Profil mis à jour avec succès');
    editMode.value = false;
  } catch (error) {
    toast.error('Erreur lors de la mise à jour du profil');
    console.error('Erreur:', error);
  } finally {
    loading.value = false;
  }
}

// OTP Functions
async function toggleOtp() {
  if (otpLoading.value) return;
  
  otpLoading.value = true;
  try {
    if (otpEnabled.value) {
      // Activer l'OTP
      const response = await fetch('/api/auth/otp/enable', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        secret.value = data.secret;
        await generateQrCode(data.otpAuthUrl);
        toast.success('OTP activé avec succès');
      } else {
        throw new Error('Failed to enable OTP');
      }
    } else {
      // Désactiver l'OTP
      const response = await fetch('/api/auth/otp/disable', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        qrCodeDataUrl.value = '';
        secret.value = '';
        toast.success('OTP désactivé');
      } else {
        throw new Error('Failed to disable OTP');
      }
    }
  } catch (error) {
    console.error('Error toggling OTP:', error);
    toast.error('Erreur lors de la configuration OTP');
    otpEnabled.value = !otpEnabled.value; // Revert the toggle
  } finally {
    otpLoading.value = false;
  }
}

async function generateQrCode(otpAuthUrl: string) {
  try {
    qrCodeDataUrl.value = await QRCode.toDataURL(otpAuthUrl, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
  }
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*                                 Lifecycle                                   */
/* ─────────────────────────────────────────────────────────────────────────── */
onMounted(() => {
  // Init form with current user data
  editForm.value.firstName = auth.user?.firstName || '';
  editForm.value.lastName = auth.user?.lastName || '';
  
  // Init OTP status
  otpEnabled.value = !!auth.user?.otpEnabled;
});

// Watch for user changes
watch(() => auth.user?.otpEnabled, (newVal) => {
  otpEnabled.value = !!newVal;
});
</script>

<style scoped lang="scss">.modal-overlay {
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
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;

  h4 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.5rem;

    .material-icons {
      font-size: 1.5rem;
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

    &:hover {
      color: white;
      background-color: rgba(255, 255, 255, 0.1);
    }
  }
}

.modal-body {
  padding: 1.5rem;
  max-height: calc(90vh - 120px);
  overflow-y: auto;
}

.profile-section {
  margin-bottom: 2rem;

  &:last-child {
    margin-bottom: 0;
  }

  h5 {
    margin: 0 0 1rem 0;
    color: #374151;
    font-size: 1.1rem;
    font-weight: 600;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid #e5e7eb;
  }
}

// Profile View
.detail-group {
  margin-bottom: 1rem;

  label {
    display: block;
    font-weight: 500;
    color: #6b7280;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
  }

  p {
    margin: 0;
    color: #111827;
    font-size: 0.95rem;
    padding: 0.75rem 1rem;
    background-color: #f9fafb;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
  }
}

.user-role {
  display: inline-block;
  padding: 0.5rem 1rem !important;
  border-radius: 20px !important;
  font-weight: 500 !important;
  font-size: 0.875rem !important;

  &.role-admin {
    background: linear-gradient(135deg, #ef4444, #dc2626) !important;
    color: white !important;
  }

  &.role-director {
    background: linear-gradient(135deg, #8b5cf6, #7c3aed) !important;
    color: white !important;
  }

  &.role-service-manager {
    background: linear-gradient(135deg, #06b6d4, #0891b2) !important;
    color: white !important;
  }

  &.role-secretary {
    background: linear-gradient(135deg, #10b981, #059669) !important;
    color: white !important;
  }

  &.role-staff {
    background: linear-gradient(135deg, #f59e0b, #d97706) !important;
    color: white !important;
  }

  &.role-parent {
    background: linear-gradient(135deg, #3b82f6, #2563eb) !important;
    color: white !important;
  }

  &.role-child {
    background: linear-gradient(135deg, #ec4899, #db2777) !important;
    color: white !important;
  }
}

.profile-actions {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

// Form
.form-group {
  margin-bottom: 1rem;

  label {
    display: block;
    font-weight: 500;
    color: #374151;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
  }

  input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 0.95rem;
    transition: border-color 0.2s ease;

    &:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }
  }
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

// Buttons
.btn-secondary, .btn-primary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.875rem;

  .material-icons {
    font-size: 1.1rem;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;

  &:hover:not(:disabled) {
    background: #e5e7eb;
  }
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
  }
}

// OTP Section
.otp-section {
  .toggle-container {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .toggle-switch {
    position: relative;
    display: inline-block;
    width: 50px;
    height: 24px;

    input {
      opacity: 0;
      width: 0;
      height: 0;

      &:checked + .toggle-slider {
        background-color: #667eea;

        &:before {
          transform: translateX(26px);
        }
      }
    }

    .toggle-slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #ccc;
      transition: 0.4s;
      border-radius: 24px;

      &:before {
        position: absolute;
        content: "";
        height: 18px;
        width: 18px;
        left: 3px;
        bottom: 3px;
        background-color: white;
        transition: 0.4s;
        border-radius: 50%;
      }
    }
  }

  .toggle-label {
    font-weight: 500;
    color: #374151;
  }
}

.qr-section {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;

  .qr-container {
    margin-bottom: 1rem;

    .qr-code {
      max-width: 200px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
  }

  .qr-info {
    .qr-secret {
      font-family: monospace;
      background: #e2e8f0;
      padding: 0.5rem;
      border-radius: 6px;
      font-size: 0.875rem;
      margin-bottom: 1rem;
      word-break: break-all;
    }

    .qr-instruction {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      color: #64748b;
      font-size: 0.875rem;
      margin: 0;

      .material-icons {
        font-size: 1.1rem;
        color: #3b82f6;
      }
    }
  }
}
</style> 