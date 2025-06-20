<template>
  <div class="register-step">
    <div class="register-step__container">
      <h2 class="register-step__title">Informations du parent</h2>
      <h3 class="register-step__subtitle">Informations personnelles</h3>
      <!-- Informations personnelles -->
      <div class="register-step__grid">
        <BaseInput
          v-model="form.firstName"
          label="Prénom"
          :error="errors.firstName"
        />
        <BaseInput
          v-model="form.lastName"
          label="Nom"
          :error="errors.lastName"
        />
        <BaseInput
          v-model="form.phone"
          label="Téléphone (+33)"
          :error="errors.phone"
        />
      </div>
      <h3 class="register-step__subtitle">Adresse</h3>
      <!-- Adresse -->
      <div class="register-step__grid">
        <BaseInput
          v-model="form.address.number"
          type="number"
          label="N° de rue"
          :error="errors.addressNumber"
        />
        <BaseInput
          v-model="form.address.street"
          label="Rue"
          :error="errors.addressStreet"
        />
        <BaseInput
          v-model="form.address.postal"
          label="Code postal"
          :error="errors.addressPostal"
        />
        <BaseInput
          v-model="form.address.city"
          label="Ville"
          :error="errors.addressCity"
        />
        <BaseInput
          v-model="form.address.country"
          label="Pays"
          :error="errors.addressCountry"
        />
      </div>

      <h3 class="register-step__subtitle">Responsabilité légale</h3>
      <!-- Responsabilité légale -->
      <div class="register-step__section">
        <div class="register-step__select-wrapper">
          <label>Responsabilité légale</label>
          <select
            v-model="form.legalResponsibility"
            :class="{ error: errors.legalResponsibility }"
          >
            <option disabled value="">Choisir…</option>
            <option>Mère</option>
            <option>Père</option>
            <option>Tuteurs légaux</option>
            <option>Service d'aide sociale</option>
            <option>Autre</option>
          </select>
          <span v-if="errors.legalResponsibility" class="error-message">
            {{ errors.legalResponsibility }}
          </span>
        </div>
        <BaseInput
          v-if="form.legalResponsibility === 'Autre'"
          v-model="form.legalResponsibilityOther"
          label="Précisez"
          class="register-step__input-other"
          :error="errors.legalResponsibilityOther"
        />
      </div>

      <!-- Contacts d'urgence -->
      <div class="register-step__section">
        <h3 class="register-step__subtitle">Contacts d'urgence</h3>
        <div
          v-for="(contact, index) in form.emergencyContacts"
          :key="`ec-${index}`"
          class="register-step__emergency-item"
        >
          <h4 class="register-step__subtitle">
            Contact d'urgence {{ index + 1 }}
          </h4>
          <div class="register-step__grid">
            <BaseInput
              v-model="contact.firstName"
              label="Prénom"
              :error="
                errors.emergencyContacts &&
                errors.emergencyContacts[index]?.firstName
              "
            />
            <BaseInput
              v-model="contact.lastName"
              label="Nom"
              :error="
                errors.emergencyContacts &&
                errors.emergencyContacts[index]?.lastName
              "
            />
            <div class="register-step__relation">
              <label>Lien</label>
              <div class="register-step__select-wrapper">
                <select
                  v-model="contact.relation"
                  :class="{
                    error:
                      errors.emergencyContacts &&
                      errors.emergencyContacts[index]?.relation,
                  }"
                >
                  <option disabled value="">Relation…</option>
                  <option>Mère</option>
                  <option>Père</option>
                  <option>Sœur</option>
                  <option>Frère</option>
                  <option>Grand-parent</option>
                  <option>Oncle / Tante</option>
                  <option>Cousin·e</option>
                  <option>Ami·e de la famille</option>
                  <option>Voisin·e</option>
                  <option>Autre</option>
                </select>
                <span
                  v-if="
                    errors.emergencyContacts &&
                    errors.emergencyContacts[index]?.relation
                  "
                  class="error-message"
                >
                  {{ errors.emergencyContacts[index].relation }}
                </span>
              </div>
              <BaseInput
                v-if="contact.relation === 'Autre'"
                v-model="contact.relationOther"
                label="Précisez"
                class="register-step__input-other"
                :error="
                  errors.emergencyContacts &&
                  errors.emergencyContacts[index]?.relationOther
                "
              />
            </div>
            <BaseInput
              v-model="contact.phone"
              label="Téléphone"
              :error="
                errors.emergencyContacts &&
                errors.emergencyContacts[index]?.phone
              "
            />
          </div>
          <button
            class="register-step__remove-btn"
            @click="registerStore.removeEmergencyContact(index)"
          >
            ✕
          </button>
        </div>
        <button
          class="register-step__add-btn"
          @click="registerStore.addEmergencyContact"
        >
          + Ajouter un contact d'urgence
        </button>
      </div>
      <button class="register-step__next-btn" @click="goToStep2">
        Suivant
      </button>
    </div>
  </div>
</template>

<script setup>
import { useRegisterStore } from "@/stores/register";
import BaseInput from "@/components/BaseInput.vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { ref, reactive, onMounted, watch } from "vue";

const registerStore = useRegisterStore();
const router = useRouter();
const toast = useToast();

const errors = reactive({
  firstName: "",
  lastName: "",
  phone: "",
  addressNumber: "",
  addressStreet: "",
  addressPostal: "",
  addressCity: "",
  addressCountry: "",
  legalResponsibility: "",
  legalResponsibilityOther: "",
  emergencyContacts: [],
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
});

// Synchroniser avec le store une fois qu'il est disponible
onMounted(() => {
  // Copier les données du store vers le form local si elles existent
  if (registerStore.form) {
    // Copier les données existantes du store
    if (registerStore.form.firstName)
      form.firstName = registerStore.form.firstName;
    if (registerStore.form.lastName)
      form.lastName = registerStore.form.lastName;
    if (registerStore.form.phone) form.phone = registerStore.form.phone;
    if (registerStore.form.address) {
      Object.assign(form.address, registerStore.form.address);
    }
    if (registerStore.form.legalResponsibility)
      form.legalResponsibility = registerStore.form.legalResponsibility;
    if (registerStore.form.legalResponsibilityOther)
      form.legalResponsibilityOther =
        registerStore.form.legalResponsibilityOther;
    if (registerStore.form.emergencyContacts)
      form.emergencyContacts = [...registerStore.form.emergencyContacts];
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

function validateForm() {
  // Réinitialiser les erreurs
  Object.assign(errors, {
    firstName: "",
    lastName: "",
    phone: "",
    addressNumber: "",
    addressStreet: "",
    addressPostal: "",
    addressCity: "",
    addressCountry: "",
    legalResponsibility: "",
    legalResponsibilityOther: "",
    emergencyContacts: [],
  });

  let valid = true;
  const f = form;
  if (!f.firstName) {
    errors.firstName = "Le prénom est requis";
    valid = false;
  }
  if (!f.lastName) {
    errors.lastName = "Le nom est requis";
    valid = false;
  }
  if (!f.phone) {
    errors.phone = "Le téléphone est requis";
    valid = false;
  }
  if (!f.address.number) {
    errors.addressNumber = "Numéro de rue requis";
    valid = false;
  }
  if (!f.address.street) {
    errors.addressStreet = "Rue requise";
    valid = false;
  }
  if (!f.address.postal) {
    errors.addressPostal = "Code postal requis";
    valid = false;
  }
  if (!f.address.city) {
    errors.addressCity = "Ville requise";
    valid = false;
  }
  if (!f.address.country) {
    errors.addressCountry = "Pays requis";
    valid = false;
  }
  if (!f.legalResponsibility || f.legalResponsibility === "") {
    errors.legalResponsibility =
      "Veuillez sélectionner une responsabilité légale";
    valid = false;
  }
  if (f.legalResponsibility === "Autre" && !f.legalResponsibilityOther) {
    errors.legalResponsibilityOther = "Précisez la responsabilité";
    valid = false;
  }
  // Validation des contacts d'urgence (0 à 2) ; s'ils sont renseignés ils doivent être complets
  if (f.emergencyContacts.length > 2) {
    errors.emergencyContacts = "Maximum 2 contacts d'urgence";
    valid = false;
  } else {
    errors.emergencyContacts = [];
    f.emergencyContacts.forEach((c, i) => {
      const contactErr = {};

      // Vérifier que tous les champs requis sont remplis
      if (!c.firstName || c.firstName.trim() === "") {
        contactErr.firstName = "Prénom requis";
      }
      if (!c.lastName || c.lastName.trim() === "") {
        contactErr.lastName = "Nom requis";
      }
      if (!c.phone || c.phone.trim() === "") {
        contactErr.phone = "Téléphone requis";
      }

      // Vérifier que le champ select "relation" est sélectionné
      if (!c.relation || c.relation === "") {
        contactErr.relation = "Veuillez sélectionner une relation";
      } else if (
        c.relation === "Autre" &&
        (!c.relationOther || c.relationOther.trim() === "")
      ) {
        contactErr.relationOther = "Précisez le lien";
      }

      errors.emergencyContacts[i] = contactErr;
      if (Object.keys(contactErr).length) valid = false;
    });
  }
  return valid;
}

function goToStep2() {
  if (!validateForm()) {
    toast.error("Veuillez remplir tous les champs obligatoires.");
    return;
  }
  router.push("/register/step-two");
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
  &__grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
    margin-bottom: 1.5rem;
    @media (min-width: 600px) {
      grid-template-columns: 1fr 1fr;
    }
  }
  &__section {
    margin-bottom: 2rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  &__input-other {
    margin-top: 0.5rem;
  }
  &__emergency-item {
    border: 1px solid $border-color;
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1rem;
    position: relative;
    background: #f9f9f9;
  }
  &__relation {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
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
  &__select-wrapper {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;

    label {
      font-weight: 500;
      color: #1e293b;
      font-size: 0.875rem;
    }

    select {
      appearance: none;
      background-color: #fff;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      padding: 0.75rem;
      font-size: 1rem;
      color: #1e293b;
      cursor: pointer;
      transition: border-color 0.2s;
      width: 100%;

      &:hover {
        border-color: #9ca3af;
      }

      &:focus {
        outline: none;
        border-color: #2563eb;
        box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
      }

      &.error {
        border-color: #dc2626;

        &:focus {
          border-color: #dc2626;
          box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.1);
        }
      }
    }
    &::after {
      content: "";
      position: absolute;
      right: 1rem;
      top: 50%;
      transform: translateY(-50%);
      width: 0;
      height: 0;
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
      border-top: 5px solid $border-color;
      pointer-events: none;
    }

    .error-message {
      color: #dc2626;
      font-size: 0.875rem;
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
      transform: translateY(-2px) scale(1.03);
    }
  }
}
</style>
