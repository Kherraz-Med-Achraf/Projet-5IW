<!-- src/views/planning/PlanningUploadView.vue -->
<template>
  <div class="planning-upload">
    <h1>Gestion Planning Semestriel</h1>

    <!-- Sélecteur de semestre -->
    <div class="form-group">
      <label for="semester">Semestre</label>
      <select id="semester" v-model="selectedSemesterId">
        <option disabled value="">— Choisir un semestre —</option>
        <option
          v-for="sem in semesters"
          :key="sem.id"
          :value="sem.id"
        >
          {{ sem.name }}
        </option>
      </select>
    </div>

    <!-- Import Excel global -->
    <div class="form-group">
      <label for="file">Fichier Excel</label>
      <input
        id="file"
        type="file"
        @change="onFileChange"
        accept=".xlsx,.xls"
      />
    </div>

    <!-- Boutons d’action -->
    <div class="form-actions">
      <button
        @click="previewAll"
        :disabled="!canPreview"
      >
        1. Prévisualiser
      </button>
      <button
        @click="importAll"
        :disabled="!canImport"
      >
        2. Importer
      </button>
      <button
        @click="submitAll"
        :disabled="!canSubmit"
      >
        3. Valider planning
      </button>
      <button
        @click="downloadAll"
        :disabled="!canDownload"
      >
        4. Télécharger Excel
      </button>
    </div>

    <!-- Erreur -->
    <p v-if="error" class="error">{{ error }}</p>

    <!-- Aperçu FullCalendar -->
    <FullCalendar
      v-if="allEntries.length"
      :plugins="[timeGridPlugin, dayGridPlugin]"
      :events="calendarEvents"
      initial-view="timeGridWeek"
      :header-toolbar="{
        left: 'prev,next today',
        center: 'title',
        right: 'timeGridWeek,dayGridMonth'
      }"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import FullCalendar from '@fullcalendar/vue3'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin from '@fullcalendar/daygrid'
import { usePlanningStore } from '@/stores/planning'
import { useAuthStore } from '@/stores/auth'

const planning = usePlanningStore()
const auth     = useAuthStore()

// local state
const file               = ref<File|null>(null)
const selectedSemesterId = ref<string>('')

// computed from store
const semesters  = computed(() => planning.semesters)
const allEntries = computed(() => planning.allEntries)
const error      = computed(() => planning.error)
const loading    = computed(() => planning.loading)

// enable preview/import only once a semester is chosen and a file loaded
const canPreview = computed(() =>
  !!selectedSemesterId.value &&
  !!file.value &&
  !loading.value
)
const canImport = canPreview
// enable submit once preview passed (i.e. there are some entries)
const canSubmit = computed(() =>
  !loading.value &&
  allEntries.value.length > 0
)
// enable download once import done (we store the blob URL keyed by semester)
const canDownload = computed(() =>
  !!selectedSemesterId.value &&
  !!planning.downloadUrls[selectedSemesterId.value] &&
  !loading.value
)
const downloadUrl = computed(() =>
  planning.downloadUrls[selectedSemesterId.value] || ''
)

// transform entries for FullCalendar
const calendarEvents = computed(() =>
  allEntries.value.map(e => ({
    id: e.id,
    title: e.activity,
    start: e.startTime,
    end: e.endTime,
    extendedProps: { children: e.children },
  }))
)

// handlers
function onFileChange(e: Event) {
  file.value = (e.target as HTMLInputElement).files?.[0] ?? null
}

async function previewAll() {
  if (!canPreview.value) return
  planning.selectSemester(selectedSemesterId.value)
  await planning.previewAll(file.value as File)     // appelle /upload
}

async function importAll() {
  if (!canImport.value) return
  planning.selectSemester(selectedSemesterId.value)
  await planning.importAll(file.value as File)      // appelle /import
  // une fois importé, on peut recharger l’aperçu à partir de la BDD
  await planning.fetchAggregated()
}

async function submitAll() {
  if (!canSubmit.value) return
  await planning.submitPlanning()
  alert('Planning validé et publié !')
}

async function downloadAll() {
  if (!canDownload.value) return
  // appelle le store pour récupérer le buffer et créer l’URL
  await planning.downloadAll()
  const url = downloadUrl.value
  if (url) window.open(url, '_blank')
}

// on mount, on charge la liste des semestres
onMounted(async () => {
  await planning.fetchSemesters()
})
</script>

<style scoped>
.planning-upload {
  max-width: 800px;
  margin: auto;
}

.form-group {
  margin-bottom: 1rem;
}

.form-actions {
  display: flex;
  gap: 0.5rem;
  margin: 1rem 0;
}

.error {
  color: red;
}
</style>
