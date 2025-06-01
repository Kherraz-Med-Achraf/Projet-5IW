<template>
    <div class="secretary-presence">
      <h1>Présence Secrétaire</h1>
  
      <!-- Bandeau principal : import -->
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
  
      <!-- Aperçu des données parsées -->
      <div v-else-if="parsedData.length" class="preview">
        <!-- Compteur dynamique -->
        <h2>Aperçu des présences — {{ parsedData.length }} enfant{{ parsedData.length > 1 ? 's' : '' }}</h2>
  
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
  
        <!-- Action bar haut -->
        <div class="action-bar top-bar">
          <button @click="openAddChildModal" class="add-button">Ajouter un enfant</button>
          <button @click="confirmData" class="confirm-button">Confirmer et envoyer</button>
        </div>
  
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
  
      <!-- Modale d'ajout d'enfant -->
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
  
    const rows: Row[] = rawData.map(row => ({ nom: String(row['NOM'] ?? '').trim(), prenom: String(row['Prénom'] ?? '').trim() }))
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
  
  function isValidName(str: string): boolean {
    return /^[A-Za-zÀ-ÖØ-öø-ÿ]{2,}$/.test(str.trim())
  }
  
  function confirmData() {
    const invalidRows = parsedData.value.filter(r => !isValidName(r.nom) || !isValidName(r.prenom))
    if (invalidRows.length) {
      const list = invalidRows.map(r => `${r.nom || 'NOM'} ${r.prenom || 'PRÉNOM'}`).join(', ')
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
  .secretary-presence { padding: 2rem; font-family: Arial, Helvetica, sans-serif; }
  .button-bar { display: flex; gap: 1rem; margin-bottom: 1rem; }
  .import-button,
  .confirm-button,
  .delete-button,
  .page-button,
  .add-button {
    margin-top: 1rem; padding: 0.5rem 1rem; border: none; background-color: #3
  