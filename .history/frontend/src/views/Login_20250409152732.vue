<template>
  <div>
    <h1>Connexion (front)</h1>
    <form @submit.prevent="onSubmit">
      <div>
        <label>Email</label>
        <input v-model="email" type="email" required />
      </div>
      <div>
        <label>Mot de passe</label>
        <input v-model="password" type="password" required />
      </div>
      <button type="submit" :disabled="auth.loading">Se connecter</button>
    </form>
    <p style="margin-top: 1rem;">
      <router-link to="/forgot-password">Mot de passe oublié ?</router-link>
    </p>

    <!-- Modale OTP : affichée si un tempToken est reçu -->
    <div v-if="showOtpModal" class="modal">
      <div class="modal-content">
        <h2>Entrez votre code OTP</h2>
        <input v-model="otpCode" type="text" placeholder="Code OTP" />
        <button @click="submitOtp" :disabled="auth.loading">Valider</button>
        <button @click="closeOtpModal" :disabled="auth.loading">Annuler</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'

const email = ref('')
const password = ref('')
const otpCode = ref('')
const showOtpModal = ref(false)
const auth = useAuthStore()
const router = useRouter()
const toast = useToast()

async function onSubmit() {
  auth.error = ''
  // Appel à initiateLogin, qui renvoie soit un access_token, soit un tempToken
  const response = await auth.initiateLogin({ email: email.value, password: password.value })
  if (response.access_token) {
    // L'utilisateur n'a pas d'OTP activé ou est déjà connecté
    toast.success('Vous êtes connecté !')
    router.push('/home')
  } else if (response.tempToken) {
    // L'OTP est activé : stocker le tempToken et afficher la modale pour saisir le code OTP
    auth.tempToken = response.tempToken
    showOtpModal.value = true
    toast.info('Veuillez saisir votre code OTP')
  } else {
    toast.error(auth.error || 'La connexion a échoué.')
  }
}

async function submitOtp() {
  if (!otpCode.value) {
    toast.error('Veuillez saisir votre code OTP')
    return
  }
  // Appel à verifyOtp avec le tempToken et le code OTP saisi
  const response = await auth.verifyOtp({ tempToken: auth.tempToken, otpCode: otpCode.value })
  if (response.access_token) {
    toast.success('Connexion réussie !')
    showOtpModal.value = false
    router.push('/home')
  } else {
    toast.error(auth.error || 'OTP invalide.')
  }
}

function closeOtpModal() {
  showOtpModal.value = false
}
</script>

<style scoped>
/* Styles basiques pour la modale */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0,0,0,0.5);
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
