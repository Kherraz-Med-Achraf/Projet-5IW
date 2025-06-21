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
          v-for="s in semesters"
          :key="s.id"
          :value="s.id"
        >{{ s.name }}</option>
      </select>
    </div>

    <!-- Import Excel global -->
    <div class="form-group">
      <input
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
      >1. Prévisualiser</button>
      <button
        @click="importAll"
        :disabled="!canImport"
      >2. Importer définitivement</button>
      <button
        @click="submitAll"
        :disabled="!canSubmit"
      >3. Valider planning</button>
    </div>

    <!-- Erreur -->
    <p v-if="error" class="error">{{ error }}</p>

    <!-- Aperçu FullCalendar -->
    <FullCalendar
      v-if="previewEntries.length > 0"
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

const planning = usePlanningStore()

// local
const file               = ref<File|null>(null)
const selectedSemesterId = ref<string>('')

// store
const semesters      = computed(() => planning.semesters)
const previewEntries = computed(() => planning.previewEntries)
const loading        = computed(() => planning.loading)
const error          = computed(() => planning.error)

// controls
const canPreview = computed(() =>
  !!file.value &&
  selectedSemesterId.value !== '' &&
  !loading.value
)
const canImport = computed(() =>
  canPreview.value
)
const canSubmit = computed(() =>
  previewEntries.value.length > 0 && !loading.value
)

// handlers
function onFileChange(e: Event) {
  file.value = (e.target as HTMLInputElement).files?.[0] ?? null
}

async function previewAll() {
  if (!canPreview.value) return
  planning.selectSemester(selectedSemesterId.value)
  await planning.previewAll(file.value!)
}

async function importAll() {
  if (!canImport.value) return
  await planning.importAll(file.value!)
  // rechargement de l’aperçu
  await planning.fetchAggregated()
}

async function submitAll() {
  if (!canSubmit.value) return
  await planning.submitPlanning()
  alert('Planning validé et publié !')
}

// FullCalendar events
const calendarEvents = computed(() =>
  previewEntries.value.map(e => ({
    id: e.id,
    title: e.activity,
    start: e.startTime,
    end: e.endTime,
    extendedProps: { children: e.children },
  }))
)

// initialization
onMounted(() => {
  planning.fetchSemesters()
})
</script>

<style scoped>
.planning-upload { max-width: 800px; margin: auto; }
.form-group    { margin-bottom: 1rem; }
.form-actions  { display: flex; gap: 0.5rem; margin: 1rem 0; }
.error         { color: red; }
</style>
