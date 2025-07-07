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
    toast.error('Erreur de confirmation de paiement')
  } finally {
    router.replace('/events/mine')
  }
})
</script> 