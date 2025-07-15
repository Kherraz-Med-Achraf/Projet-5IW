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
  
  try {
    const data = await secureJsonCall(`/events/confirm/${sessionId}`)
    const childList = (data.children || []).join(', ')
    toast.success(`${childList} est bien inscrit à l'événement « ${data.eventTitle} »`)
  } catch (e: any) {
    // ✅ CORRECTION: Meilleure gestion d'erreur
    console.error('🔍 [EventStripeSuccess] Erreur de confirmation:', e)
    
    // Si c'est une erreur de permissions ou paiement déjà confirmé, ne pas afficher d'erreur
    if (e.status === 403 || e.message?.includes('déjà confirmé')) {
      console.log('ℹ️ [EventStripeSuccess] Paiement déjà traité - redirection silencieuse')
      // Pas de toast d'erreur si le paiement est déjà confirmé
    } else {
      // Seulement afficher l'erreur pour les vraies erreurs
      toast.error('Erreur de confirmation de paiement. Votre paiement sera confirmé automatiquement.')
    }
  } finally {
    router.replace('/events/mine')
  }
})
</script> 