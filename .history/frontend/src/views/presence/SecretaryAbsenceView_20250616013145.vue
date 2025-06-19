<template>
  <div class="p-4 max-w-4xl mx-auto space-y-6">
    <h1 class="text-2xl font-bold">Gestion des absences / retards</h1>

    <!-- Sélecteur de date -->
    <div class="flex items-center gap-2">
      <label for="date-picker" class="font-medium">Date :</label>
      <input
        id="date-picker"
        type="date"
        v-model="date"
        @change="onDateChange"
        class="border rounded px-2 py-1"
      />
    </div>

    <!-- Loader -->
    <div v-if="loading" class="text-center py-8">Chargement…</div>

    <div v-else>
      <!-- Statistiques -->
      <div class="grid grid-cols-4 gap-4 text-center">
        <div class="bg-green-100 p-4 rounded">
          <p class="text-lg font-semibold">{{ presentCount }}</p>
          <p class="text-sm text-gray-600">Présents</p>
        </div>
        <div class="bg-red-100 p-4 rounded">
          <p class="text-lg font-semibold">{{ pendingCount }}</p>
          <p class="text-sm text-gray-600">Absents non justifiés</p>
        </div>
        <div class="bg-yellow-100 p-4 rounded">
          <p class="text-lg font-semibold">{{ latenessCount }}</p>
          <p class="text-sm text-gray-600">Retards justifiés</p>
        </div>
        <div class="bg-indigo-100 p-4 rounded">
          <p class="text-lg font-semibold">{{ absenceCount }}</p>
          <p class="text-sm text-gray-600">Absences justifiées</p>
        </div>
      </div>

      <!-- Présents -->
      <section v-if="presentRecords.length">
        <h2 class="text-lg font-medium mt-6 mb-2">Enfants présents</h2>
        <table class="w-full table-auto border-collapse mb-6">
          <thead class="bg-gray-100">
            <tr>
              <th class="px-4 py-2 text-left">Nom</th>
              <th class="px-4 py-2 text-left">Prénom</th>
              <th class="px-4 py-2 text-left">Statut</th>
              <th class="px-4 py-2 text-left">Téléphone</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="rec in presentRecords"
              :key="rec.id"
              class="border-t"
            >
              <td class="px-4 py-2">{{ rec.child.lastName }}</td>
              <td class="px-4 py-2">{{ rec.child.firstName }}</td>
              <td class="px-4 py-2 text-green-700 font-medium">Présent</td>
              <td class="px-4 py-2">{{ rec.child.parent?.phone || 'N/A' }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- Absents non justifiés -->
      <section v-if="pendingRecords.length">
        <h2 class="text-lg font-medium mt-6 mb-2">Absents non justifiés</h2>
        <table class="w-full table-auto border-collapse mb-6">
          <thead class="bg-gray-100">
            <tr>
              <th class="px-4 py-2 text-left">Nom</th>
              <th class="px-4 py-2 text-left">Prénom</th>
              <th class="px-4 py-2 text-red-700 font-medium">Statut</th>
              <th class="px-4 py-2 text-left">Téléphone</th>
              <th class="px-4 py-2 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="rec in pendingRecords"
              :key="rec.id"
              class="border-t"
            >
              <td class="px-4 py-2">{{ rec.child.lastName }}</td>
              <td class="px-4 py-2">{{ rec.child.firstName }}</td>
              <td class="px-4 py-2 text-red-700 font-medium">Absent</td>
              <td class="px-4 py-2">{{ rec.child.parent?.phone || 'N/A' }}</td>
              <td class="px-4 py-2 text-center">
                <button
                  class="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                  @click="openModal(rec)"
                >
                  Justifier
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- Retards justifiés -->
      <section v-if="justifiedLateness.length">
        <h2 class="text-lg font-medium mt-6 mb-2">Retards justifiés</h2>
        <table class="w-full table-auto border-collapse mb-6">
          <thead class="bg-gray-100">
            <tr>
              <th class="px-4 py-2 text-left">Nom</th>
              <th class="px-4 py-2 text-left">Prénom</th>
              <th class="px-4 py-2 text-yellow-700 font-medium">Statut</th>
              <th class="px-4 py-2 text-left">Date justif.</th>
              <th class="px-4 py-2 text-left">Motif</th>
              <th class="px-4 py-2 text-center">Fichier</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="rec in justifiedLateness"
              :key="rec.id"
              class="border-t"
            >
              <td class="px-4 py-2">{{ rec.child.lastName }}</td>
              <td class="px-4 py-2">{{ rec.child.firstName }}</td>
              <td class="px-4 py-2 text-yellow-700 font-medium">Retard</td>
              <td class="px-4 py-2">{{ formatDate(rec.justification!.justificationDate) }}</td>
              <td class="px-4 py-2">{{ rec.justification!.motif || '—' }}</td>
              <td class="px-4 py-2 text-center space-x-2">
                
                <a
                  v-if="rec.justification!.filePath"
                  :href="fileUrl(rec.justification!.filePath)"
                  download
                  class="px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                >Télécharger</a>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- Absences justifiées -->
      <section v-if="justifiedAbsences.length">
        <h2 class="text-lg font-medium mt-6 mb-2">Absences justifiées</h2>
        <table class="w-full table-auto border-collapse mb-6">
          <thead class="bg-gray-100">
            <tr>
              <th class="px-4 py-2 text-left">Nom</th>
              <th class="px-4 py-2 text-left">Prénom</th>
              <th class="px-4 py-2 text-indigo-700 font-medium">Statut</th>
              <th class="px-4 py-2 text-left">Date justif.</th>
              <th class="px-4 py-2 text-left">Motif</th>
              <th class="px-4 py-2 text-center">Fichier</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="rec in justifiedAbsences"
              :key="rec.id"
              class="border-t"
            >
              <td class="px-4 py-2">{{ rec.child.lastName }}</td>
              <td class="px-4 py-2">{{ rec.child.firstName }}</td>
              <td class="px-4 py-2 text-indigo-700 font-medium">Absence</td>
              <td class="px-4 py-2">{{ formatDate(rec.justification!.justificationDate) }}</td>
              <td class="px-4 py-2">{{ rec.justification!.motif }}</td>
              <td class="px-4 py-2 text-center space-x-2">
                <a
                  v-if="rec.justification!.filePath"
                  :href="fileUrl(rec.justification!.filePath)"
                  target="_blank"
                  rel="noopener"
                  class="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                >Ouvrir</a>
                <a
                  v-if="rec.justification!.filePath"
                  :href="fileUrl(rec.justification!.filePath)"
                  download
                  class="px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                >Télécharger</a>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- Modal de justification -->
      <JustifyModal
        v-if="modalOpen"
        :record="modalRecord"
        @close="closeModal"
        @submit="submitJustification"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { usePresenceStore } from '@/stores/presenceStore'
import { useNotificationStore } from '@/stores/notificationStore'
import JustifyModal from '@/components/presence/JustifyModal.vue'

const store = usePresenceStore()
const notify = useNotificationStore()

const date = ref(store.date)
const loading = computed(() => store.loading)
const today = new Date().toISOString().substring(0, 10)

// Jeux d’enregistrements filtrés par type
const presentRecords    = computed(() => store.sheet?.records.filter(r => r.present) || [])
const pendingRecords    = computed(() => store.sheet?.records.filter(r => !r.present && !r.justification) || [])
const justifiedLateness = computed(() => store.sheet?.records.filter(r => r.justification?.type === 'LATENESS') || [])
const justifiedAbsences = computed(() => store.sheet?.records.filter(r => r.justification?.type === 'ABSENCE') || [])

// Compteurs
const presentCount  = computed(() => presentRecords.value.length)
const pendingCount  = computed(() => pendingRecords.value.length)
const latenessCount = computed(() => justifiedLateness.value.length)
const absenceCount  = computed(() => justifiedAbsences.value.length)

const modalOpen = ref(false)
const modalRecord = ref<any>(null)

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Génère l’URL complète vers le justificatif sur le port 3000.
 * Ex : "/uploads/justifications/xxx" → "http://localhost:3000/uploads/justifications/xxx"
 */
function fileUrl(path: string) {
  const cleaned = path.startsWith('/') ? path : `/${path}`
  return `http://localhost:3000${cleaned}`
}

function onDateChange() {
  store.setDate(date.value)
  store.fetchSheet()
}

function openModal(rec: any) {
  modalRecord.value = rec
  modalOpen.value   = true
}

function closeModal() {
  modalOpen.value = false
}

async function submitJustification(payload: {
  recordId: number
  type: string
  justificationDate: string
  motif?: string
  file?: File
}) {
  try {
    await store.justifyRecord(
      payload.recordId,
      payload.type,
      payload.justificationDate,
      payload.motif,
      payload.file
    )
    notify.showNotification('Justification enregistrée', 'success')
  } catch (err: any) {
    notify.showNotification(err.message || 'Erreur lors de la justification', 'error')
  } finally {
    closeModal()
  }
}

onMounted(() => {
  store.fetchSheet()
  date.value = store.date
})

watch(() => store.date, d => date.value = d)
</script>

<style scoped>
/* Ajustements CSS éventuels */
</style>
