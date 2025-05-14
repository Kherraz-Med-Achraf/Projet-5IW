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
    // Réinitialise l'erreur dans le store
    auth.error = ''
    
    // Appel de l'action resetPassword dans le store d'authentification
    const success = await auth.resetPassword({ email: email.value })
    
    if (success) {
      // Affiche un toast de succès
      toast.success('Email de réinitialisation envoyé !')
      router.push('/login')
    } else {
      // Affiche un toast d'erreur
      toast.error(auth.error || 'La réinitialisation a échoué.')
    }
  }
  </script>
  