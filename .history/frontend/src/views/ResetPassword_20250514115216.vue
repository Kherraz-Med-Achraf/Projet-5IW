<template>
    <div>
      <h1>Réinitialisation du mot de passe</h1>
      <form @submit.prevent="onSubmit">
        <div>
          <label>Nouveau mot de passe</label>
          <input type="password" v-model="newPassword" required />
        </div>
        <div>
          <label>Confirmer le nouveau mot de passe</label>
          <input type="password" v-model="confirmPassword" required />
        </div>
        <button type="submit" :disabled="auth.loading">Réinitialiser le mot de passe</button>
      </form>
    </div>
  </template>
  
  <script setup>
  import { ref, computed } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useAuthStore } from '@/stores/auth'
  import { useToast } from 'vue-toastification'
  
  const newPassword = ref('')
  const confirmPassword = ref('')
  const route = useRoute()
  const router = useRouter()
  const auth = useAuthStore()
  const toast = useToast()
  const prid = computed(() => Number(route.query.prid))
  const token = computed(() => route.query.token)
  
  async function onSubmit() {
    if (newPassword.value !== confirmPassword.value) {
      toast.error("Les mots de passe ne correspondent pas.")
      return
    }
    try {
      const response = await auth.resetPassword(prid.value, token.value, newPassword.value)
  
      toast.success(response.message || "Mot de passe réinitialisé avec succès.")
      router.push('/login')
    } catch (error) {
      toast.error(auth.error || "Erreur lors de la réinitialisation du mot de passe.")
    }
  }
  </script>
  