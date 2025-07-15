<template>
  <div class="profile-container">
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
                {{ getRoleLabel(auth.user?.role, userProfile) }}
              </p>
            </div>
            <div class="info-item">
              <label>Compte créé le</label>
              <p>{{ formatDate(userProfile?.createdAt) }}</p>
            </div>
            <div class="info-item">
              <label>Prénom</label>
              <p>{{ userFirstName || 'Non renseigné' }}</p>
            </div>
            <div class="info-item">
              <label>Nom</label>
              <p>{{ userLastName || 'Non renseigné' }}</p>
            </div>
            <div v-if="userProfile?.phone" class="info-item">
              <label>Téléphone</label>
              <p>{{ userProfile.phone }}</p>
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
            
            <!-- Informations spécifiques au staff -->
            <div v-if="auth.user?.role === 'STAFF' && userProfile?.specialty" class="info-item">
              <label>Spécialité</label>
              <p>{{ userProfile.specialty }}</p>
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

        <!-- Enfants - Seulement pour les parents -->
        <div v-if="auth.user?.role === 'PARENT'" class="profile-section children-section">
          <div class="section-header">
            <h2>
              <i class="material-icons">child_care</i>
              Mes enfants inscrits
            </h2>
            <div class="info-note">
              <i class="material-icons">info</i>
              <span>Pour inscrire un nouvel enfant, contactez l'administration</span>
            </div>
          </div>

          <div v-if="children.length === 0" class="empty-state">
            <i class="material-icons">child_care</i>
            <p>Aucun enfant inscrit actuellement</p>
            <small>Contactez l'administration pour inscrire un enfant</small>
          </div>

          <div v-else class="children-grid">
            <div v-for="child in children" :key="child.id" class="child-card">
                             <div class="child-info">
                                  <div class="child-header">
                   <h3>{{ child.firstName }} {{ child.lastName }}</h3>
                   <button class="edit-child-btn" @click="openChildModal(child)" title="Corriger les informations">
                     <i class="material-icons">edit</i>
                   </button>
                 </div>
                <div class="child-details">
                  <div class="detail-item">
                    <label>Date de naissance</label>
                    <p>{{ formatDate(child.birthDate) }}</p>
                  </div>
                  <div class="detail-item">
                    <label>Âge</label>
                    <p>{{ calculateAge(child.birthDate) }} ans</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Contacts d'urgence - Seulement pour les parents -->
        <div v-if="auth.user?.role === 'PARENT'" class="profile-section contacts-section">
          <div class="section-header">
            <h2>
              <i class="material-icons">contact_phone</i>
              Mes contacts d'urgence
            </h2>
            <div class="info-note">
              <i class="material-icons">info</i>
              <span>Personnes à contacter en cas d'urgence concernant vos enfants</span>
            </div>
          </div>

          <div v-if="emergencyContacts.length === 0" class="empty-state">
            <i class="material-icons">contact_phone</i>
            <p>Aucun contact d'urgence enregistré</p>
            <small>Contactez l'administration pour ajouter des contacts</small>
          </div>

          <div v-else class="contacts-grid">
            <div v-for="contact in emergencyContacts" :key="contact.id" class="contact-card">
              <div class="contact-info">
                <div class="contact-header">
                  <h3>{{ contact.name }}</h3>
                  <button class="edit-contact-btn" @click="openContactModal(contact)" title="Corriger les informations">
                    <i class="material-icons">edit</i>
                  </button>
                </div>
                <div class="contact-details">
                  <div class="detail-item">
                    <label>Relation</label>
                    <p>{{ contact.relation }}</p>
                  </div>
                  <div class="detail-item">
                    <label>Téléphone</label>
                    <p>{{ contact.phone || 'Non renseigné' }}</p>
                  </div>
                </div>
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

    <!-- Modal de correction d'enfant -->
    <div v-if="showChildModal" class="modal-overlay" @click="closeChildModal">
      <div class="modal-content child-modal" @click.stop>
        <div class="modal-header">
          <h3>Corriger les informations de l'enfant</h3>
          <button class="close-btn" @click="closeChildModal">
            <i class="material-icons">close</i>
          </button>
        </div>
        
        <form @submit.prevent="saveChild" class="child-form">
          <div class="form-note">
            <i class="material-icons">info</i>
            <span>Vous pouvez corriger les informations en cas d'erreur</span>
          </div>
          
          <div class="form-group">
            <label for="childFirstName">Prénom *</label>
            <input
              id="childFirstName"
              v-model="childForm.firstName"
              type="text"
              required
              placeholder="Prénom de l'enfant"
            />
          </div>
          
          <div class="form-group">
            <label for="childLastName">Nom *</label>
            <input
              id="childLastName"
              v-model="childForm.lastName"
              type="text"
              required
              placeholder="Nom de l'enfant"
            />
          </div>
          
          <div class="form-group">
            <label for="childBirthDate">Date de naissance *</label>
            <input
              id="childBirthDate"
              v-model="childForm.birthDate"
              type="date"
              required
            />
          </div>
          
          <div class="modal-actions">
            <button type="button" class="btn-secondary" @click="closeChildModal">
              Annuler
            </button>
            <button type="submit" class="btn-primary" :disabled="childLoading">
              <i v-if="childLoading" class="material-icons spinning">hourglass_empty</i>
              Enregistrer les corrections
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal de correction de contact d'urgence -->
    <div v-if="showContactModal" class="modal-overlay" @click="closeContactModal">
      <div class="modal-content contact-modal" @click.stop>
        <div class="modal-header">
          <h3>Corriger les informations du contact</h3>
          <button class="close-btn" @click="closeContactModal">
            <i class="material-icons">close</i>
          </button>
        </div>
        
        <form @submit.prevent="saveContact" class="contact-form">
          <div class="form-note">
            <i class="material-icons">info</i>
            <span>Vous pouvez corriger les informations en cas d'erreur</span>
          </div>
          
          <div class="form-group">
            <label for="contactName">Nom complet *</label>
            <input
              id="contactName"
              v-model="contactForm.name"
              type="text"
              required
              placeholder="Nom du contact"
            />
          </div>
          
          <div class="form-group">
            <label for="contactRelation">Relation *</label>
            <input
              id="contactRelation"
              v-model="contactForm.relation"
              type="text"
              required
              placeholder="Ex: Grand-mère, Oncle, Ami proche..."
            />
          </div>
          
          <div class="form-group">
            <label for="contactPhone">Téléphone *</label>
            <input
              id="contactPhone"
              v-model="contactForm.phone"
              type="tel"
              required
              placeholder="06 12 34 56 78"
              pattern="[0-9\s\-\+\(\)]{10,}"
            />
          </div>
          
          <div class="modal-actions">
            <button type="button" class="btn-secondary" @click="closeContactModal">
              Annuler
            </button>
            <button type="submit" class="btn-primary" :disabled="contactLoading">
              <i v-if="contactLoading" class="material-icons spinning">hourglass_empty</i>
              Enregistrer les corrections
            </button>
          </div>
        </form>
      </div>
    </div>
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

// Enfants (modification autorisée pour correction d'erreurs)
const children = ref<any[]>([]);
const showChildModal = ref(false);
const editingChild = ref<any>(null);
const childLoading = ref(false);
const childForm = ref({
  firstName: '',
  lastName: '',
  birthDate: ''
});

// Contacts d'urgence (modification autorisée pour correction d'erreurs)
const emergencyContacts = ref<any[]>([]);
const showContactModal = ref(false);
const editingContact = ref<any>(null);
const contactLoading = ref(false);
const contactForm = ref({
  name: '',
  relation: '',
  phone: ''
});

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

function getRoleLabel(role: string | undefined, profile: any) {
  const roleLabels: Record<string, string> = {
    ADMIN: 'Administrateur',
    DIRECTOR: 'Directeur',
    SERVICE_MANAGER: 'Chef de Service',
    SECRETARY: 'Secrétaire',
    STAFF: 'Personnel',
    PARENT: 'Parent',
    CHILD: 'Enfant'
  };
  
  // Pour le staff, on peut être plus spécifique avec la discipline
  if (role === 'STAFF' && profile?.discipline) {
    const disciplineLabel = getDisciplineLabel(profile.discipline);
    return `${disciplineLabel}`;
  }
  
  return role ? roleLabels[role] || 'Utilisateur' : 'Utilisateur';
}

function getDisciplineLabel(discipline: string | undefined) {
  const disciplineLabels: Record<string, string> = {
    EDUCATOR: 'Éducateur',
    TECH_EDUCATOR: 'Éducateur Technique',
    PSYCHOLOGIST: 'Psychologue',
    PSYCHIATRIST: 'Psychiatre',
    ORTHOPEDIST: 'Orthopédiste'
  };
  return discipline ? disciplineLabels[discipline] || discipline : 'Non spécifié';
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
    // Le téléphone sera mis à jour automatiquement via le rechargement du profil
  }
  // Recharger le profil complet pour synchroniser toutes les données
  loadUserProfile();
  // Le message de succès est déjà affiché par le modal
}

// Edit profile function
async function openEditModal() {
  try {
    // Charger les données d'édition non masquées
    const response = await fetch('http://localhost:3000/auth/profile/edit', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      }
    });
    
    if (response.ok) {
      const editData = await response.json();
      userFirstName.value = editData.firstName || '';
      userLastName.value = editData.lastName || '';
      // Les données d'édition incluent le vrai téléphone
      if (!userProfile.value) userProfile.value = {};
      userProfile.value.firstName = editData.firstName;
      userProfile.value.lastName = editData.lastName;
      userProfile.value.phone = editData.phone; // Téléphone non masqué pour l'édition
      showEditModal.value = true;
    } else {
      console.error('Failed to load edit data - Status:', response.status);
      toast.error('Erreur lors du chargement des données d\'édition');
    }
  } catch (error) {
    console.error('Error loading edit data');
    toast.error('Erreur lors du chargement des données d\'édition');
  }
}

async function loadUserProfile() {
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch('http://localhost:3000/auth/profile', {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });
    
    if (response.ok) {
      userProfile.value = await response.json();
      userFirstName.value = userProfile.value.firstName || '';
      userLastName.value = userProfile.value.lastName || '';
      // Synchroniser l'état OTP avec la réponse de l'API
      otpEnabled.value = !!userProfile.value.otpEnabled;
      // Charger les enfants si c'est un parent
      if (userProfile.value.role === 'PARENT' && userProfile.value.children) {
        children.value = userProfile.value.children;
      }
      // Charger les contacts d'urgence si c'est un parent
      if (userProfile.value.role === 'PARENT' && userProfile.value.emergencyContacts) {
        emergencyContacts.value = userProfile.value.emergencyContacts;
      }
    } else {
      console.error('Failed to load profile - Status:', response.status);
      
      if (response.status === 401) {
        toast.error('Session expirée, veuillez vous reconnecter');
        // Optionally redirect to login
        // router.push('/login');
      }
    }
  } catch (error) {
    console.error('Error loading profile');
    toast.error('Erreur lors du chargement du profil');
  }
}

// OTP Functions
async function toggleOtp() {
  if (otpLoading.value) return;
  
  otpLoading.value = true;
  try {
    if (otpEnabled.value) {
      // Activer l'OTP - utiliser le store auth
      const data = await auth.enableOtp();
      if (data && data.secret) {
        secret.value = data.secret;
        qrCodeDataUrl.value = data.qrCodeDataUrl;
        // Mettre à jour l'état du profil pour synchronisation
        if (userProfile.value) userProfile.value.otpEnabled = true;
      }
    } else {
      // Désactiver l'OTP - utiliser le store auth
      await auth.disableOtp();
      qrCodeDataUrl.value = '';
      secret.value = '';
      // Mettre à jour l'état du profil pour synchronisation
      if (userProfile.value) userProfile.value.otpEnabled = false;
    }
  } catch (error) {
    console.error('Error toggling OTP');
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
    console.error('Error generating QR code');
  }
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*                               Children Functions                             */
/* ─────────────────────────────────────────────────────────────────────────── */

function calculateAge(birthDate: string) {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}

function openChildModal(child: any) {
  editingChild.value = child;
  childForm.value = {
    firstName: child.firstName,
    lastName: child.lastName,
    birthDate: child.birthDate.split('T')[0] // Format YYYY-MM-DD
  };
  showChildModal.value = true;
}

function closeChildModal() {
  showChildModal.value = false;
  editingChild.value = null;
  childForm.value = {
    firstName: '',
    lastName: '',
    birthDate: ''
  };
}

async function saveChild() {
  if (childLoading.value || !editingChild.value) return;
  
  childLoading.value = true;
  try {
    const response = await fetch(`http://localhost:3000/children/${editingChild.value.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(childForm.value)
    });

    if (response.ok) {
      const savedChild = await response.json();
      
      // Mettre à jour l'enfant existant dans la liste
      const index = children.value.findIndex(c => c.id === editingChild.value.id);
      if (index !== -1) {
        children.value[index] = savedChild;
      }
      
      toast.success('Informations de l\'enfant corrigées avec succès');
      closeChildModal();
      // Recharger le profil pour synchroniser
      await loadUserProfile();
    } else {
      console.error('Failed to update child - Status:', response.status);
      toast.error('Erreur lors de la correction des informations');
    }
  } catch (error) {
    console.error('Error updating child');
    toast.error('Erreur lors de la correction des informations');
  } finally {
    childLoading.value = false;
  }
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*                            Emergency Contacts Functions                     */
/* ─────────────────────────────────────────────────────────────────────────── */

function openContactModal(contact: any) {
  editingContact.value = contact;
  contactForm.value = {
    name: contact.name,
    relation: contact.relation,
    phone: contact.phone || ''
  };
  showContactModal.value = true;
}

function closeContactModal() {
  showContactModal.value = false;
  editingContact.value = null;
  contactForm.value = {
    name: '',
    relation: '',
    phone: ''
  };
}

async function saveContact() {
  if (contactLoading.value || !editingContact.value) return;
  
  contactLoading.value = true;
  try {
    // Récupérer l'ID du profil parent depuis l'utilisateur connecté
    const parentProfileId = userProfile.value?.id;
    if (!parentProfileId) {
      throw new Error('Profil parent non trouvé');
    }

    const response = await fetch(`http://localhost:3000/parents/${parentProfileId}/emergency-contacts/${editingContact.value.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(contactForm.value)
    });

    if (response.ok) {
      const savedContact = await response.json();
      
      // Mettre à jour le contact existant dans la liste
      const index = emergencyContacts.value.findIndex(c => c.id === editingContact.value.id);
      if (index !== -1) {
        emergencyContacts.value[index] = savedContact;
      }
      
      toast.success('Informations du contact corrigées avec succès');
      closeContactModal();
      // Recharger le profil pour synchroniser
      await loadUserProfile();
    } else {
      console.error('Failed to update contact - Status:', response.status);
      toast.error('Erreur lors de la correction des informations');
    }
  } catch (error) {
    console.error('Error updating contact');
    toast.error('Erreur lors de la correction des informations');
  } finally {
    contactLoading.value = false;
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



/* ───── Content ───── */
.profile-content {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  padding-top: 2rem; // Commencer plus haut sans le header
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
      color: $primary-color; // Cohérent avec la couleur primaire
      font-size: 1.5rem;
    }
  }
}

.edit-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: $primary-color; // Utilise la couleur primaire (#4444ac)
  color: white;
  border: none;
  border-radius: 4px; // Cohérent avec Login.vue
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.3s ease; // Même transition que Login.vue

  &:hover {
    background: color.adjust($primary-color, $lightness: -10%);
  }

  .material-icons {
    font-size: 1rem;
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
    color: #374151; // Même couleur que Login.vue
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
  }

  p {
    margin: 0;
    color: #111827; // Même couleur de texte que Login.vue
    font-size: 1rem;
    padding: 0.75rem 1rem;
    background-color: #f9fafb;
    border-radius: 4px; // Cohérent avec Login.vue
    border: 1px solid #e5e7eb; // Même bordure que Login.vue
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
        background: linear-gradient(135deg, #3b82f6, #2563eb);
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
      color: #6b7280; // Couleur de texte secondaire cohérente
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
        background-color: $primary-color; // Utilise la couleur primaire

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
  background: #f8fafc; // Même fond que l'application
  border: 1px solid #e5e7eb; // Même bordure que Login.vue
  border-radius: 8px; // Cohérent avec Login.vue
  padding: 2rem;
  text-align: center;

  .qr-container {
    margin-bottom: 1.5rem;

    .qr-code {
      max-width: 200px;
      border-radius: 4px; // Cohérent avec le design
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); // Ombre plus subtile
    }
  }

  .qr-info {
    .qr-secret {
      font-family: 'Courier New', monospace;
      background: #e5e7eb; // Cohérent avec les bordures
      padding: 1rem;
      border-radius: 4px; // Cohérent avec Login.vue
      font-size: 0.875rem;
      margin-bottom: 1rem;
      word-break: break-all;
      color: #374151; // Même couleur que Login.vue
    }

    .qr-instruction {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      color: #6b7280;
      font-size: 0.875rem;
      margin: 0;
      line-height: 1.5;

      .material-icons {
        font-size: 1.2rem;
        color: $primary-color; // Cohérent avec la couleur primaire
      }
    }
  }
}

/* ───── Children Section ───── */
.children-section {
  .info-note {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 6px;
    color: #1d4ed8;
    font-size: 0.875rem;

    .material-icons {
      font-size: 1rem;
    }
  }

  .empty-state {
    text-align: center;
    padding: 3rem 2rem;
    color: #6b7280;

    .material-icons {
      font-size: 3rem;
      margin-bottom: 1rem;
      opacity: 0.5;
    }

    small {
      display: block;
      margin-top: 0.5rem;
      font-size: 0.875rem;
      color: #9ca3af;
    }
  }

  .children-grid {
    display: grid;
    gap: 1.5rem;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  }

  .child-card {
    background: #f8fafc;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 1.5rem;
    transition: all 0.3s ease;

    &:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      transform: translateY(-2px);
    }

    .child-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;

      h3 {
        margin: 0;
        color: #374151;
        font-size: 1.125rem;
        font-weight: 600;
      }

      .edit-child-btn {
        background: transparent;
        border: none;
        color: $primary-color;
        cursor: pointer;
        padding: 0.5rem;
        border-radius: 4px;
        transition: background-color 0.3s ease;

        &:hover {
          background: rgba($primary-color, 0.1);
        }

        .material-icons {
          font-size: 1.2rem;
        }
      }
    }

    .child-details {
      display: grid;
      gap: 1rem;
      grid-template-columns: 1fr 1fr;

      .detail-item {
        label {
          display: block;
          font-size: 0.75rem;
          font-weight: 500;
          color: #6b7280;
          margin-bottom: 0.25rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        p {
          margin: 0;
          color: #374151;
          font-weight: 500;
        }
      }
    }
    }
}

/* ───── Modal Overlay ───── */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;

  .modal-content {
    background: white;
    border-radius: 8px;
    max-width: 500px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;

    &.child-modal {
      padding: 0;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 1px solid #e5e7eb;

      h3 {
        margin: 0;
        color: #374151;
        font-size: 1.25rem;
        font-weight: 600;
      }

      .close-btn {
        background: transparent;
        border: none;
        color: #6b7280;
        cursor: pointer;
        padding: 0.5rem;
        border-radius: 4px;
        transition: background-color 0.3s ease;

        &:hover {
          background: #f3f4f6;
        }
      }
    }

    .child-form {
      padding: 1.5rem;

      .form-note {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1rem;
        background: #f0f9ff;
        border: 1px solid #bae6fd;
        border-radius: 6px;
        color: #0369a1;
        font-size: 0.875rem;
        margin-bottom: 1.5rem;

        .material-icons {
          font-size: 1rem;
        }
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
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 1rem;
          transition: border-color 0.3s ease;

          &:focus {
            outline: none;
            border-color: $primary-color;
            box-shadow: 0 0 0 3px rgba($primary-color, 0.1);
          }
        }
      }

      .modal-actions {
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
        padding-top: 1rem;
        border-top: 1px solid #e5e7eb;

        button {
          padding: 0.75rem 1.5rem;
          border-radius: 4px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          border: none;
          display: flex;
          align-items: center;
          gap: 0.5rem;

          &.btn-secondary {
            background: #f3f4f6;
            color: #374151;

            &:hover {
              background: #e5e7eb;
            }
          }

          &.btn-primary {
            background: $primary-color;
            color: white;

            &:hover:not(:disabled) {
              background: color.adjust($primary-color, $lightness: -10%);
            }

            &:disabled {
              opacity: 0.6;
              cursor: not-allowed;
            }
          }

          .spinning {
            animation: spin 1s linear infinite;
          }
        }
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

  .children-section {
    .children-grid {
      grid-template-columns: 1fr;
    }

    .child-card .child-details {
      grid-template-columns: 1fr;
    }
  }

  .modal-overlay .modal-content {
    width: 95%;
    margin: 1rem;

    .modal-actions {
      flex-direction: column;
      
      button {
        width: 100%;
        justify-content: center;
      }
    }
  }
}
</style> 