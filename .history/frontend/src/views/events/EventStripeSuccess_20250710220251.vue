<template><div></div></template>
<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { secureJsonCall } from '@/utils/api'

const route = useRoute()
const router = useRouter()
const toast = useToast()

onMounted(async () => {
  const sessionId = route.query.session_id as string
  if (!sessionId) {
    router.replace('/home')
    return
  }
  
  // ✅ CORRECTION : Vérifier l'authentification avant de confirmer le paiement
  const { useAuthStore } = await import('@/stores/auth')
  const auth = useAuthStore()
  
  // Si l'utilisateur semble authentifié, vérifier la validité du token
  if (auth.isAuthenticated) {
    const isValid = await auth.checkTokenValidity()
    if (!isValid) {
      toast.error('Session expirée. Veuillez vous reconnecter pour confirmer votre paiement.')
      router.replace('/login')
      return
    }
  } else {
    toast.error('Vous devez être connecté pour confirmer votre paiement.')
    router.replace('/login')
    return
  }
  
  try {
    const data = await secureJsonCall(`/events/confirm/${sessionId}`)
    const childList = (data.children || []).join(', ')
    toast.success(`${childList} est bien inscrit à l'événement « ${data.eventTitle} »`)
  } catch (e: any) {
    console.error('Erreur confirmation paiement:', e)
    if (e.message?.includes('401') || e.message?.includes('Unauthorized')) {
      toast.error('Session expirée. Votre paiement sera confirmé automatiquement.')
      auth.clearAuth()
      router.replace('/login')
    } else {
      toast.error('Erreur de confirmation de paiement. Votre paiement sera confirmé automatiquement.')
    }
  } finally {
    // Seulement rediriger si toujours authentifié
    if (auth.isAuthenticated) {
      router.replace('/events/mine')
    }
  }
})
</script> 