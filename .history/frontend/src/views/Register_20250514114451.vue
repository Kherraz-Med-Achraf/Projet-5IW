<template>
  <div>
    <h1>Inscription (front)</h1>

    <form @submit.prevent="onSubmit">
      <div>
        <label>Email</label>
        <input
          v-model="email"
          @blur="email = email.trim().toLowerCase()"
          type="email"
          required
        />
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
  try {
    await auth.register({ email: email.value, password: password.value })
    toast.success('Inscription réussie ! Vous pouvez maintenant vous connecter.')
    router.push('/login')
  } catch (err: any) {
    toast.error(auth.error || err.message || 'Erreur lors de l\'inscription')
  }
}
</script>
