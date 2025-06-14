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
  
        <!-- Fichier PDF -->
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
  import { ref, onMounted, defineExpose } from 'vue'
  import { useDocumentStore } from '@/stores/documentStore'
  import { useAuthStore } from '@/stores/auth'
  
  interface ParentFull { id: string; firstName: string; lastName: string } // le GET /parents renvoie plus, on garde ce qu’il faut
  
  /* refs */
  const dialog    = ref<HTMLDialogElement | null>(null)
  const name      = ref('')
  const fileInput = ref<HTMLInputElement | null>(null)
  
  const parents   = ref<ParentFull[]>([])
  const selectedId = ref<string | null>(null)
  
  /* JWT header */
  const auth    = useAuthStore()
  const token   = auth.accessToken || auth.token || localStorage.getItem('token')
  const headers = token ? { Authorization: `Bearer ${token}` } : {}
  
  /* charge tous les parents */
  onMounted(async () => {
    try {
      const res = await fetch('/parents', { headers })
      if (res.ok) {
        const raw = await res.json()
        parents.value = raw as ParentFull[]
      } else {
        console.error('Erreur /parents :', res.status, await res.text())
      }
    } catch (e) {
      console.error('Network error /parents', e)
    }
  })
  
  /* store + envoi */
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
  
  /* helpers */
  function open()  { dialog.value?.showModal() }
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
  