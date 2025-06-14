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
  
        <!-- Parent (autocomplete) -->
        <div>
          <label class="block mb-1 text-sm font-medium">Parent concerné</label>
          <input
            v-model="parentQuery"
            @input="searchParents"
            placeholder="Tapez le nom ou le prénom…"
            class="input w-full"
          />
  
          <!-- liste déroulante si résultats -->
          <ul
            v-if="showDropdown && results.length"
            class="border rounded mt-1 max-h-40 overflow-y-auto bg-white shadow"
          >
            <li
              v-for="p in results"
              :key="p.id"
              @click="selectParent(p)"
              class="px-2 py-1 cursor-pointer hover:bg-gray-100"
            >
              {{ p.lastName }} {{ p.firstName }}
            </li>
          </ul>
  
          <!-- parent choisi -->
          <p v-if="parent"
             class="text-sm text-gray-600 mt-1">Sélectionné : {{ parent.lastName }} {{ parent.firstName }}</p>
        </div>
  
        <div class="flex justify-end gap-2 pt-4">
          <button type="button" @click="close" class="btn">Annuler</button>
          <button type="submit" class="btn btn-primary" :disabled="!parent">Envoyer</button>
        </div>
      </form>
    </dialog>
  </template>
  
  <script setup lang="ts">
  import { ref, defineExpose, watch } from 'vue'
  import { useDocumentStore } from '@/stores/documentStore'
  
  const dialog = ref<HTMLDialogElement | null>(null)
  const name = ref('')
  const fileInput = ref<HTMLInputElement | null>(null)
  
  interface ParentLight {
    id: string
    firstName: string
    lastName: string
  }
  
  const parentQuery = ref('')
  const results = ref<ParentLight[]>([])
  const parent = ref<ParentLight | null>(null)
  const showDropdown = ref(false)
  let debounceTimer: any = null
  
  /* API root (si besoin d’URL absolue, remplace par import.meta.env…) */
  const API = ''
  
  async function searchParents() {
    showDropdown.value = false
    clearTimeout(debounceTimer)
    if (parentQuery.value.trim().length < 2) {
      results.value = []
      return
    }
    debounceTimer = setTimeout(async () => {
      const r = await fetch(
        `${API}/parents/search?query=${encodeURIComponent(parentQuery.value)}`,
      )
      if (r.ok) {
        results.value = (await r.json()) as ParentLight[]
        showDropdown.value = true
      }
    }, 300)
  }
  
  function selectParent(p: ParentLight) {
    parent.value = p
    parentQuery.value = `${p.lastName} ${p.firstName}`
    results.value = []
    showDropdown.value = false
  }
  
  const store = useDocumentStore()
  
  async function submit() {
    if (!parent.value) return
    const file = fileInput.value?.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    fd.append(
      'data',
      JSON.stringify({ name: name.value, parentId: parent.value.id }),
    )
    await store.uploadConsent(fd)
    await store.fetchSecretary()
    close()
  }
  
  function open() {
    dialog.value?.showModal()
  }
  function close() {
    dialog.value?.close()
    name.value = ''
    parentQuery.value = ''
    parent.value = null
    results.value = []
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
  