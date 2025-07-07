<template>
  <div class="register-step">
    <div class="register-step__container">
      <h1 class="register-step__title">Informations des enfants</h1>

      <!-- Liste des enfants -->
      <div class="register-step__section">
        <div
          v-for="(child, index) in form.children"
          :key="`child-${index}`"
          class="register-step__child-item"
        >
          <h2 class="register-step__child-title">Enfant {{ index + 1 }}</h2>
          <div class="register-step__grid">
            <BaseInput
              v-model="child.firstName"
              label="Prénom"
              :error="errors.children && errors.children[index]?.firstName"
            />
            <BaseInput
              v-model="child.lastName"
              label="Nom"
              :error="errors.children && errors.children[index]?.lastName"
            />
            <BaseInput
              v-model="child.birthDate"
              label="Date de naissance"
              type="date"
              :error="errors.children && errors.children[index]?.birthDate"
            />
          </div>

          <button 
            class="register-step__remove-btn" 
            @click="removeChild(index)"
            :aria-label="`Supprimer l'enfant ${index + 1} (${child.firstName} ${child.lastName})`"
            type="button"
          >
            ✕
          </button>
        </div>

        <button 
          class="register-step__add-btn" 
          @click="addChild"
          type="button"
        >
          + Ajouter un enfant
        </button>
      </div>

      <!-- Message d'information -->
      <div class="register-step__info-box" role="note" aria-label="Information importante">
        <div class="register-step__info-content">
          <div class="register-step__info-icon" aria-hidden="true">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path
                fill-rule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
          <div class="register-step__info-text">
            <h2 class="register-step__info-title">Information importante</h2>
            <p class="register-step__info-description">
              Chaque enfant doit avoir un âge situé entre 9 et 20 ans pour
              pouvoir s'inscrire au service de garde.
            </p>
          </div>
        </div>
      </div>

      <!-- Message si aucun enfant -->
      <div v-if="form.children.length === 0" class="register-step__empty-state" role="status">
        <div class="register-step__empty-icon" aria-hidden="true">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-2.239"
            />
          </svg>
        </div>
        <p class="register-step__empty-title">Aucun enfant ajouté</p>
        <p class="register-step__empty-description">
          Cliquez sur "Ajouter un enfant" pour commencer
        </p>
      </div>

      <!-- Boutons de navigation -->
      <div class="register-step__nav-buttons">
        <button 
          class="register-step__prev-btn" 
          @click="goToStep1"
          type="button"
          @keydown.enter="goToStep1"
        >
          Précédent
        </button>
        <button 
          class="register-step__next-btn" 
          @click="goToStep3"
          type="button"
          @keydown.enter="goToStep3"
        >
          Suivant
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRegisterStore } from "@/stores/register";
import BaseInput from "@/components/BaseInput.vue";
import { useRouter, useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import { reactive, onMounted, watch } from "vue";

const registerStore = useRegisterStore();
const router = useRouter();
const route = useRoute();
const toast = useToast();

const errors = reactive({
  children: [],
});

// Créer une variable reactive locale avec des valeurs par défaut
const form = reactive({
  children: [],
});

// Synchroniser avec le store une fois qu'il est disponible
onMounted(() => {
  // Copier les données du store vers le form local si elles existent
  if (registerStore.form && registerStore.form.children) {
    form.children = [...registerStore.form.children];
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

function addChild() {
  form.children.push({
    firstName: "",
    lastName: "",
    birthDate: "",
  });
}

function removeChild(index) {
  form.children.splice(index, 1);
}

function validateForm() {
  // Réinitialiser les erreurs
  errors.children = [];

  let valid = true;

  if (!form.children.length) {
    return false;
  }

  form.children.forEach((child, i) => {
    const childErr = {};

    // Vérifier que tous les champs requis sont remplis
    if (!child.firstName || child.firstName.trim() === "") {
      childErr.firstName = "Prénom requis";
    }
    if (!child.lastName || child.lastName.trim() === "") {
      childErr.lastName = "Nom requis";
    }
    if (!child.birthDate || child.birthDate.trim() === "") {
      childErr.birthDate = "Date de naissance requise";
    } else {
      const birthDate = new Date(child.birthDate);
      const today = new Date();
      
      // Vérifier que la date n'est pas dans le futur
      if (birthDate > today) {
        childErr.birthDate = "La date de naissance ne peut pas être dans le futur";
      } else {
        // Vérifier l'âge (entre 9 et 20 ans)
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        if (
          monthDiff < 0 ||
          (monthDiff === 0 && today.getDate() < birthDate.getDate())
        ) {
          age--;
        }

        if (age < 9 || age > 20) {
          childErr.birthDate = "L'enfant doit avoir entre 9 et 20 ans";
        } else if (age > 100) {
          childErr.birthDate = "Date de naissance invalide";
        }
      }
    }

    errors.children[i] = childErr;
    if (Object.keys(childErr).length) valid = false;
  });

  return valid;
}

function goToStep1() {
  router.push({ path: "/register/step-one", query: route.query });
}

function goToStep3() {
  if (!validateForm()) {
    if (!form.children.length) {
      toast.error("Ajoutez au moins un enfant");
      return;
    }
    toast.error(
      "Veuillez remplir tous les champs obligatoires et vérifier l'âge des enfants (entre 9 et 20 ans)."
    );
    return;
  }
  router.push({ path: "/register/step-three", query: route.query });
}
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
  font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

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

  &__child-title {
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 1rem;
    color: #1e293b;
  }

  &__grid {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 1.5rem;
    @media (min-width: 600px) {
      flex-basis: calc(50% - 1rem);
    }
    @media (min-width: 768px) {
      flex-basis: calc(33.333% - 1rem);
    }
  }

  &__section {
    margin-bottom: 2rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  &__child-item {
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1rem;
    position: relative;
    background: #f9f9f9;
  }

  &__remove-btn {
    position: absolute;
    top: 8px;
    right: 8px;
    background: #e53e3e;
    color: #fff;
    border: none;
    border-radius: 50%;
    width: 28px;
    height: 28px;
    cursor: pointer;
    font-size: 1.1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(229, 62, 62, 0.08);
    transition: background 0.2s, box-shadow 0.2s, transform 0.15s;
    &:hover {
      background: #b91c1c;
      box-shadow: 0 4px 16px rgba(229, 62, 62, 0.18);
      transform: scale(1.08);
    }
  }

  &__add-btn {
    width: fit-content;
    margin-top: 1rem;
    background: #2563eb;
    color: #fff;
    border: none;
    border-radius: 6px;
    padding: 10px;
    font-size: 1rem;
    cursor: pointer;
    transition: background 0.2s;
    &:hover {
      background: #1d4ed8;
    }
  }

  &__info-box {
    background-color: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1.5rem;
  }

  &__info-content {
    display: flex;
    gap: 0.75rem;
  }

  &__info-icon {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    color: #3b82f6;

    svg {
      width: 100%;
      height: 100%;
    }
  }

  &__info-text {
    flex: 1;
  }

  &__info-title {
    font-size: 0.875rem;
    font-weight: 500;
    color: #1e40af;
    margin-bottom: 0.5rem;
  }

  &__info-description {
    font-size: 0.875rem;
    color: #1d4ed8;
    line-height: 1.4;
  }

  &__empty-state {
    text-align: center;
    padding: 2rem 0;
  }

  &__empty-icon {
    width: 64px;
    height: 64px;
    margin: 0 auto 1rem auto;
    color: #9ca3af;

    svg {
      width: 100%;
      height: 100%;
    }
  }

  &__empty-title {
    color: #6b7280;
    font-size: 1rem;
    margin-bottom: 0.25rem;
  }

  &__empty-description {
    font-size: 0.875rem;
    color: #9ca3af;
  }

  &__nav-buttons {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    margin-top: 2rem;
  }

  &__prev-btn,
  &__next-btn {
    padding: 12px 32px;
    border: none;
    border-radius: 6px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    transition: background 0.2s, box-shadow 0.2s, transform 0.15s;

    &:hover {
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
      transform: translateY(-2px) scale(1.03);
    }
  }

  &__prev-btn {
    background: #6b7280;
    color: #fff;

    &:hover {
      background: #4b5563;
    }
  }

  &__next-btn {
    display: block;
    margin: 2rem auto 0 auto;
    padding: 12px 32px;
    background: #2563eb;
    color: #fff;
    border: none;
    border-radius: 6px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(37, 99, 235, 0.08);
    transition: background 0.2s, box-shadow 0.2s, transform 0.15s;

    &:hover {
      background: #1d4ed8;
      box-shadow: 0 4px 16px rgba(37, 99, 235, 0.18);
      transform: translateY(-1px);
    }

    &:focus {
      outline: none;
      box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.3);
    }

    &:active {
      transform: translateY(0);
    }
  }

  &__prev-btn {
    background: #6b7280;
    color: #fff;
    border: none;
    border-radius: 6px;
    padding: 12px 32px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(107, 114, 128, 0.08);
    transition: background 0.2s, box-shadow 0.2s, transform 0.15s;

    &:hover {
      background: #4b5563;
      box-shadow: 0 4px 16px rgba(107, 114, 128, 0.18);
      transform: translateY(-1px);
    }

    &:focus {
      outline: none;
      box-shadow: 0 0 0 2px rgba(107, 114, 128, 0.3);
    }

    &:active {
      transform: translateY(0);
    }
  }

  // Amélioration de l'accessibilité pour les boutons
  &__remove-btn:focus,
  &__add-btn:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.3);
  }

  &__remove-btn:focus-visible,
  &__add-btn:focus-visible,
  &__prev-btn:focus-visible,
  &__next-btn:focus-visible {
    outline: 2px solid #2563eb;
    outline-offset: 2px;
  }
}
</style>
