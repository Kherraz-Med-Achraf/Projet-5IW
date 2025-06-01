<template>
    <div class="secretary-presence">
      <h1>Présence Secrétaire</h1>
    </div>
  </template>
  
  <script lang="ts" setup>
  import { useAuthStore } from '@/stores/auth'
  import { useRouter } from 'vue-router'
  
  const auth = useAuthStore()
  const router = useRouter()
  
  if (!auth.isAuthenticated || auth.user?.role !== 'secretary') {
    router.replace({ name: 'Home' })
  }
  </script>
  
  <style scoped>
  .secretary-presence {
    padding: 2rem;
  }
  </style>
  