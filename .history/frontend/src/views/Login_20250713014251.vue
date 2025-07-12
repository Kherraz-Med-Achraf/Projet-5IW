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
          <div class="modal-header">
            <h2>Authentification à deux facteurs</h2>
            <p>
              Veuillez entrer le code à 6 chiffres généré par votre application
              d'authentification
            </p>
          </div>
          <form @submit.prevent="submitOtp" class="otp-form">
            <div class="form-group">
              <label for="otp-code">Code OTP</label>
              <input
                id="otp-code"
                v-model="otpCode"
                type="text"
                placeholder="123456"
                maxlength="6"
                pattern="[0-9]{6}"
                required
                :disabled="auth.loading"
                class="otp-input"
                @input="formatOtpInput"
              />
              <small class="form-hint"
                >Entrez le code à 6 chiffres de votre application
                d'authentification</small
              >
            </div>
            <div class="form-actions">
              <button
                type="button"
                @click="closeOtpModal"
                :disabled="auth.loading"
                class="btn-secondary"
              >
                Annuler
              </button>
              <button
                type="submit"
                :disabled="auth.loading || otpCode.length !== 6"
                class="btn-primary"
              >
                <span v-if="auth.loading">Vérification...</span>
                <span v-else>Valider</span>
              </button>
            </div>
          </form>
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
import { useAuthStore } from "@/stores/auth";
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
  try {
    const res = await auth.initiateLogin({
      email: email.value,
      password: password.value,
    });

    // ✅ VÉRIFIER D'ABORD SI LE MOT DE PASSE EST EXPIRÉ
    if (res.passwordExpired) {
      toast.warning("🔒 Votre mot de passe a expiré. Redirection vers la mise à jour...");
      // Stocker temporairement les credentials pour le changement forcé
      sessionStorage.setItem('tempCredentials', JSON.stringify({
        email: email.value,
        password: password.value
      }));
      // Stocker le token d'accès si disponible
      if (res.access_token) {
        auth.setAuth(res.access_token, res.user);
      }
      setTimeout(() => {
        router.push("/force-password-change");
      }, 1500);
      return;
    }

    if (res.tempToken && !res.access_token) {
      auth.tempToken = res.tempToken;
      showOtpModal.value = true;
      toast.info("Veuillez saisir votre code OTP");
    } else if (res.access_token) {
      await auth.login({ email: email.value, password: password.value });
      toast.success("Vous êtes connecté !");
      router.push("/home");
    } else {
      toast.error(auth.error || "La connexion a échoué.");
    }
  } catch (error: any) {
    toast.error(auth.error || "La connexion a échoué.");
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

function formatOtpInput(event: Event) {
  const input = event.target as HTMLInputElement;
  let value = input.value.replace(/\D/g, ""); // Ne garder que les chiffres

  if (value.length > 6) {
    value = value.slice(0, 6);
  }

  input.value = value;
  otpCode.value = value;
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
  padding: 2rem;
  border-radius: 8px;
  width: 90%;
  max-width: 400px;
  text-align: center;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

.modal-header {
  margin-bottom: 1.5rem;

  h2 {
    color: #111827;
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0 0 0.5rem 0;
  }

  p {
    color: #6b7280;
    font-size: 0.875rem;
    margin: 0;
    line-height: 1.4;
  }
}

.otp-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.form-hint {
  font-size: 0.8rem;
  color: #6b7280;
}

.form-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.btn-secondary {
  padding: 0.75rem 1rem;
  background-color: #e5e7eb;
  color: #4b5563;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
  &:disabled {
    background-color: #d1d5db;
    cursor: not-allowed;
  }
  &:hover:not(:disabled) {
    background-color: #d1d5db;
  }
}

.btn-primary {
  padding: 0.75rem 1rem;
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

.otp-input {
  padding: 12px;
  border: 2px solid $border-color;
  border-radius: 6px;
  font-size: 1.1rem;
  font-weight: 500;
  text-align: center;
  letter-spacing: 0.5rem;
  font-family: "Courier New", monospace;
  background-color: #f9fafb;
  transition: all 0.2s ease;

  &:focus {
    border-color: $primary-color;
    outline: none;
    background-color: #fff;
    box-shadow: 0 0 0 3px rgba(68, 68, 172, 0.1);
  }

  &::placeholder {
    letter-spacing: 0.5rem;
    color: #9ca3af;
  }
}
</style>
