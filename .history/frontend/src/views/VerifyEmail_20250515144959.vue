<template>
    <div class="flex items-center justify-center h-screen bg-gray-900 text-white">
      <div>
        <p v-if="status === 'pending'">Validation en cours…</p>
  
        <p v-else-if="status === 'ok'" class="text-green-400">
          ✅ Adresse confirmée&nbsp;! Redirection vers la connexion…
        </p>
  
        <p v-else class="text-red-400">
           Lien invalide ou expiré. <br />
          <RouterLink to="/login" class="underline">Retour à la connexion</RouterLink>
        </p>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { onMounted, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useToast } from 'vue-toastification'
  
  const route  = useRoute()
  const router = useRouter()
  const toast  = useToast()
  const status = ref<'pending' | 'ok' | 'error'>('pending')
  
  onMounted(async () => {
    const uid   = route.query.uid as string | undefined
    const token = route.query.token as string | undefined
    if (!uid || !token) {
      status.value = 'error'
      return
    }
  
    try {
      const api = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
      const res = await fetch(`${api}/auth/confirm-email?uid=${uid}&token=${token}`)
      status.value = res.ok ? 'ok' : 'error'
      if (res.ok) {
        toast.success('Adresse e-mail confirmée')
        setTimeout(() => router.push('/login'), 2500)
      }
    } catch {
      status.value = 'error'
    }
  })
  </script>
  