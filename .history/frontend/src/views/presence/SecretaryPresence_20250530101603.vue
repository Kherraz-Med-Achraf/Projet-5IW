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
        <table class="preview-table">
          <thead>
            <tr>
              <th>NOM</th>
              <th>Prénom</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in parsedData" :key="index">
              <td>
                <input v-model="row.nom" class="cell-input" />
              </td>
              <td>
                <input v-model="row.prenom" class="cell-input" />
              </td>
              <td>
                <button @click="removeRow(index)" class="delete-button">
                  Supprimer
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <button @click="confirmData" class="confirm-button">
          Confirmer et envoyer
        </button>
      </div>
    </div>
  </template>
  
  <script lang="ts" setup>
  import { ref } from 'vue'
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
  }
  
  function removeRow(index: number) {
    parsedData.value.splice(index, 1)
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
  .delete-button {
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
  .delete-button:hover {
    background-color: #2563eb;
  }
  .hidden {
    display: none;
  }
  .preview {
    margin-top: 2rem;
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
  </style>
  