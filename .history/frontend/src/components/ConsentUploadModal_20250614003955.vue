<template>
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
  
        <!-- Sélecteur de parent -->
        <div>
          <label class="block mb-1 text-sm font-medium">Recherche parent</label>
          <input
            v-model="searchTerm"
            placeholder="Tapez nom ou prénom…"
            class="input w-full mb-2"
          />
  
          <select
            v-model="selectedId"
            size="6"
            class="w-full border rounded px-2 py-1"
          >
            <option
              v-for="p in filtered"
              :key="p.id"
              :value="p.id"
            >
              {{ p.lastName }} {{ p.firstName }}
            </option>
          </select>
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
  import { ref, computed, onMounted, defineExpose } from 'vue'
  import { useDocumentStore } from '@/stores/documentStore'
  
  interface ParentLight {
    id: string
    firstName: string
    lastName: string
  }
  
  /* refs & state */
  const dialog = ref<HTMLDialogElement | null>(null)
  const name = ref('')
  const fileInput = ref<HTMLInputElement | null>(null)
  
  const parents   = ref<ParentLight[]>([])
  const searchTerm = ref('')
  const selectedId = ref<string | null>(null)
  
  /* -- Auth header (JWT stocké en localStorage) ------------------- */
  const token   = localStorage.getItem('token') || ''
  const headers = token ? { Authorization: `Bearer ${token}` } : {}
  
  /* -- Chargement initial : liste légère des parents -------------- */
  onMounted(async () => {
    const res = await fetch('/parents/light', { headers })
    if (res.ok) parents.value = (await res.json()) as ParentLight[]
  })
  
  /* -- Filtre local insensible à la casse ------------------------- */
  const filtered = computed(() => {
    const q = searchTerm.value.toLowerCase().trim()
    if (!q) return parents.value
    return parents.value.filter(
      (p) =>
        p.firstName.toLowerCase().includes(q) ||
        p.lastName.toLowerCase().includes(q),
    )
  })
  
  /* -- Store & submit --------------------------------------------- */
  const store = useDocumentStore()
  
  async function submit() {
    if (!selectedId.value) return
    const file = fileInput.value?.files?.[0]
    if (!file) return
  
    const fd = new FormData()
    fd.append('file', file)
    fd.append(
      'data',
      JSON.stringify({ name: name.value, parentId: selectedId.value }),
    )
  
    await store.uploadConsent(fd)
    await store.fetchSecretary()
    close()
  }
  
  /* -- Dialog helpers --------------------------------------------- */
  function open()  { dialog.value?.showModal() }
  function close() {
    dialog.value?.close()
    name.value = ''
    searchTerm.value = ''
    selectedId.value = null
    if (fileInput.value) fileInput.value.value = ''
  }
  
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
  