<!-- src/views/planning/PlanningUploadView.vue -->
<template>
  <div class="planning-upload">
    <h1>Gestion Planning Semestriel</h1>

    <!-- Sélecteur de semestre -->
    <div class="form-group">
      <label for="semester">Semestre</label>
      <select id="semester" v-model="selectedSemesterId">
        <option disabled value="">— Choisir un semestre —</option>
        <option v-for="s in semesters" :key="s.id" :value="s.id">
          {{ s.name }}
        </option>
      </select>
    </div>

    <!-- Import Excel global -->
    <div class="form-group">
      <input type="file" @change="onFileChange" accept=".xlsx,.xls" />
    </div>

    <!-- Boutons d’action -->
    <div class="form-actions">
      <button @click="previewAll" :disabled="!canPreview">
        1. Prévisualiser
      </button>
      <button @click="importAll" :disabled="!canImport">
        2. Générer
      </button>
      <button @click="downloadExcel" :disabled="!canDownload">
        3. Télécharger Excel
      </button>
      <button @click="submitAll" :disabled="!canSubmit">
        4. Valider planning
      </button>
    </div>

    <!-- Erreur -->
    <p v-if="error" class="error">{{ error }}</p>

    <!-- FullCalendar pour la preview agrégée -->
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
const file                = ref<File|null>(null)
const selectedSemesterId  = ref<string>('')

// computed store data
const error       = computed(() => planning.error)
const loading     = computed(() => planning.loading)
const semesters   = computed(() => planning.semesters)
const allEntries  = computed(() => planning.allEntries)
const downloadUrl = computed(() => planning.downloadUrl)

// contrôles des boutons
const canPreview  = computed(() =>
  !!file.value &&
  selectedSemesterId.value !== '' &&
  !loading.value
)
const canImport   = computed(() => canPreview.value)
const canDownload = computed(() =>
  downloadUrl.value !== '' &&
  !loading.value
)
const canSubmit   = computed(() =>
  allEntries.value.length > 0 &&
  !loading.value
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
}

async function downloadExcel() {
  if (!canDownload.value) return
  await planning.downloadAll()
  if (planning.downloadUrl) window.open(planning.downloadUrl, '_blank')
}

async function submitAll() {
  if (!canSubmit.value) return
  await planning.submitPlanning()
  alert('Planning validé et disponible pour tous !')
}

// transformer les entrées en événements FullCalendar
const calendarEvents = computed(() =>
  allEntries.value.map(e => ({
    id:    e.id,
    title: e.activity,
    start: e.startTime,
    end:   e.endTime,
    extendedProps: { children: e.children },
  }))
)

// au montage, on charge la liste des semestres
onMounted(async () => {
  await planning.fetchSemesters()
})
</script>

<style scoped>
.planning-upload { max-width: 800px; margin: auto; }
.form-group    { margin-bottom: 1rem; }
.form-actions  { display: flex; gap: 0.5rem; margin: 1rem 0; }
.error         { color: red; }
</style>
