<template>
    <div class="secretary-presence">
      <h1>Présence Secrétaire</h1>
  
      <!-- Bandeau d'import -->
      <div class="button-bar">
        <button @click="triggerFileInput" class="import-button">Importer un fichier Excel</button>
        <input
          ref="fileInput"
          type="file"
          accept=".xlsx, .xls"
          @change="handleFile"
          class="hidden"
        />
      </div>
  
      <!-- Message d'erreur global -->
      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
  
      <!-- Aperçu -->
      <div v-else-if="parsedData.length" class="preview">
        <!-- Compteur dynamique -->
        <h2>Aperçu des présences — {{ parsedData.length }} enfant{{ parsedData.length > 1 ? 's' : '' }}</h2>
  
        <!-- Recherche -->
        <div class="search-bar">
          <input
            v-model="searchTerm"
            @input="currentPage = 1"
            type="text"
            placeholder="Rechercher par nom ou prénom"
            class="search-input"
          />
        </div>
  
        <!-- Action bar haut -->
        <div class="action-bar top-bar">
          <button @click="openAddChildModal" class="add-button">Ajouter un enfant</button>
          <button @click="confirmData" class="confirm-button">Confirmer et envoyer</button>
        </div>
  
        <!-- Tableau -->
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
                <button @click="removeRow((currentPage-1)*pageSize + index)" class="delete-button">Supprimer</button>
              </td>
            </tr>
          </tbody>
        </table>
  
        <!-- Pagination -->
        <div class="pagination">
          <button @click="prevPage" :disabled="currentPage === 1" class="page-button">Précédent</button>
          <span>Page {{ currentPage }} / {{ totalPages }}</span>
          <button @click="nextPage" :disabled="currentPage === totalPages" class="page-button">Suivant</button>
        </div>
  
        <!-- Action bar bas -->
        <div class="action-bar bottom-bar">
          <button @click="openAddChildModal" class="add-button">Ajouter un enfant</button>
          <button @click="confirmData" class="confirm-button">Confirmer et envoyer</button>
        </div>
      </div>
  
      <!-- Modale -->
      <div v-if="showModal" class="modal-overlay">
        <div class="modal">
          <h3>Ajouter un enfant</h3>
          <div class="modal-body">
            <label>Nom :</label>
            <input v-model="newChildNom" class="modal-input" placeholder="Nom" />
            <label>Prénom :</label>
            <input v-model="newChildPrenom" class="modal-input" placeholder="Prénom" />
            <p v-if="modalErrorMessage" class="error-message">{{ modalErrorMessage }}</p>
          </div>
          <div class="modal-actions">
            <button @click="confirmAddChild" class="confirm-button">Ajouter</button>
            <button @click="closeAddChildModal" class="delete-button">Annuler</button>
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
  
  /* ---------- state ---------- */
  const fileInput = ref<HTMLInputElement | null>(null)
  const parsedData = ref<Row[]>([])
  const errorMessage = ref<string | null>(null)
  
  const searchTerm = ref<string>('')
  const currentPage = ref<number>(1)
  const pageSize = ref<number>(10)
  
  const showModal = ref<boolean>(false)
  const newChildNom = ref<string>('')
  const newChildPrenom = ref<string>('')
  const modalErrorMessage = ref<string>('')
  
  /* ---------- helpers ---------- */
  function isValidName(str: string): boolean {
    return /^[A-Za-zÀ-ÖØ-öø-ÿ]{2,}$/.test(str.trim())
  }
  
  /* ---------- computed ---------- */
  // Liste filtrée et TRiÉE alphabétiquement sur le NOM (insensible aux accents)
  const filteredData = computed(() => {
    const sorted = [...parsedData.value].sort((a, b) =>
      a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' })
    )
    if (!searchTerm.value) return sorted
    const term = searchTerm.value.toLowerCase()
    return sorted.filter(r => r.nom.toLowerCase().includes(term) || r.prenom.toLowerCase().includes(term))
  })
  
  const totalPages = computed(() => Math.ceil(filteredData.value.length / pageSize.value) || 1)
  const paginatedData = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value
    return filteredData.value.slice(start, start + pageSize.value)
  })
  
  /* ---------- actions ---------- */
  function triggerFileInput() { fileInput.value?.click() }
  
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
  
    const rows: Row[] = rawData.map(r => ({ nom: String(r['NOM'] ?? '').trim(), prenom: String(r['Prénom'] ?? '').trim() }))
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
    if (currentPage.value > totalPages.value) currentPage.value = totalPages.value
  }
  
  function prevPage() { if (currentPage.value > 1) currentPage.value-- }
  function nextPage() { if (currentPage.value < totalPages.value) currentPage.value++ }
  
  function confirmData() {
    const invalid = parsedData.value.filter(r => !isValidName(r.nom) || !isValidName(r.prenom))
    if (invalid.length) {
      const list = invalid.map(r => `${r.nom || 'NOM'} ${r.prenom || 'PRÉNOM'}`).join(', ')
      errorMessage.value = `Les enfants suivants ne sont pas valides : ${list}`
      return
    }
    errorMessage.value = null
    console.log('Envoi au serveur :', parsedData.value)
  }
  
  function openAddChildModal() {
    newChildNom.value = ''
    newChildPrenom.value = ''
    modalErrorMessage.value = ''
    showModal.value = true
  }
  function closeAddChildModal() { showModal.value = false }
  
  function confirmAddChild() {
    const nom = newChildNom.value.trim()
    const prenom = newChildPrenom.value.trim()
    if (!isValidName(nom) || !isValidName(prenom)) {
      modalErrorMessage.value = `L'enfant ${nom || 'NOM'} ${prenom || 'PRÉNOM'} n'est pas valide`
      return
    }
    parsedData.value.push({ nom, prenom })
    closeAddChildModal()
  }
  </script>
  
  <style scoped>
  .secretary-presence {
    padding: 2rem;
    font-family: Arial, Helvetica, sans-serif;
  }
  .button-bar {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  .import-button,
  .confirm-button,
  .delete-button,
  .page-button,
  .add-button {
    margin-top: 1rem;
    padding: 0.5rem 1rem;
    border: none;
    background-color: #3b82f6;
    color: white;
    border-radius: 0.25rem;
    cursor: pointer;
  }
  .add-button { background-color: #10b981; }
  .import-button:hover,
  .confirm-button:hover,
  .delete-button:hover,
  .page-button:hover,
  .add-button:hover {
    background-color: #2563eb;
  }
  .hidden { display: none; }
  .preview { margin-top: 2rem; }
  .search-bar { margin-bottom: 1rem; }
  .search-input {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 0.25rem;
  }
  .top-button { margin-bottom: 1rem; }
  .bottom-button { margin-top: 1rem; }
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
  .preview-table th { background-color: #f3f4f6; }
  .cell-input {
    width: 100%;
    border: 1px solid #ccc;
    padding: 0.25rem;
  }
  .error-message {
    color: red;
    margin-top: 0.5rem;
  }
  .pagination {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin: 1rem 0;
  }
  /* ============================
   * Modal styles
   * ==========================*/
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  .modal {
    background: #fff;
    padding: 1.5rem;
    border-radius: 0.25rem;
    width: 90%;
    max-width: 400px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  }
  .modal-body { display: flex; flex-direction: column; gap: 0.5rem; }
  .modal-input {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 0.25rem;
  }
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 1rem;
  }
  </style>
  