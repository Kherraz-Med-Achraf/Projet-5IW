<template>
    <div class="secretary-presence p-6 bg-gray-50">
      <div class="bg-white shadow sm:rounded-lg">
        <div class="px-6 py-5 sm:px-8 flex justify-between items-center border-b border-gray-200">
          <div>
            <h1 class="text-2xl font-semibold text-gray-900">Présence Secrétaire</h1>
            <p class="mt-1 text-sm text-gray-500">Importez et gérez la liste des présences</p>
          </div>
          <button @click="confirmData" class="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md focus:outline-none shadow">
            Confirmer et envoyer
          </button>
        </div>
  
        <div class="px-6 py-4 sm:px-8 space-y-4">
          <button @click="triggerFileInput" class="inline-flex items-center px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-md focus:outline-none">
            Importer un fichier Excel
          </button>
          <input
            ref="fileInput"
            type="file"
            accept=".xlsx, .xls"
            @change="handleFile"
            class="hidden"
          />
  
          <p v-if="errorMessage" class="text-red-600 text-sm">{{ errorMessage }}</p>
  
          <div v-else-if="parsedData.length">
            <div class="mb-4">
              <input
                v-model="searchTerm"
                @input="currentPage = 1"
                type="text"
                placeholder="Rechercher par nom ou prénom"
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
  
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NOM</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prénom</th>
                    <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr v-for="(row, index) in paginatedData" :key="index">
                    <td class="px-6 py-4 whitespace-nowrap">
                      <input v-model="row.nom" class="w-full px-2 py-1 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm" />
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <input v-model="row.prenom" class="w-full px-2 py-1 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm" />
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button @click="removeRow((currentPage-1)*pageSize + index)" class="text-red-600 hover:text-red-800">
                        Supprimer
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
  
            <div class="mt-4 flex items-center justify-between">
              <button @click="prevPage" :disabled="currentPage===1" class="px-3 py-1 bg-white border border-gray-300 rounded-l-md text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                Précédent
              </button>
              <span class="text-sm text-gray-600">Page <span class="font-medium">{{ currentPage }}</span> sur <span class="font-medium">{{ totalPages }}</span></span>
              <button @click="nextPage" :disabled="currentPage===totalPages" class="px-3 py-1 bg-white border border-gray-300 rounded-r-md text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                Suivant
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script lang="ts" setup>
  import { ref, computed } from 'vue'
  import { useAuthStore } from '@/stores/auth'
  import { useRouter } from 'vue-router'
  
  type Row = { nom: string; prenom: string }
  
  const auth = useAuthStore()
  const router = useRouter()
  
  if (!auth.isAuthenticated || auth.user?.role !== 'SECRETARY') {
    router.replace({ name: 'Home' })
  }
  
  const fileInput = ref<HTMLInputElement | null>(null)
  function triggerFileInput() {
    fileInput.value?.click()
  }
  
  const parsedData = ref<Row[]>([])
  const errorMessage = ref<string | null>(null)
  
  const searchTerm = ref<string>('')
  const currentPage = ref<number>(1)
  const pageSize = ref<number>(10)
  
  const filteredData = computed(() => {
    if (!searchTerm.value) return parsedData.value
    const term = searchTerm.value.toLowerCase()
    return parsedData.value.filter(
      row => row.nom.toLowerCase().includes(term) || row.prenom.toLowerCase().includes(term)
    )
  })
  
  const totalPages = computed(() => Math.ceil(filteredData.value.length / pageSize.value) || 1)
  const paginatedData = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value
    return filteredData.value.slice(start, start + pageSize.value)
  })
  
  async function handleFile(event: Event) {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file) return
  
    const arrayBuffer = await file.arrayBuffer()
    const { read, utils } = await import('xlsx')
    const workbook = read(arrayBuffer, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rawData: Array<Record<string, any>> = utils.sheet_to_json(sheet)
  
    if (!rawData.length || !('NOM' in rawData[0]) || !('Prénom' in rawData[0])) {
      parsedData.value = []
      errorMessage.value = 'Le fichier doit contenir les colonnes "NOM" et "Prénom".'
      return
    }
  
    const rows: Row[] = rawData.map(row => ({
      nom: String(row['NOM'] ?? '').trim(),
      prenom: String(row['Prénom'] ?? '').trim()
    }))
    const validRows = rows.filter(r => r.nom || r.prenom)
  
    if (!validRows.length) {
      parsedData.value = []
      errorMessage.value = 'Aucune donnée valide trouvée.'
      return
    }
  
    parsedData.value = validRows
    errorMessage.value = null
    currentPage.value = 1
  }
  
  function removeRow(index: number) {
    parsedData.value.splice(index, 1)
    if (currentPage.value > totalPages.value) currentPage.value = totalPages.value
  }
  
  function prevPage() { if (currentPage.value > 1) currentPage.value-- }
  function nextPage() { if (currentPage.value < totalPages.value) currentPage.value++ }
  function confirmData() {
    console.log('Envoi au serveur :', parsedData.value)
  }
  </script>
  
  <style scoped>
  .secretary-presence {
    font-family: 'Inter', sans-serif;
  }
  .hidden { display: none; }
  </style>
  