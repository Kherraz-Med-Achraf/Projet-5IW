<template>
    <div class="secretary-presence">
      <h1>Présence Secrétaire</h1>
      <button @click="triggerFileInput" class="import-button">
        Importer un fichier Excel
      </button>
      <input
        ref="fileInput"
        type="file"
        accept=".xlsx, .xls"
        @change="handleFile"
        class="hidden"
      />
    </div>
  </template>
  
  <script lang="ts" setup>
  import { ref } from 'vue'
  import { useAuthStore } from '@/stores/auth'
  import { useRouter } from 'vue-router'
  
  const auth = useAuthStore()
  const router = useRouter()
  
  // Redirection si non autorisé
  auth.isAuthenticated || router.replace({ name: 'Home' })
  if (auth.user?.role !== 'SECRETARY') {
    router.replace({ name: 'Home' })
  }
  
  const fileInput = ref<HTMLInputElement | null>(null)
  
  function triggerFileInput() {
    fileInput.value?.click()
  }
  
  function handleFile(event: Event) {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    if (file) {
      // TODO: gérer le traitement du fichier (lecture, upload...)
      console.log('Fichier sélectionné:', file.name)
    }
  }
  </script>
  
  <style scoped>
  .secretary-presence {
    padding: 2rem;
  }
  .import-button {
    padding: 0.5rem 1rem;
    border: none;
    background-color: #3b82f6;
    color: white;
    border-radius: 0.25rem;
    cursor: pointer;
  }
  .import-button:hover {
    background-color: #2563eb;
  }
  .hidden {
    display: none;
  }
  </style>