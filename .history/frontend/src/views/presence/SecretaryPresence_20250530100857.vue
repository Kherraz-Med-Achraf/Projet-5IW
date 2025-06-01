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
  
      <!-- Aperçu des données parsées -->
      <div v-if="parsedData.length" class="preview">
        <h2>Aperçu des présences</h2>
        <table class="preview-table">
          <thead>
            <tr>
              <th>NOM</th>
              <th>Prénom</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in parsedData" :key="index">
              <td>{{ row.nom }}</td>
              <td>{{ row.prenom }}</td>
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
  
  const auth = useAuthStore()
  const router = useRouter()
  
  // Redirection si non autorisé
  if (!auth.isAuthenticated || auth.user?.role !== 'SECRETARY') {
    router.replace({ name: 'Home' })
  }
  
  // Référence pour input file
  const fileInput = ref<HTMLInputElement | null>(null)
  
  // Données parsées
  interface Row { nom: string; prenom: string }
  const parsedData = ref<Row[]>([])
  
  function triggerFileInput() {
    fileInput.value?.click()
  }
  
  async function handleFile(event: Event) {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file) return
  
    const arrayBuffer = await file.arrayBuffer()
    // Import dynamique pour éviter l'erreur de résolution statique
    const { read, utils } = await import('xlsx')
    const workbook = read(arrayBuffer, { type: 'array' })
  
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const rawData: Array<Record<string, any>> = utils.sheet_to_json(sheet)
  
    // Normalisation des clés (colonnes "NOM" et "Prénom")
    parsedData.value = rawData.map(row => ({
      nom: String(row['NOM'] ?? '').trim(),
      prenom: String(row['Prénom'] ?? '').trim()
    }))
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
  .confirm-button {
    margin-top: 1rem;
    padding: 0.5rem 1rem;
    border: none;
    background-color: #3b82f6;
    color: white;
    border-radius: 0.25rem;
    cursor: pointer;
  }
  .import-button:hover,
  .confirm-button:hover {
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
  </style>
  