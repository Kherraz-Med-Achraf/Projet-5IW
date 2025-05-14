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
      <!-- Champ pour le code OTP, facultatif si non activé -->
      <div>
        <label>Code OTP (si nécessaire)</label>
        <input v-model="otpCode" type="text" placeholder="Code OTP" />
      </div>
      <button type="submit" :disabled="auth.loading">Se connecter</button>
    </form>
    <p style="margin-top: 1rem;">
      <router-link to="/forgot-password">Mot de passe oublié ?</router-link>
    </p>
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
const auth = useAuthStore()
const router = useRouter()
const toast = useToast()

async function onSubmit() {
  auth.error = ''
  // L'appel passe l'otpCode, même si vide (si l'OTP n'est pas activé, le backend l'ignore)
  const response = await auth.login({ 
    email: email.value, 
    password: password.value, 
    otpCode: otpCode.value 
  })
  if (response.access_token) {
    toast.success('Vous êtes connecté !')
    router.push('/home')
  } else {
    toast.error(auth.error || 'La connexion a échoué.')
  }
}
</script>

<style scoped>
/* Ajoutez vos styles ici si nécessaire */
</style>
