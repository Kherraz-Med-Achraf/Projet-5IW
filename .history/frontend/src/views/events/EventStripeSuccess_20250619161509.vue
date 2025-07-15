<template><div></div></template>
<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const API = import.meta.env.VITE_NEST_API_URL ?? ''

onMounted(async () => {
  const sessionId = route.query.session_id as string
  if (!sessionId) {
    router.replace('/home')
    return
  }
  try {
    const token = localStorage.getItem('token') || ''
    const res = await fetch(`${API}/events/confirm/${sessionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(await res.text())
    const data = await res.json()
    const childList = (data.children || []).join(', ')
    toast.success(`${childList} est bien inscrit à l'événement « ${data.eventTitle} »`)
  } catch (e:any) {
    toast.error('Erreur de confirmation de paiement')
  } finally {
    router.replace('/home')
  }
})
</script> 