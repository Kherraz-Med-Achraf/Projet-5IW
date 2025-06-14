<template>
    <!-- Boîte de dialogue native : showModal() / close() -->
    <dialog ref="dialog" class="p-6 bg-white rounded-xl shadow-xl w-96">
      <form @submit.prevent="submit" class="space-y-4">
        <h2 class="text-xl font-semibold">Nouveau consentement</h2>
  
        <!-- Nom du document -->
        <div>
          <label class="block mb-1 text-sm font-medium">Nom du document</label>
          <input v-model="name" required class="input w-full" />
        </div>
  
        <!-- Fichier PDF -->
        <div>
          <label class="block mb-1 text-sm font-medium">Fichier PDF</label>
          <input type="file" ref="fileInput" accept="application/pdf" required />
        </div>
  
        <!-- Parent cible -->
        <div>
          <label class="block mb-1 text-sm font-medium">ID du parent (UUID)</label>
          <input v-model="parentId" required class="input w-full" />
        </div>
  
        <!-- Boutons -->
        <div class="flex justify-end gap-2 pt-4">
          <button type="button" @click="close" class="btn">Annuler</button>
          <button type="submit" class="btn btn-primary">Envoyer</button>
        </div>
      </form>
    </dialog>
  </template>
  
  <script setup lang="ts">
  import { ref, defineExpose } from 'vue'
  import { useDocumentStore } from '@/stores/documentStore'
  
  /* refs */
  const dialog = ref<HTMLDialogElement | null>(null)
  const name = ref('')
  const parentId = ref('')
  const fileInput = ref<HTMLInputElement | null>(null)
  const store = useDocumentStore()
  
  /* méthodes publiques */
  function open() {
    dialog.value?.showModal()
  }
  
  function close() {
    dialog.value?.close()
    name.value = ''
    parentId.value = ''
    if (fileInput.value) fileInput.value.value = ''
  }
  
  /* envoi du formulaire */
  async function submit() {
    const file = fileInput.value?.files?.[0]
    if (!file) return
  
    const formData = new FormData()
    formData.append('file', file)
    formData.append('data', JSON.stringify({ name: name.value, parentId: parentId.value }))
  
    await store.uploadConsent(formData)
    await store.fetchSecretary()
    close()
  }
  
  /* expose la méthode open() au parent */
  defineExpose({ open })
  </script>
  
  <style scoped>
  .input {
    @apply border rounded w-full px-2 py-1 shadow-sm;
  }
  .btn {
    @apply px-3 py-1 rounded border;
  }
  .btn-primary {
    @apply bg-blue-600 text-white;
  }
  </style>
  