<template>
  <div class="register-step">
    <div class="register-step__container">
      <h2 class="register-step__title">Création du compte</h2>

      <!-- Formulaire de création de compte -->
      <div class="register-step__section">
        <h3 class="register-step__subtitle">Informations de connexion</h3>
        <div class="register-step__grid register-step__grid--account">
          <BaseInput
            v-model="form.email"
            label="Email"
            type="email"
            :error="errors.email"
            :disabled="!!registerStore.inviteToken"
            class="register-step__email-input"
          />
          <BaseInput
            v-model="form.password"
            label="Mot de passe"
            type="password"
            :error="errors.password"
          />
          <BaseInput
            v-model="form.passwordConfirm"
            label="Confirmation du mot de passe"
            type="password"
            :error="errors.passwordConfirm"
          />
        </div>
      </div>

      <!-- Récapitulatif des informations -->
      <div class="register-step__summary">
        <h3 class="register-step__summary-title">
          Récapitulatif de votre inscription
        </h3>

        <!-- Informations parent -->
        <div class="register-step__summary-section">
          <h4 class="register-step__summary-subtitle">
            Informations du parent
          </h4>
          <div class="register-step__summary-content">
            <p class="register-step__summary-item">
              <span class="register-step__summary-label">Nom :</span>
              {{ form.firstName }} {{ form.lastName }}
            </p>
            <p class="register-step__summary-item">
              <span class="register-step__summary-label">Téléphone :</span>
              {{ form.phone }}
            </p>
            <p class="register-step__summary-item">
              <span class="register-step__summary-label"
                >Responsabilité légale :</span
              >
              {{ displayLegalResponsibility }}
            </p>
          </div>
        </div>

        <!-- Contacts d'urgence -->
        <div
          v-if="form.emergencyContacts.length > 0"
          class="register-step__summary-section"
        >
          <h4 class="register-step__summary-subtitle">
            Contacts d'urgence ({{ form.emergencyContacts.length }})
          </h4>
          <div class="register-step__summary-content">
            <div
              v-for="(contact, index) in formattedEmergencyContacts"
              :key="index"
              class="register-step__summary-item"
            >
              {{ contact.displayText }}
            </div>
          </div>
        </div>

        <!-- Enfants -->
        <div
          v-if="form.children.length > 0"
          class="register-step__summary-section"
        >
          <h4 class="register-step__summary-subtitle">
            Enfants ({{ form.children.length }})
          </h4>
          <div class="register-step__summary-content">
            <div
              v-for="(child, index) in formattedChildren"
              :key="index"
              class="register-step__summary-item"
            >
              {{ child.displayText }}
            </div>
          </div>
        </div>

        <!-- Email -->
        <div class="register-step__summary-section">
          <h4 class="register-step__summary-subtitle">Compte</h4>
          <p class="register-step__summary-item">
            <span class="register-step__summary-label">Email :</span>
            {{ form.email }}
          </p>
        </div>
      </div>

      <!-- Section RGPD et Consentements -->
      <div class="register-step__rgpd-section">
        <h3 class="register-step__subtitle">🔒 Consentements et Protection des Données</h3>
        
        <!-- Droit à l'image (optionnel) -->
        <div class="register-step__consent-block">
          <h4 class="register-step__consent-title">📸 Droit à l'image</h4>
          <div class="register-step__checkbox-container">
            <input 
              type="checkbox" 
              id="consent-image-rights" 
              v-model="form.consentImageRights"
              class="register-step__checkbox"
            />
            <label for="consent-image-rights" class="register-step__checkbox-label">
              <strong>J'autorise la prise et l'utilisation d'images de mon enfant</strong><br/>
              <span class="register-step__checkbox-description">
                Dans le cadre des activités éducatives, des photos peuvent être prises pour 
                documenter le parcours de votre enfant ou illustrer les activités de l'établissement.
                Cette autorisation est <em>optionnelle</em> et peut être modifiée à tout moment.
              </span>
            </label>
          </div>
        </div>

        <!-- Politique de confidentialité (obligatoire) -->
        <div class="register-step__consent-block">
          <h4 class="register-step__consent-title">📋 Politique de Confidentialité</h4>
          <div class="register-step__checkbox-container">
            <input 
              type="checkbox" 
              id="consent-privacy-policy" 
              v-model="form.consentPrivacyPolicy"
              class="register-step__checkbox"
              required
            />
            <label for="consent-privacy-policy" class="register-step__checkbox-label">
              <strong>J'accepte la politique de confidentialité (Obligatoire)</strong><br/>
              <span class="register-step__checkbox-description">
                J'ai lu et j'accepte la 
                <a href="/privacy" target="_blank" class="register-step__privacy-link">
                  politique de confidentialité
                </a> 
                de l'APAJH concernant la collecte, le traitement et la protection de mes données personnelles 
                et celles de mon enfant.
              </span>
            </label>
          </div>
          <div v-if="errors.consentPrivacyPolicy" class="register-step__error">
            {{ errors.consentPrivacyPolicy }}
          </div>
        </div>

        <!-- Informations RGPD -->
        <div class="register-step__rgpd-info">
          <p class="register-step__rgpd-text">
            <strong>🛡️ Vos droits RGPD :</strong> 
            Vous disposez d'un droit d'accès, de rectification, d'effacement, de portabilité 
            et d'opposition concernant vos données personnelles.
          </p>
          <p class="register-step__rgpd-text">
            <strong>📞 Contact DPO :</strong> dpo@apajh.org | 01 23 45 67 89 (Délai de réponse : 72h maximum)
          </p>
        </div>
      </div>

      <!-- Boutons de navigation -->
      <div class="register-step__nav-buttons">
        <button class="register-step__prev-btn" @click="goToStep2">
          Précédent
        </button>
        <button
          class="register-step__submit-btn"
          @click="handleSubmit"
          :disabled="registerStore.loading"
        >
          <span v-if="registerStore.loading" class="register-step__loading">
            <svg
              class="register-step__loading-icon"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="register-step__loading-circle"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="register-step__loading-path"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Création en cours...
          </span>
          <span v-else>Créer le compte</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, watch } from "vue";
import { useRegisterStore } from "@/stores/register";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseInput from "@/components/BaseInput.vue";

const registerStore = useRegisterStore();
const route = useRoute();
const router = useRouter();
const toast = useToast();

const errors = reactive({
  email: "",
  password: "",
  passwordConfirm: "",
  consentPrivacyPolicy: "",
});

// Créer une variable reactive locale avec des valeurs par défaut
const form = reactive({
  firstName: "",
  lastName: "",
  phone: "",
  address: {
    number: "",
    street: "",
    postal: "",
    city: "",
    country: "",
  },
  legalResponsibility: "",
  legalResponsibilityOther: "",
  emergencyContacts: [],
  children: [],
  email: "",
  password: "",
  passwordConfirm: "",
  consentImageRights: false,
  consentPrivacyPolicy: false,
});

// Synchroniser avec le store une fois qu'il est disponible
onMounted(async () => {
  // Vérification du token d'invitation
  const token = route.query.token;
  if (token) {
    await registerStore.validateToken(token);
  }

  // Copier les données du store vers le form local si elles existent
  if (registerStore.form) {
    Object.assign(form, registerStore.form);
  }
});

// Watcher pour synchroniser les changements du form local vers le store
watch(
  form,
  (newForm) => {
    if (registerStore.form) {
      Object.assign(registerStore.form, newForm);
    }
  },
  { deep: true }
);

// Computed properties pour l'affichage
const displayLegalResponsibility = computed(() => {
  if (form.legalResponsibility === "Autre") {
    return `Autre: ${form.legalResponsibilityOther}`;
  }
  return form.legalResponsibility;
});

const validEmergencyContacts = computed(() => {
  return form.emergencyContacts.filter(
    (c) => c.firstName && c.lastName && c.phone
  );
});

const validChildren = computed(() => {
  return form.children.filter((c) => c.firstName && c.lastName && c.birthDate);
});

const formattedEmergencyContacts = computed(() => {
  return validEmergencyContacts.value.map((contact) => ({
    ...contact,
    displayText: `${contact.firstName} ${contact.lastName} (${displayRelation(
      contact
    )}) - ${contact.phone}`,
  }));
});

const formattedChildren = computed(() => {
  return validChildren.value.map((child) => ({
    ...child,
    displayText: `${child.firstName} ${child.lastName} (${formatDate(
      child.birthDate
    )})`,
  }));
});

const displayRelation = (contact) => {
  if (contact.relation === "Autre") {
    return `Autre: ${contact.relationOther}`;
  }
  return contact.relation;
};

const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("fr-FR");
};

function validateForm() {
  // Réinitialiser les erreurs
  Object.assign(errors, {
    email: "",
    password: "",
    passwordConfirm: "",
    consentPrivacyPolicy: "",
  });

  let valid = true;

  if (!form.email || form.email.trim() === "") {
    errors.email = "L'email est requis";
    valid = false;
  } else {
    // Validation basique de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      errors.email = "Format d'email invalide";
      valid = false;
    }
  }

  if (!form.password || form.password.trim() === "") {
    errors.password = "Le mot de passe est requis";
    valid = false;
  } else if (form.password.length < 12) {
    errors.password = "Le mot de passe doit contenir au moins 12 caractères";
    valid = false;
  }

  if (!form.passwordConfirm || form.passwordConfirm.trim() === "") {
    errors.passwordConfirm = "La confirmation du mot de passe est requise";
    valid = false;
  } else if (form.password !== form.passwordConfirm) {
    errors.passwordConfirm = "Les mots de passe ne correspondent pas";
    valid = false;
  }

  // Validation obligatoire de la politique de confidentialité
  if (!form.consentPrivacyPolicy) {
    errors.consentPrivacyPolicy = "Vous devez accepter la politique de confidentialité pour continuer";
    valid = false;
  }

  return valid;
}

function goToStep2() {
  router.push({ path: "/register/step-two", query: route.query });
}

// Gestion de la soumission
const handleSubmit = async () => {
  if (!validateForm()) {
    toast.error("Veuillez corriger les erreurs dans le formulaire");
    return;
  }

  await registerStore.submitRegistration();
};
</script>

<style scoped lang="scss">
.register-step {
  width: 100%;
  min-height: 100vh;
  background-color: #f8fafc;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  &__container {
    width: 100%;
    max-width: 600px;
    padding: 48px;
    background-color: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    margin: 32px 0;
    box-sizing: border-box;
  }

  &__title {
    font-size: 1.5rem;
    font-weight: bold;
    margin-bottom: 1.5rem;
    color: #1e293b;
    text-align: center;
  }

  &__subtitle {
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: 1rem;
    color: #1e293b;
  }

  &__section {
    margin-bottom: 2rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  &__grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
    margin-bottom: 1.5rem;

    @media (min-width: 600px) {
      grid-template-columns: 1fr 1fr;
    }

    &--account {
      @media (min-width: 600px) {
        grid-template-columns: 1fr;
      }

      @media (min-width: 768px) {
        grid-template-columns: 1fr 1fr;
      }
    }
  }

  &__email-input {
    @media (min-width: 768px) {
      grid-column: 1 / -1;
    }
  }

  &__summary {
    background-color: #f8fafc;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }

  &__summary-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 1rem;
  }

  &__summary-section {
    margin-bottom: 1rem;

    &:last-child {
      margin-bottom: 0;
    }
  }

  &__summary-subtitle {
    font-weight: 500;
    color: #374151;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
  }

  &__summary-content {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  &__summary-item {
    font-size: 0.875rem;
    color: #6b7280;
    margin: 0;
    line-height: 1.4;
  }

  &__summary-label {
    font-weight: 500;
    color: #374151;
  }

  &__nav-buttons {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    margin-top: 2rem;
  }

  &__prev-btn,
  &__submit-btn {
    padding: 12px 32px;
    border: none;
    border-radius: 6px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    transition: background 0.2s, box-shadow 0.2s, transform 0.15s;

    &:hover:not(:disabled) {
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
      transform: translateY(-2px) scale(1.03);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }
  }

  &__prev-btn {
    background: #6b7280;
    color: #fff;

    &:hover {
      background: #4b5563;
    }
  }

  &__submit-btn {
    background: #16a34a;
    color: #fff;
    flex: 1;

    &:hover:not(:disabled) {
      background: #15803d;
    }
  }

  &__loading {
    display: flex;
    align-items: center;
    justify-content: center;
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

  // Styles pour la section RGPD
  &__rgpd-section {
    background-color: #f8fafc;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }

  &__consent-block {
    margin-bottom: 1.5rem;

    &:last-child {
      margin-bottom: 0;
    }
  }

  &__consent-title {
    font-size: 1rem;
    font-weight: 600;
    color: #374151;
    margin-bottom: 0.75rem;
  }

  &__checkbox-container {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
  }

  &__checkbox {
    width: 18px;
    height: 18px;
    margin: 0;
    cursor: pointer;
    accent-color: #16a34a;
    flex-shrink: 0;
    margin-top: 2px;
  }

  &__checkbox-label {
    cursor: pointer;
    font-size: 0.875rem;
    line-height: 1.5;
    color: #374151;
    margin: 0;
  }

  &__checkbox-description {
    color: #6b7280;
    font-size: 0.8rem;
    line-height: 1.4;
    margin-top: 0.25rem;
    display: block;
  }

  &__privacy-link {
    color: #3b82f6;
    text-decoration: underline;
    font-weight: 500;

    &:hover {
      color: #1d4ed8;
    }
  }

  &__rgpd-info {
    background-color: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 6px;
    padding: 1rem;
    margin-top: 1rem;
  }

  &__rgpd-text {
    font-size: 0.8rem;
    color: #1e40af;
    margin: 0;
    line-height: 1.4;

    &:not(:last-child) {
      margin-bottom: 0.5rem;
    }
  }

  &__error {
    color: #dc2626;
    font-size: 0.8rem;
    margin-top: 0.5rem;
    font-weight: 500;
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
</style>
