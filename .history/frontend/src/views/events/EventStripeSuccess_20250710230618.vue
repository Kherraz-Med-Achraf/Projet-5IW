<template><div></div></template>
<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'

const route = useRoute()
const router = useRouter()
const toast = useToast()

onMounted(async () => {
  const sessionId = route.query.session_id as string
  if (!sessionId) {
    router.replace('/home')
    return
  }
  
  // ✅ SIMPLIFICATION: Le webhook gère automatiquement la confirmation
  // Plus besoin d'appeler /events/confirm/${sessionId} 
  console.log('ℹ️ [EventStripeSuccess] Paiement traité automatiquement par webhook')
  
  // Message de succès générique (le webhook a déjà envoyé l'email de confirmation)
  toast.success('Paiement effectué avec succès ! Vous allez recevoir un email de confirmation.')
  
  // Redirection vers "Mes événements"
  router.replace('/events/mine')
})
</script> 