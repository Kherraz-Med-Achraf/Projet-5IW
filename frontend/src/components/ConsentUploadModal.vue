<!-- src/components/ConsentUploadModal.vue -->
<template>
    <dialog ref="dialog" class="p-6 bg-white rounded-xl shadow-xl w-96">
      <form @submit.prevent="submit" class="space-y-4">
        <h2 class="text-xl font-semibold">Nouveau consentement</h2>
  
        <!-- Nom -->
        <div>
          <label class="block mb-1 text-sm font-medium">Nom du document</label>
          <input v-model="name" required class="input w-full" />
        </div>
  
        <!-- Fichier -->
        <div>
          <label class="block mb-1 text-sm font-medium">Fichier PDF</label>
          <input type="file" ref="fileInput" accept="application/pdf" required />
        </div>
  
        <!-- Parent -->
        <div>
          <label class="block mb-1 text-sm font-medium">Choisir le parent</label>
  
          <select
            v-if="parents.length"
            v-model="selectedId"
            size="8"
            class="w-full border rounded px-2 py-1"
          >
            <option v-for="p in parents" :key="p.id" :value="p.id">
              {{ p.lastName }} {{ p.firstName }}
            </option>
          </select>
  
          <p v-else class="text-sm text-gray-500">Aucun parent trouvé.</p>
        </div>
  
        <div class="flex justify-end gap-2 pt-4">
          <button type="button" @click="close" class="btn">Annuler</button>
          <button type="submit" class="btn btn-primary" :disabled="!selectedId">
            Envoyer
          </button>
        </div>
      </form>
    </dialog>
  </template>
  
  <script setup lang="ts">
  import { ref, defineExpose } from 'vue'
  import { useDocumentStore } from '@/stores/documentStore'
  import { useAuthStore } from '@/stores/auth'
  
  interface Parent { id: string; firstName: string; lastName: string }
  
  const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
  
  const dialog     = ref<HTMLDialogElement | null>(null)
  const name       = ref('')
  const fileInput  = ref<HTMLInputElement | null>(null)
  const parents    = ref<Parent[]>([])
  const selectedId = ref<string | null>(null)
  
  /* Auth header + cookie */
  const token   = useAuthStore().token
  const headers = token ? { Authorization: `Bearer ${token}` } : {}
  
  /* charge les parents quand on ouvre */
  async function loadParents() {
    if (parents.value.length) return
    try {
      const r = await fetch(`${API}/parents`, {
        headers,
        credentials: 'include',
      })
      if (r.ok) parents.value = await r.json()
      else console.error('Erreur /parents', r.status, await r.text())
    } catch (e) {
      console.error('Network error /parents', e)
    }
  }
  
  const store = useDocumentStore()
  
  async function submit() {
    if (!selectedId.value) return
    const file = fileInput.value?.files?.[0]
    if (!file) return
  
    const fd = new FormData()
    fd.append('file', file)
    fd.append('data', JSON.stringify({ name: name.value, parentId: selectedId.value }))
  
    await store.uploadConsent(fd)
    await store.fetchSecretary()
    close()
  }
  
  function open()  { loadParents().then(() => dialog.value?.showModal()) }
  function close() {
    dialog.value?.close()
    name.value = ''
    selectedId.value = null
    if (fileInput.value) fileInput.value.value = ''
  }
  
  defineExpose({ open })
  </script>
  
  <style scoped>
  .input       { @apply border rounded w-full px-2 py-1 shadow-sm; }
  .btn         { @apply px-3 py-1 rounded border; }
  .btn-primary { @apply bg-blue-600 text-white; }
  </style>
  