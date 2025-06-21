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

    <!-- Statistiques -->
    <div v-else class="grid grid-cols-3 gap-4 text-center">
      <div class="bg-green-100 p-4 rounded">
        <p class="text-lg font-semibold">{{ presentCount }}</p>
        <p class="text-sm text-gray-600">Présents</p>
      </div>
      <div class="bg-red-100 p-4 rounded">
        <p class="text-lg font-semibold">{{ absentCount }}</p>
        <p class="text-sm text-gray-600">Absents non justifiés</p>
      </div>
      <div class="bg-yellow-100 p-4 rounded">
        <p class="text-lg font-semibold">{{ justifiedCount }}</p>
        <p class="text-sm text-gray-600">Absences justifiées</p>
      </div>
    </div>

    <!-- Tableau des enfants présents -->
    <div v-if="presentRecords.length">
      <h2 class="text-lg font-medium mb-2">Enfants présents</h2>
      <table class="w-full table-auto border-collapse mb-6">
        <thead class="bg-gray-100">
          <tr>
            <th class="px-4 py-2 text-left">Nom</th>
            <th class="px-4 py-2 text-left">Prénom</th>
            <th class="px-4 py-2 text-left">Statut</th>
            <th class="px-4 py-2 text-left">Téléphone</th>
            <th class="px-4 py-2"></th>
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
            <td class="px-4 py-2 text-center"></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Tableau des absences pendantes -->
    <div v-if="pendingRecords.length">
      <h2 class="text-lg font-medium mb-2">Absents non justifiés</h2>
      <table class="w-full table-auto border-collapse mb-6">
        <thead class="bg-gray-100">
          <tr>
            <th class="px-4 py-2 text-left">Nom</th>
            <th class="px-4 py-2 text-left">Prénom</th>
            <th class="px-4 py-2 text-left">Statut</th>
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
    </div>
    <div v-else class="text-center text-gray-500">
      Toutes les absences sont déjà justifiées.
    </div>

    <!-- Modal de justification -->
    <JustifyModal
      v-if="modalOpen"
      :record="modalRecord"
      @close="closeModal"
      @submit="submitJustification"
    />
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

// Filtrage des enregistrements
const presentRecords   = computed(() => store.sheet?.records.filter(r => r.present) || [])
const justifiedRecords = computed(() => store.sheet?.records.filter(r => !r.present && r.justification) || [])
const pendingRecords   = computed(() => store.sheet?.records.filter(r => !r.present && !r.justification) || [])

// Compteurs dynamiques
const presentCount   = computed(() => presentRecords.value.length)
const justifiedCount = computed(() => justifiedRecords.value.length)
const absentCount    = computed(() => pendingRecords.value.length)

const modalOpen = ref(false)
const modalRecord = ref<any>(null)

function onDateChange() {
  store.setDate(date.value)
  store.fetchSheet()
}

function openModal(record: any) {
  modalRecord.value = record
  modalOpen.value = true
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
  } catch (e: any) {
    notify.showNotification(e.message || 'Erreur lors de la justification', 'error')
  } finally {
    closeModal()
  }
}

onMounted(() => {
  store.fetchSheet()
  date.value = store.date
})

// Synchronise le picker si la date change ailleurs
watch(() => store.date, d => date.value = d)
</script>

<style scoped>
/* Tu peux ajuster ces styles selon tes préférences */
</style>
