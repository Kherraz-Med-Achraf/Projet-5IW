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
    <div v-if="showOtpModal" class="modal-overlay">
      <div class="modal-content">
        <h2>Vérification OTP</h2>
        <p>Saisissez le code OTP généré par votre application (Google Authenticator, etc.).</p>
        <input v-model="otpCode" type="text" placeholder="Code OTP" />
        <button @click="onOtpSubmit" :disabled="auth.loading">Valider</button>
        <button @click="cancelOtp">Annuler</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'

const email = ref('')
const password = ref('')
const otpCode = ref('')
const showOtpModal = ref(false)
const tempToken = ref('')
const auth = useAuthStore()
const router = useRouter()
const toast = useToast()

async function onSubmit() {
  auth.error = ''
  const response = await auth.initiateLogin({ email: email.value, password: password.value })
  if (response.tempToken) {
    tempToken.value = response.tempToken
    showOtpModal.value = true
    toast.info('Identifiants validés. Veuillez saisir votre code OTP.')
  } else if (response.access_token) {
    toast.success('Vous êtes connecté !')
    router.push('/home')
  } else {
    toast.error(auth.error || 'La connexion a échoué.')
  }
}

async function onOtpSubmit() {
  auth.error = ''
  const response = await auth.verifyOtp({ tempToken: tempToken.value, otpCode: otpCode.value })
  if (response.access_token) {
    toast.success('Connexion réussie !')
    router.push('/home')
  } else {
    toast.error(auth.error || 'La vérification OTP a échoué.')
  }
}

function cancelOtp() {
  showOtpModal.value = false
  tempToken.value = ''
  otpCode.value = ''
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-content {
  background: #fff;
  padding: 2rem;
  border-radius: 4px;
  text-align: center;
}
</style>
