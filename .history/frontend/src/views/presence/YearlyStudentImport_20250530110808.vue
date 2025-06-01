<template>
  <div class="yearly-student-import">
    <h1>Import annuel des élèves</h1>

    <!-- Bandeau d'import (année automatique) -->
    <div class="button-bar">
      <span class="year-badge">Année&nbsp;{{ schoolYearLabel }}</span>
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
      <h2>Liste {{ schoolYearLabel }} — {{ parsedData.length }} élève{{ parsedData.length > 1 ? 's' : '' }}</h2>

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
        <button @click="openAddChildModal" class="add-button">Ajouter un élève</button>
        <button @click="confirmData" class="confirm-button">Valider la liste annuelle</button>
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
            <td><input v-model="row.nom" class="cell-input" /></td>
            <td><input v-model="row.prenom" class="cell-input" /></td>
            <td>
              <button
                @click="removeRow((currentPage - 1) * pageSize + index)"
                class="delete-button"
              >
                Supprimer
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div class="pagination">
        <button @click="prevPage" :disabled="currentPage === 1" class="page-button">
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

      <!-- Action bar bas -->
      <div class="action-bar bottom-bar">
        <button @click="openAddChildModal" class="add-button">Ajouter un élève</button>
        <button @click="confirmData" class="confirm-button">Valider la liste annuelle</button>
      </div>
    </div>

    <!-- Modale ajout élève -->
    <div v-if="showModal" class="modal-overlay">
      <div class="modal">
        <h3>Ajouter un élève</h3>
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

    <!-- ConfirmDialog -->
    <div v-if="showConfirm" class="modal-overlay">
      <div class="modal">
        <h3>Confirmer l'import {{ schoolYearLabel }}</h3>
        <p>Cette action enregistrera définitivement la liste {{ schoolYearLabel }}.<br />Continuer&nbsp;?</p>
        <div class="modal-actions">
          <button
            @click="sendToBackend"
            class="confirm-button"
            :disabled="isSubmitting"
          >
            Oui, valider
          </button>
          <button
            @click="showConfirm = false"
            class="delete-button"
            :disabled="isSubmitting"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import api from '@/services/api'
import { useToast } from 'vue-toastification'

type Row = { nom: string; prenom: string }

/* Guards */
const auth = useAuthStore()
const router = useRouter()
if (!auth.isAuthenticated || auth.user?.role !== 'SECRETARY')
  router.replace({ name: 'Home' })

const toast = useToast()

/* State */
const fileInput = ref<HTMLInputElement | null>(null)
const parsedData = ref<Row[]>([])
const errorMessage = ref<string | null>(null)
const searchTerm = ref('')
const currentPage = ref(1)
const pageSize = ref(10)

/* Année scolaire automatique N-(N+1) */
const currentYear = new Date().getFullYear()
const schoolYear = ref(currentYear)
const schoolYearLabel = computed(() => `${schoolYear.value}-${schoolYear.value + 1}`)

/* Modales */
const showModal = ref(false)
const showConfirm = ref(false)
const isSubmitting = ref(false)
const newChildNom = ref('')
const newChildPrenom = ref('')
const modalErrorMessage = ref('')

/* Helpers */
const isValidName = (s: string) => /^[A-Za-zÀ-ÖØ-öø-ÿ]{2,}$/.test(s.trim())

/* Computed */
const filteredData = computed(() => {
  const sorted = [...parsedData.value].sort((a, b) =>
    a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' })
  )
  if (!searchTerm.value) return sorted
  const t = searchTerm.value.toLowerCase()
  return sorted.filter(
    r =>
      r.nom.toLowerCase().includes(t) || r.prenom.toLowerCase().includes(t)
  )
})
const totalPages = computed(
  () => Math.ceil(filteredData.value.length / pageSize.value) || 1
)
const paginatedData = computed(() =>
  filteredData.value.slice(
    (currentPage.value - 1) * pageSize.value,
    currentPage.value * pageSize.value
  )
)

/* File handling */
const triggerFileInput = () => fileInput.value?.click()

async function handleFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  const { read, utils } = await import('xlsx')
  const wb = read(await file.arrayBuffer(), { type: 'array' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const json: any[] = utils.sheet_to_json(sheet)

  if (!json.length || !('NOM' in json[0]) || !('Prénom' in json[0])) {
    errorMessage.value =
      'Le fichier doit contenir les colonnes "NOM" et "Prénom".'
    parsedData.value = []
    return
  }

  const rows = json.map(r => ({
    nom: String(r.NOM ?? '').trim(),
    prenom: String(r.Prénom ?? '').trim()
  }))
  const valid = rows.filter(r => r.nom || r.prenom)

  if (!valid.length) {
    errorMessage.value = 'Aucune donnée valide trouvée.'
    parsedData.value = []
    return
  }

  parsedData.value = valid
  errorMessage.value = null
  currentPage.value = 1
}

/* Table actions */
function removeRow(idx: number) {
  parsedData.value.splice(idx, 1)
  if (currentPage.value > totalPages.value)
    currentPage.value = totalPages.value
}
function prevPage() {
  if (currentPage.value > 1) currentPage.value--
}
function nextPage() {
  if (currentPage.value < totalPages.value) currentPage.value++
}

/* Validation & submit */
function confirmData() {
  const invalid = parsedData.value.filter(
    r => !isValidName(r.nom) || !isValidName(r.prenom)
  )
  if (invalid.length) {
    errorMessage.value =
      'Élèves invalides : ' +
      invalid.map(r => `${r.nom} ${r.prenom}`).join(', ')
    return
  }
  errorMessage.value = null
  showConfirm.value = true
}

async function sendToBackend() {
  isSubmitting.value = true
  try {
    await api.post('/students/bulk', parsedData.value, {
      params: { schoolYear: schoolYear.value }
    })
    toast.success(`Liste ${schoolYearLabel.value} enregistrée`)
    showConfirm.value = false
    router.push({ name: 'Dashboard' })
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Erreur serveur')
  } finally {
    isSubmitting.value = false
  }
}

/* Modal élève */
function openAddChildModal() {
  modalErrorMessage.value = ''
  newChildNom.value = ''
  newChildPrenom.value = ''
  showModal.value = true
}
function closeAddChildModal() {
  showModal.value = false
}
function confirmAddChild() {
  if (!isValidName(newChildNom.value) || !isValidName(newChildPrenom.value)) {
    modalErrorMessage.value = 'Nom / prénom non valides'
    return
  }
  parsedData.value.push({
    nom: newChildNom.value.trim(),
    prenom: newChildPrenom.value.trim()
  })
  closeAddChildModal()
}
</script>

<style scoped>
.yearly-student-import {
  padding: 2rem;
  font-family: Arial, Helvetica, sans-serif;
}
.button-bar {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-bottom: 1rem;
}
.year-badge {
  font-weight: 600;
}
.import-button,
.confirm-button,
.delete-button,
.page-button,
.add-button {
  padding: 0.5rem 1rem;
  border: none;
  background-color: #3b82f6;
  color: #fff;
  border-radius: 0.25rem;
  cursor: pointer;
}
.add-button {
  background-color: #10b981;
}
.import-button:hover,
.confirm-button:hover,
.delete-button:hover,
.page-button:hover,
.add-button:hover {
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
.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 1rem 0;
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
  padding: 0.25rem;
  border: 1px solid #ccc;
  border-radius: 0.25rem;
}
.pagination {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 1rem 0;
}
.error-message {
  color: red;
  margin-top: 0.5rem;
}

/* Modal styles */
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
  max-width: 420px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}
.modal-body {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
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
