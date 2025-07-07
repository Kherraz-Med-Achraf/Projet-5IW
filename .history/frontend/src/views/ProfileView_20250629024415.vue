<template>
  <div class="profile-container">
    <!-- Header -->
    <div class="profile-header">
      <div class="header-content">
        <div class="user-avatar">
          <i class="material-icons">person</i>
        </div>
        <div class="user-info">
          <h1>Mon profil</h1>
          <p class="user-email">{{ auth.user?.email }}</p>
          <span class="user-role" :class="getRoleClass(auth.user?.role)">
            {{ getRoleLabel(auth.user?.role) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="profile-content">
      <div class="content-grid">
        <!-- Informations personnelles -->
        <div class="profile-section">
          <div class="section-header">
            <h2>
              <i class="material-icons">info</i>
              Informations personnelles
            </h2>
            <button class="edit-btn" @click="openEditModal()">
              <i class="material-icons">edit</i>
              Modifier
            </button>
          </div>

          <div class="info-grid">
            <div class="info-item">
              <label>Email</label>
              <p>{{ auth.user?.email }}</p>
            </div>
            <div class="info-item">
              <label>Rôle</label>
              <p class="role-display" :class="getRoleClass(auth.user?.role)">
                {{ getRoleLabel(auth.user?.role) }}
              </p>
            </div>
            <div class="info-item">
              <label>Compte créé le</label>
              <p>{{ formatDate(auth.user?.createdAt) }}</p>
            </div>
            <div class="info-item">
              <label>Prénom</label>
              <p>{{ userFirstName || 'Non renseigné' }}</p>
            </div>
            <div class="info-item">
              <label>Nom</label>
              <p>{{ userLastName || 'Non renseigné' }}</p>
            </div>
            <div class="info-item">
              <label>Statut OTP</label>
              <p class="otp-status" :class="{ active: auth.user?.otpEnabled }">
                <i class="material-icons">
                  {{ auth.user?.otpEnabled ? 'security' : 'security' }}
                </i>
                {{ auth.user?.otpEnabled ? 'Activé' : 'Désactivé' }}
              </p>
            </div>
          </div>
        </div>

        <!-- Sécurité - OTP -->
        <div class="profile-section">
          <div class="section-header">
            <h2>
              <i class="material-icons">security</i>
              Authentification à deux facteurs
            </h2>
          </div>

          <div class="otp-content">
            <div class="otp-description">
              <p>
                L'authentification à deux facteurs ajoute une couche de sécurité supplémentaire à votre compte. 
                Vous devrez utiliser votre téléphone pour confirmer votre identité lors de la connexion.
              </p>
            </div>

            <div class="otp-controls">
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

              <div v-if="otpLoading" class="loading-indicator">
                <i class="material-icons spinning">hourglass_empty</i>
                <span>Configuration en cours...</span>
              </div>
            </div>

            <div v-if="otpEnabled && qrCodeDataUrl" class="qr-section">
              <div class="qr-container">
                <img :src="qrCodeDataUrl" alt="QR Code OTP" class="qr-code" />
              </div>
              <div class="qr-info">
                <p class="qr-secret"><strong>Secret:</strong> {{ secret }}</p>
                <p class="qr-instruction">
                  <i class="material-icons">smartphone</i>
                  Scannez ce QR code avec votre application d'authentification (Google Authenticator, Authy, etc.)
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal d'édition -->
    <EditProfileModal 
      :isOpen="showEditModal" 
      :currentProfile="userProfile"
      @close="showEditModal = false"
      @updated="handleProfileUpdate"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useToast } from 'vue-toastification';
import * as QRCode from 'qrcode';
import EditProfileModal from '@/components/EditProfileModal.vue';

/* ─────────────────────────────────────────────────────────────────────────── */
/*                                 Composables                                 */
/* ─────────────────────────────────────────────────────────────────────────── */
const auth = useAuthStore();
const toast = useToast();

/* ─────────────────────────────────────────────────────────────────────────── */
/*                                 Reactive                                    */
/* ─────────────────────────────────────────────────────────────────────────── */
const showEditModal = ref(false);

// OTP
const otpEnabled = ref(false);
const otpLoading = ref(false);
const qrCodeDataUrl = ref('');
const secret = ref('');

// Données utilisateur chargées depuis l'API
const userProfile = ref<any>(null);
const userFirstName = ref('');
const userLastName = ref('');

/* ─────────────────────────────────────────────────────────────────────────── */
/*                                 Functions                                   */
/* ─────────────────────────────────────────────────────────────────────────── */
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

function handleProfileUpdate(updatedData: any) {
  userFirstName.value = updatedData.firstName;
  userLastName.value = updatedData.lastName;
  // Mettre à jour userProfile aussi
  if (userProfile.value) {
    userProfile.value.firstName = updatedData.firstName;
    userProfile.value.lastName = updatedData.lastName;
  }
  toast.success('Profil mis à jour avec succès');
}

// Edit profile function
function openEditModal() {
  // Préremplir les champs avec les données du profil
  userFirstName.value = userProfile.value?.firstName || '';
  userLastName.value = userProfile.value?.lastName || '';
  showEditModal.value = true;
}

async function loadUserProfile() {
  try {
    const token = localStorage.getItem('token');
    console.log('Token:', token ? 'exists' : 'missing');
    
    const response = await fetch('http://localhost:3000/auth/profile', {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });
    
    console.log('Response status:', response.status);
    
    if (response.ok) {
      userProfile.value = await response.json();
      userFirstName.value = userProfile.value.firstName || '';
      userLastName.value = userProfile.value.lastName || '';
      // Synchroniser l'état OTP avec la réponse de l'API
      otpEnabled.value = !!userProfile.value.otpEnabled;
      console.log('Profile loaded successfully:', userProfile.value);
    } else {
      const errorText = await response.text();
      console.error('Failed to load profile:', response.status, errorText);
      
      if (response.status === 401) {
        toast.error('Session expirée, veuillez vous reconnecter');
        // Optionally redirect to login
        // router.push('/login');
      }
    }
  } catch (error) {
    console.error('Error loading profile:', error);
    toast.error('Erreur lors du chargement du profil');
  }
}

// OTP Functions
async function toggleOtp() {
  if (otpLoading.value) return;
  
  otpLoading.value = true;
  try {
    if (otpEnabled.value) {
      // Activer l'OTP
      const response = await fetch('http://localhost:3000/auth/enable-otp', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        secret.value = data.secret;
        qrCodeDataUrl.value = data.qrCodeDataUrl; // Utiliser directement l'URL du backend
        // Mettre à jour l'état du profil pour synchronisation
        if (userProfile.value) userProfile.value.otpEnabled = true;
        console.log('OTP enabled, QR code URL:', data.qrCodeDataUrl);
        toast.success('OTP activé avec succès');
      } else {
        const errorText = await response.text();
        console.error('Failed to enable OTP:', response.status, errorText);
        throw new Error('Failed to enable OTP');
      }
    } else {
      // Désactiver l'OTP
      const response = await fetch('http://localhost:3000/auth/disable-otp', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        qrCodeDataUrl.value = '';
        secret.value = '';
        // Mettre à jour l'état du profil pour synchronisation
        if (userProfile.value) userProfile.value.otpEnabled = false;
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
onMounted(async () => {
  // Init OTP status
  otpEnabled.value = !!auth.user?.otpEnabled;
  
  // Charger le profil complet depuis l'API
  await loadUserProfile();
});

// Watch for user changes
watch(() => auth.user?.otpEnabled, (newVal) => {
  otpEnabled.value = !!newVal;
});
</script>

<style scoped lang="scss">
@use "sass:color";

.profile-container {
  min-height: 100vh;
  background-color: #f8fafc; // Même que Login.vue
}

/* ───── Header ───── */
.profile-header {
  background-color: $primary-color; // Utilise la couleur primaire de l'app (#4444ac)
  color: white;
  padding: 2rem;
  position: relative;

  .header-content {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    max-width: 1200px;
    margin: 0 auto;

    .user-avatar {
      width: 80px;
      height: 80px;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid rgba(255, 255, 255, 0.2);

      .material-icons {
        font-size: 2.5rem;
        color: white;
      }
    }

    .user-info {
      h1 {
        margin: 0 0 0.5rem 0;
        font-size: 2rem;
        font-weight: 700;
        font-family: $logo-font; // Même police que le logo APAJH
      }

      .user-email {
        margin: 0 0 0.5rem 0;
        font-size: 1.1rem;
        opacity: 0.9;
        color: #e2e8f0;
      }
    }
  }
}

.user-role {
  display: inline-block;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-weight: 500;
  font-size: 0.875rem;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
}

/* ───── Content ───── */
.profile-content {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.content-grid {
  display: grid;
  gap: 2rem;
  grid-template-columns: 1fr;

  @media (min-width: 1024px) {
    grid-template-columns: 1fr 1fr;
  }
}

.profile-section {
  background: white;
  border-radius: 8px; // Cohérent avec Login.vue
  padding: 2rem;
  border: 1px solid #e5e7eb; // Même bordure que Login.vue
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); // Ombre plus subtile
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
    transform: translateY(-2px);
  }
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #f1f5f9;

  h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #374151;
    display: flex;
    align-items: center;
    gap: 0.5rem;

    .material-icons {
      color: #667eea;
      font-size: 1.5rem;
    }
  }
}

.edit-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
  }

  .material-icons {
    font-size: 1.1rem;
  }
}

/* ───── Info Grid ───── */
.info-grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
}

.info-item {
  label {
    display: block;
    font-weight: 500;
    color: #6b7280;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  p {
    margin: 0;
    color: #111827;
    font-size: 1rem;
    padding: 0.75rem 1rem;
    background-color: #f9fafb;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
    min-height: 3rem;
    display: flex;
    align-items: center;

    &.role-display {
      color: white;
      font-weight: 500;

      &.role-admin {
        background: linear-gradient(135deg, #ef4444, #dc2626);
      }
      &.role-director {
        background: linear-gradient(135deg, #8b5cf6, #7c3aed);
      }
      &.role-service-manager {
        background: linear-gradient(135deg, #06b6d4, #0891b2);
      }
      &.role-secretary {
        background: linear-gradient(135deg, #10b981, #059669);
      }
      &.role-staff {
        background: linear-gradient(135deg, #f59e0b, #d97706);
      }
      &.role-parent {
        background: linear-gradient(135deg, #3b82f6, #2563eb);
      }
      &.role-child {
        background: linear-gradient(135deg, #ec4899, #db2777);
      }
    }

    &.otp-status {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 500;

      &.active {
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
      }

      .material-icons {
        font-size: 1.2rem;
      }
    }
  }
}

/* ───── OTP Section ───── */
.otp-content {
  .otp-description {
    margin-bottom: 1.5rem;
    
    p {
      color: #6b7280;
      line-height: 1.6;
      margin: 0;
    }
  }

  .otp-controls {
    margin-bottom: 1.5rem;
  }

  .toggle-container {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .toggle-switch {
    position: relative;
    display: inline-block;
    width: 60px;
    height: 30px;

    input {
      opacity: 0;
      width: 0;
      height: 0;

      &:checked + .toggle-slider {
        background-color: #667eea;

        &:before {
          transform: translateX(30px);
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
      border-radius: 30px;

      &:before {
        position: absolute;
        content: "";
        height: 22px;
        width: 22px;
        left: 4px;
        bottom: 4px;
        background-color: white;
        transition: 0.4s;
        border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }
    }
  }

  .toggle-label {
    font-weight: 500;
    color: #374151;
    font-size: 1rem;
  }

  .loading-indicator {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #6b7280;
    font-size: 0.875rem;

    .spinning {
      animation: spin 2s linear infinite;
    }
  }
}

.qr-section {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 2rem;
  text-align: center;

  .qr-container {
    margin-bottom: 1.5rem;

    .qr-code {
      max-width: 200px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
  }

  .qr-info {
    .qr-secret {
      font-family: 'Courier New', monospace;
      background: #e2e8f0;
      padding: 1rem;
      border-radius: 6px;
      font-size: 0.875rem;
      margin-bottom: 1rem;
      word-break: break-all;
      color: #374151;
    }

    .qr-instruction {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      color: #64748b;
      font-size: 0.875rem;
      margin: 0;
      line-height: 1.5;

      .material-icons {
        font-size: 1.2rem;
        color: #3b82f6;
      }
    }
  }
}

/* ───── Animations ───── */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ───── Responsive ───── */
@media (max-width: 768px) {
  .profile-header {
    padding: 1.5rem;

    .header-content {
      flex-direction: column;
      text-align: center;
      gap: 1rem;
    }
  }

  .profile-content {
    padding: 1rem;
  }

  .profile-section {
    padding: 1.5rem;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }
}
</style> 