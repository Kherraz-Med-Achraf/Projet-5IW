<template>
  <div class="login">
    <div class="login-top">
      <h1 class="logo">APAJH</h1>
      <h2>Veuillez entrer vos identifiants pour vous connecter.</h2>
    </div>
    <div class="login-container">
      <form @submit.prevent="onSubmit">
        <div class="form-group">
          <label>Email</label>
          <input
            v-model="email"
            @blur="email = email.trim().toLowerCase()"
            type="email"
            required
          />
        </div>
        <div class="form-group">
          <label>Mot de passe</label>
          <input v-model="password" type="password" required />
        </div>
        <button type="submit" :disabled="auth.loading">Se connecter</button>
      </form>
      <p style="margin-top: 1rem">
        <router-link to="/forgot-password">Mot de passe oublié ?</router-link>
      </p>

      <div v-if="showOtpModal" class="modal">
        <div class="modal-content">
          <h2>Entrez votre code OTP</h2>
          <input v-model="otpCode" type="text" placeholder="Code OTP" />
          <button @click="submitOtp" :disabled="auth.loading">Valider</button>
          <button @click="closeOtpModal" :disabled="auth.loading">
            Annuler
          </button>
        </div>
      </div>
    </div>
    <div class="login-bottom">
      <p>
        Vous n'avez pas de compte ?
        <router-link to="/register">Contactez l'administrateur</router-link>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useAuthSecureStore as useAuthStore } from "@/stores/authSecure";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";

const email = ref("");
const password = ref("");
const otpCode = ref("");
const showOtpModal = ref(false);
const auth = useAuthStore();
const router = useRouter();
const toast = useToast();

async function onSubmit() {
  auth.error = "";
  const res = await auth.login({
    email: email.value,
    password: password.value,
  });
  console.log("[Login.vue] login response →", res);
  
  if (res.requiresOtp) {
    showOtpModal.value = true;
    toast.info("Veuillez saisir votre code OTP");
  } else if (res.success) {
    toast.success("Vous êtes connecté !");
    router.push("/home");
  } else {
    toast.error(res.error || "La connexion a échoué.");
  }
}

async function submitOtp() {
  if (!otpCode.value) {
    toast.error("Veuillez saisir votre code OTP");
    return;
  }
  const res = await auth.verifyOtp({
    tempToken: auth.tempToken!,
    otpCode: otpCode.value,
  });
  console.log("[Login.vue] verifyOtp response →", res);
  if (res.access_token) {
    toast.success("Connexion réussie !");
    showOtpModal.value = false;
    router.push("/home");
  } else {
    toast.error(auth.error || "OTP invalide.");
  }
}

function closeOtpModal() {
  showOtpModal.value = false;
}
</script>

<style scoped lang="scss">
@use "sass:color";

.login {
  width: 100%;
  height: 100vh;
  background-color: #f8fafc;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 25px;
  &-top {
    width: 100%;
    text-align: center;
    h1 {
      font-family: "Archivo Black", sans-serif;
      font-size: 54px;
      color: $primary-color;
    }
    h2 {
      font-size: 1.1rem;
      color: #111827;
      margin-bottom: 25px;
      font-weight: 500;
    }
  }
  &-container {
    width: 100%;
    max-width: 400px;
    padding: 48px;
    background-color: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    form {
      display: flex;
      flex-direction: column;
      gap: 20px;
      .form-group {
        display: flex;
        flex-direction: column;
        gap: 5px;
        label {
          font-size: 1rem;
          color: #374151;
          font-weight: 500;
        }
        input {
          padding: 10px;
          border: 1px solid $border-color;
          border-radius: 4px;
          &:focus {
            border-color: $border-color-focus;
            outline: none;
          }
        }
      }
      button {
        padding: 10px;
        background-color: $primary-color;
        color: #fff;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.3s;
        &:disabled {
          background-color: #d1d5db;
          cursor: not-allowed;
        }
        &:hover:not(:disabled) {
          background-color: color.adjust($primary-color, $lightness: 10%);
        }
      }
    }
  }
}
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
}
.modal-content {
  background: #fff;
  padding: 1.5rem;
  border-radius: 4px;
  width: 300px;
  text-align: center;
}
</style>
