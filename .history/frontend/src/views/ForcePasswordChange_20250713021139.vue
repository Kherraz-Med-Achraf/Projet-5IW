<template>
  <div class="force-password-change">
    <div class="force-password-change__container">
      <div class="force-password-change__header">
        <h1 class="force-password-change__title">🔒 Mise à jour de sécurité requise</h1>
        <p class="force-password-change__subtitle">
          Votre mot de passe a expiré (plus de 60 jours). Pour votre sécurité, vous devez créer un nouveau mot de passe sécurisé.
        </p>
      </div>

      <form @submit.prevent="handleSubmit" class="force-password-change__form">
        <!-- Nouveau mot de passe -->
        <div class="force-password-change__section">
          <h2 class="force-password-change__section-title">Nouveau mot de passe sécurisé</h2>
          
          <div class="force-password-change__password-container">
            <BaseInput
              v-model="form.newPassword"
              label="Nouveau mot de passe"
              type="password"
              :error="errors.newPassword"
              @input="checkPasswordStrength"
              aria-describedby="password-strength-indicator"
              placeholder="Créez un mot de passe sécurisé"
            />
            
            <!-- Indicateur de force du mot de passe -->
            <div v-if="form.newPassword" class="force-password-change__password-strength">
              <div 
                class="force-password-change__strength-indicator" 
                :class="passwordStrength.class"
                role="progressbar"
                :aria-valuenow="passwordStrength.percentage"
                aria-valuemin="0"
                aria-valuemax="100"
                :aria-label="`Force du mot de passe: ${passwordStrength.text}`"
              >
                <div class="force-password-change__strength-bar" :style="{ width: passwordStrength.percentage + '%' }"></div>
              </div>
              <div 
                class="force-password-change__strength-text" 
                :class="passwordStrength.class"
                id="password-strength-indicator"
                aria-live="polite"
              >
                {{ passwordStrength.text }}
              </div>
              
              <!-- Exigences du mot de passe -->
              <div class="force-password-change__password-requirements" role="list" aria-label="Exigences du mot de passe">
                <div class="force-password-change__requirement" :class="{ 'met': passwordChecks.length }" role="listitem">
                  <span 
                    class="force-password-change__check-icon" 
                    :aria-label="passwordChecks.length ? 'Exigence remplie' : 'Exigence non remplie'"
                  >{{ passwordChecks.length ? '✓' : '✗' }}</span>
                  <span>Au moins 12 caractères</span>
                </div>
                <div class="force-password-change__requirement" :class="{ 'met': passwordChecks.uppercase }" role="listitem">
                  <span 
                    class="force-password-change__check-icon" 
                    :aria-label="passwordChecks.uppercase ? 'Exigence remplie' : 'Exigence non remplie'"
                  >{{ passwordChecks.uppercase ? '✓' : '✗' }}</span>
                  <span>Une majuscule (A-Z)</span>
                </div>
                <div class="force-password-change__requirement" :class="{ 'met': passwordChecks.lowercase }" role="listitem">
                  <span 
                    class="force-password-change__check-icon" 
                    :aria-label="passwordChecks.lowercase ? 'Exigence remplie' : 'Exigence non remplie'"
                  >{{ passwordChecks.lowercase ? '✓' : '✗' }}</span>
                  <span>Une minuscule (a-z)</span>
                </div>
                <div class="force-password-change__requirement" :class="{ 'met': passwordChecks.number }" role="listitem">
                  <span 
                    class="force-password-change__check-icon" 
                    :aria-label="passwordChecks.number ? 'Exigence remplie' : 'Exigence non remplie'"
                  >{{ passwordChecks.number ? '✓' : '✗' }}</span>
                  <span>Un chiffre (0-9)</span>
                </div>
                <div class="force-password-change__requirement" :class="{ 'met': passwordChecks.special }" role="listitem">
                  <span 
                    class="force-password-change__check-icon" 
                    :aria-label="passwordChecks.special ? 'Exigence remplie' : 'Exigence non remplie'"
                  >{{ passwordChecks.special ? '✓' : '✗' }}</span>
                  <span>Un caractère spécial (@$!%*?&)</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Confirmation du nouveau mot de passe -->
          <BaseInput
            v-model="form.confirmPassword"
            label="Confirmation du nouveau mot de passe"
            type="password"
            :error="errors.confirmPassword"
            placeholder="Confirmez votre nouveau mot de passe"
          />
        </div>

        <!-- Bouton de soumission -->
        <div class="force-password-change__actions">
          <button
            type="submit"
            class="force-password-change__submit-btn"
            :disabled="loading || !isFormValid"
            :aria-label="loading ? 'Mise à jour en cours' : 'Mettre à jour le mot de passe'"
          >
            <span v-if="loading" class="force-password-change__loading">
              <svg
                class="force-password-change__loading-icon"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  class="force-password-change__loading-circle"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="force-password-change__loading-path"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Mise à jour en cours...
            </span>
            <span v-else>🔐 Mettre à jour mon mot de passe</span>
          </button>
        </div>

        <!-- Informations de sécurité -->
        <div class="force-password-change__security-info">
          <div class="force-password-change__info-box">
            <h3 class="force-password-change__info-title">🛡️ Pourquoi cette mise à jour ?</h3>
            <ul class="force-password-change__info-list">
              <li>Votre mot de passe a plus de 60 jours</li>
              <li>Nous appliquons les meilleures pratiques de sécurité</li>
              <li>Cela protège vos données et celles des enfants</li>
              <li>Après la mise à jour, vous pourrez utiliser l'application normalement</li>
            </ul>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed, ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import BaseInput from '@/components/BaseInput.vue';
import { API_BASE_URL } from '@/utils/api';

const auth = useAuthStore();
const router = useRouter();
const toast = useToast();

const loading = ref(false); // ✅ CORRIGÉ : ref au lieu de reactive

const form = reactive({
  newPassword: '',
  confirmPassword: '',
});

const errors = reactive({
  newPassword: '',
  confirmPassword: '',
});

// État de la force du mot de passe (même que step 3 register)
const passwordChecks = reactive({
  length: false,
  uppercase: false,
  lowercase: false,
  number: false,
  special: false,
});

const passwordStrength = reactive({
  text: '',
  class: '',
  percentage: 0,
});

// Fonction pour vérifier la force du mot de passe (identique à step 3)
function checkPasswordStrength() {
  const password = form.newPassword;
  
  // Réinitialiser les vérifications
  passwordChecks.length = password.length >= 12;
  passwordChecks.uppercase = /[A-Z]/.test(password);
  passwordChecks.lowercase = /[a-z]/.test(password);
  passwordChecks.number = /[0-9]/.test(password);
  passwordChecks.special = /[@$!%*?&]/.test(password);
  
  // Calculer le score (nombre de critères remplis)
  const score = Object.values(passwordChecks).filter(Boolean).length;
  
  // Déterminer la force du mot de passe
  if (score === 0) {
    passwordStrength.text = '';
    passwordStrength.class = '';
    passwordStrength.percentage = 0;
  } else if (score <= 2) {
    passwordStrength.text = 'Mot de passe faible';
    passwordStrength.class = 'weak';
    passwordStrength.percentage = 25;
  } else if (score <= 4) {
    passwordStrength.text = 'Mot de passe moyen';
    passwordStrength.class = 'medium';
    passwordStrength.percentage = 60;
  } else {
    passwordStrength.text = 'Mot de passe sécurisé';
    passwordStrength.class = 'strong';
    passwordStrength.percentage = 100;
  }
}

// Validation du formulaire
const isFormValid = computed(() => {
  return (
    form.newPassword.length >= 12 &&
    Object.values(passwordChecks).every(Boolean) &&
    form.newPassword === form.confirmPassword
  );
});

function validateForm() {
  // Réinitialiser les erreurs
  Object.assign(errors, {
    newPassword: '',
    confirmPassword: '',
  });

  let valid = true;

  if (!form.newPassword.trim()) {
    errors.newPassword = 'Le nouveau mot de passe est requis';
    valid = false;
  } else if (form.newPassword.length < 12) {
    errors.newPassword = 'Le mot de passe doit contenir au moins 12 caractères';
    valid = false;
  } else {
    // Validation de la complexité du mot de passe
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
    if (!passwordRegex.test(form.newPassword)) {
      errors.newPassword = 'Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial';
      valid = false;
    }
  }

  if (!form.confirmPassword.trim()) {
    errors.confirmPassword = 'La confirmation du mot de passe est requise';
    valid = false;
  } else if (form.newPassword !== form.confirmPassword) {
    errors.confirmPassword = 'Les mots de passe ne correspondent pas';
    valid = false;
  }

  return valid;
}

// Gestion de la soumission
async function handleSubmit() {
  if (!validateForm()) {
    toast.error('Veuillez corriger les erreurs dans le formulaire');
    return;
  }

  loading.value = true;
  try {
    // Récupérer les credentials stockés temporairement
    const tempCredentials = sessionStorage.getItem('tempCredentials');
    let currentPassword = '';
    
    if (tempCredentials) {
      const creds = JSON.parse(tempCredentials);
      currentPassword = creds.password;
      // Nettoyer les credentials temporaires
      sessionStorage.removeItem('tempCredentials');
    }

    // Obtenir le token CSRF des cookies
    const getCsrfTokenFromCookies = () => {
      const cookies = document.cookie.split(';');
      for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'csrf_token') {
          return value;
        }
      }
      return null;
    };

    const csrfToken = getCsrfTokenFromCookies();
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`,
    };
    if (csrfToken) {
      headers['x-csrf-token'] = csrfToken;
    }

    const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        currentPassword: currentPassword, // ✅ Utilise le mot de passe de session
        newPassword: form.newPassword,
      }),
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Erreur lors de la mise à jour du mot de passe');
    }

    toast.success('🎉 Mot de passe mis à jour avec succès ! Vous pouvez maintenant utiliser l\'application.');
    
    // Rediriger vers la page d'accueil
    router.push('/home');
  } catch (error) {
    console.error('Erreur changement mot de passe:', error);
    toast.error(error.message || 'Erreur lors de la mise à jour du mot de passe');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped lang="scss">
.force-password-change {
  width: 100%;
  min-height: 100vh;
  background-color: #f8fafc;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  padding: 2rem 1rem;

  &__container {
    width: 100%;
    max-width: 600px;
    background-color: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    overflow: hidden;
  }

  &__header {
    background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
    color: white;
    padding: 2rem;
    text-align: center;
  }

  &__title {
    font-size: 1.75rem;
    font-weight: bold;
    margin-bottom: 0.75rem;
    color: white;
  }

  &__subtitle {
    font-size: 1rem;
    opacity: 0.95;
    line-height: 1.6;
    margin: 0;
  }

  &__form {
    padding: 2rem;
  }

  &__section {
    margin-bottom: 2rem;

    &:last-of-type {
      margin-bottom: 1.5rem;
    }
  }

  &__section-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;

    &::before {
      content: '🔑';
      font-size: 1rem;
    }
  }

  &__password-container {
    width: 100%;
  }

  &__password-strength {
    margin-top: 0.75rem;
    padding: 0.75rem;
    background-color: #f8fafc;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
  }

  &__strength-indicator {
    height: 8px;
    background-color: #e5e7eb;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 0.5rem;
  }

  &__strength-bar {
    height: 100%;
    transition: width 0.3s ease, background-color 0.3s ease;
    border-radius: 4px;
  }

  &__strength-text {
    font-size: 0.875rem;
    font-weight: 600;
    margin-bottom: 0.75rem;
    text-align: center;

    &.weak {
      color: #dc2626;
    }

    &.medium {
      color: #f59e0b;
    }

    &.strong {
      color: #16a34a;
    }
  }

  &__strength-indicator.weak .force-password-change__strength-bar {
    background-color: #dc2626;
  }

  &__strength-indicator.medium .force-password-change__strength-bar {
    background-color: #f59e0b;
  }

  &__strength-indicator.strong .force-password-change__strength-bar {
    background-color: #16a34a;
  }

  &__password-requirements {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.375rem;
  }

  &__requirement {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: #4b5563;
    transition: color 0.3s ease;

    &.met {
      color: #16a34a;
      font-weight: 500;
    }
  }

  &__check-icon {
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    font-size: 0.75rem;
    font-weight: bold;
    transition: all 0.3s ease;
    background-color: #e5e7eb;
    color: #6b7280;
    flex-shrink: 0;

    .force-password-change__requirement.met & {
      background-color: #16a34a;
      color: #fff;
    }
  }

  &__actions {
    margin-bottom: 1.5rem;
  }

  &__submit-btn {
    width: 100%;
    background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
    color: white;
    border: none;
    border-radius: 8px;
    padding: 1rem;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;

    &:hover:not(:disabled) {
      background: linear-gradient(135deg, #15803d 0%, #166534 100%);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(34, 197, 94, 0.25);
    }

    &:disabled {
      background: #9ca3af;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    &:focus {
      outline: 2px solid #16a34a;
      outline-offset: 2px;
    }
  }

  &__loading {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  &__loading-icon {
    width: 20px;
    height: 20px;
    animation: spin 1s linear infinite;
  }

  &__loading-circle {
    opacity: 0.25;
  }

  &__loading-path {
    opacity: 0.75;
  }

  &__security-info {
    background-color: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 8px;
    overflow: hidden;
  }

  &__info-box {
    padding: 1.5rem;
  }

  &__info-title {
    font-size: 1rem;
    font-weight: 600;
    color: #1e40af;
    margin-bottom: 0.75rem;
  }

  &__info-list {
    list-style: none;
    padding: 0;
    margin: 0;
    color: #1e40af;
    font-size: 0.875rem;
    line-height: 1.5;

    li {
      margin-bottom: 0.5rem;
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;

      &:before {
        content: '✓';
        color: #16a34a;
        font-weight: bold;
        flex-shrink: 0;
        margin-top: 1px;
      }

      &:last-child {
        margin-bottom: 0;
      }
    }
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 640px) {
  .force-password-change {
    padding: 1rem;

    &__container {
      border-radius: 8px;
    }

    &__header,
    &__form {
      padding: 1.5rem;
    }

    &__title {
      font-size: 1.5rem;
    }
  }
}
</style> 