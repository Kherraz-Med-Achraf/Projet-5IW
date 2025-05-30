<template>
    <div>
      <h1>Réinitialisation du mot de passe</h1>
      <form @submit.prevent="onSubmit">
        <div>
          <label>Email</label>
          <input v-model="email" type="email" required />
        </div>
        <button type="submit" :disabled="auth.loading">Envoyer le lien de réinitialisation</button>
      </form>
    </div>
  </template>
  
  <script setup>
  import { ref } from 'vue'
  import { useAuthStore } from '@/stores/auth'
  import { useRouter } from 'vue-router'
  import { useToast } from 'vue-toastification'
  
  const email = ref('')
  const auth = useAuthStore()
  const router = useRouter()
  const toast = useToast()
  
  async function onSubmit() {
    auth.error = ''
    const response = await auth.forgotPassword(email.value)
    
    // Afficher un toast de succès et rediriger vers la page de login
    toast.success(response.message || 'Email de réinitialisation envoyé !')
    router.push('/login')
  }
  </script>
  