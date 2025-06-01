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
  
      <!-- Message d'erreur si pas de données valides -->
      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
  
      <!-- Aperçu des données parsées -->
      <div v-else-if="parsedData.length" class="preview">
        <h2>Aperçu des présences</h2>
  
        <!-- Barre de recherche -->
        <div class="search-bar">
          <input
            v-model="searchTerm"
            @input="currentPage = 1"
            type="text"
            placeholder="Rechercher par nom ou prénom"
            class="search-input"
          />
        </div>
  
        <!-- Bouton Confirmer et envoyer en haut -->
        <button @click="confirmData" class="confirm-button top-button">
          Confirmer et envoyer
        </button>
  
        <table class="preview-table">
          <thead>
            <tr>
              <th>NOM</th>
              <th>Prénom</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in paginatedData" :key="index">
              <td>
                <input v-model="row.nom" class="cell-input" />
              </td>
              <td>
                <input v-model="row.prenom" class="cell-input" />
              </td>
              <td>
                <button @click="removeRow((currentPage-1)*pageSize + index)" class="delete-button">
                  Supprimer
                </button>
              </td>
            </tr>
          </tbody>
        </table>
  
        <!-- Pagination -->
        <div class="pagination">
          <button
            @click="prevPage"
            :disabled="currentPage === 1"
            class="page-button"
          >
            Précédent
          </button>
          <span>Page {{ currentPage }} / {{ totalPages }}</span>
          <button
            @click="nextPage"
            :disabled="currentPage === totalPages"
            class="page-button"
          >
            Suivant
          </button>
        </div>
  
        <!-- Bouton Confirmer et envoyer en bas -->
        <button @click="confirmData" class="confirm-button bottom-button">
          Confirmer et envoyer
        </button>
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
  
  // Redirection si non autorisé
  if (!auth.isAuthenticated || auth.user?.role !== 'SECRETARY') {
    router.replace({ name: 'Home' })
  }
  
  const fileInput = ref<HTMLInputElement | null>(null)
  const parsedData = ref<Row[]>([])
  const errorMessage = ref<string | null>(null)
  
  // Pagination et recherche
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
  
  function triggerFileInput() {
    fileInput.value?.click()
  }
  
  async function handleFile(event: Event) {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file) return
  
    const arrayBuffer = await file.arrayBuffer()
    const { read, utils } = await import('xlsx')
    const workbook = read(arrayBuffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const rawData: Array<Record<string, any>> = utils.sheet_to_json(sheet)
  
    // Vérifier en-têtes
    if (!rawData.length || !('NOM' in rawData[0]) || !('Prénom' in rawData[0])) {
      parsedData.value = []
      errorMessage.value = 'Le fichier doit contenir les colonnes "NOM" et "Prénom".'
      return
    }
  
    // Normalisation
    const rows: Row[] = rawData.map(row => ({
      nom: String(row['NOM'] ?? '').trim(),
      prenom: String(row['Prénom'] ?? '').trim()
    }))
  
    // Filtrer lignes vides
    const validRows = rows.filter(r => r.nom || r.prenom)
    if (!validRows.length) {
      parsedData.value = []
      errorMessage.value = 'Aucune donnée valide trouvée dans le fichier.'
      return
    }
  
    parsedData.value = validRows
    errorMessage.value = null
    currentPage.value = 1
  }
  
  function removeRow(index: number) {
    parsedData.value.splice(index, 1)
    if (currentPage.value > totalPages.value) {
      currentPage.value = totalPages.value
    }
  }
  
  function prevPage() {
    if (currentPage.value > 1) currentPage.value--
  }
  
  function nextPage() {
    if (currentPage.value < totalPages.value) currentPage.value++
  }
  
  function confirmData() {
    // TODO: appeler ton endpoint backend avec parsedData.value
    console.log('Envoi au serveur :', parsedData.value)
  }
  </script>
  
  <style scoped>
  .secretary-presence {
    padding: 2rem;
  }
  .import-button,
  .confirm-button,
  .delete-button,
  .page-button {
    margin-top: 1rem;
    padding: 0.5rem 1rem;
    border: none;
    background-color: #3b82f6;
    color: white;
    border-radius: 0.25rem;
    cursor: pointer;
  }
  .import-button:hover,
  .confirm-button:hover,
  .delete-button:hover,
  .page-button:hover {
    background-color: #2563eb;
  }
  .hidden {
    display: none;
  }
  .preview {
    margin-top: 2rem;
  }
  .search-bar {
    margin-bottom: 1rem;
  }
  .search-input {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 0.25rem;
  }
  .top-button {
    margin-bottom: 1rem;
  }
  .bottom-button {
    margin-top: 1rem;
  }
  .preview-table {
    width: 100%;
    border-collapse: collapse;
  }
  .preview-table th,
  .preview-table td {
    border: 1px solid #ddd;
    padding: 0.5rem;
    text-align: left;
  }
  .preview-table th {
    background-color: #f3f4f6;
  }
  .cell-input {
    width: 100%;
    border: 1px solid #ccc;
    padding: 0.25rem;
  }
  .error-message {
    color: red;
    margin-top: 1rem;
  }
  .pagination {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin: 1rem 0;
  }
  </style>
  