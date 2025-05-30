<template>
  <div>
    <h1>Inscription (front)</h1>

    <form @submit.prevent="onSubmit">
      <div>
        <label>Email</label>
        <input v-model="email" type="email" required />
      </div>
      <div>
        <label>Mot de passe</label>
        <input v-model="password" type="password" required />
      </div>
      <button type="submit" :disabled="auth.loading">S'inscrire</button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'vue-toastification'
import { useRouter } from 'vue-router'

const email = ref('')
const password = ref('')
const auth = useAuthStore()
const toast = useToast()
const router = useRouter()

async function onSubmit() {
  auth.error = ''
  try {
    await auth.register({ email: email.value, password: password.value })
    toast.success('Inscription réussie !')
    // redirige vers la page de connexion
    router.push('/login')
  } catch (err: any) {
    // auth.register() remplit auth.error en cas d'échec
    toast.error(auth.error || 'Erreur lors de l\'inscription')
  }
}
</script>
