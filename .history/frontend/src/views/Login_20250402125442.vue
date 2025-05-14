<template>
  <div>
    <h1>Connexion (front)</h1>
    <form @submit.prevent="onSubmit">
      <div>
        <label>Email</label>
        <input v-model="email" type="email" required />
      </div>
      <div>
        <label>Password</label>
        <input v-model="password" type="password" required />
      </div>
      <button type="submit" :disabled="auth.loading">Se connecter</button>
    </form>
    <!-- Lien pour la réinitialisation du mot de passe -->
    <p style="margin-top: 1rem;">
      <router-link to="/forgot-password">Mot de passe oublié ?</router-link>
    </p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'

const email = ref('')
const password = ref('')
const auth = useAuthStore()
const router = useRouter()
const toast = useToast()

async function onSubmit() {
  // Réinitialiser l'erreur dans le store
  auth.error = ''

  // Appel de l'action login dans le store d'authentification
  await auth.login({ email: email.value, password: password.value })

  // Si un token est récupéré, afficher un toast de succès et rediriger vers /home
  if (auth.token) {
    toast.success('Vous êtes connecté !')
    router.push('/home')
  } else {
    // Sinon, afficher un toast d'erreur
    toast.error(auth.error || 'La connexion a échoué.')
  }
}
</script>
