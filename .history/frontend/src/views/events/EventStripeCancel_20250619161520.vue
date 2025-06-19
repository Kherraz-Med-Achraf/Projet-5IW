<template><div></div></template>
<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'

const router = useRouter()
const toast = useToast()

onMounted(() => {
  toast.info('Paiement annulé')
  router.replace('/events')
})
</script> 