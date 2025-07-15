<!-- src/views/planning/PlanningUploadView.vue -->
<template>
  <div class="planning-upload">
    <h1>Gestion Planning Semestriel</h1>

    <!-- Sélecteur de semestre -->
    <div class="form-group">
      <label for="semester">Semestre</label>
      <select
        id="semester"
        v-model="selectedSemesterId"
        @change="onSemesterChange"
      >
        <option disabled value="">— Choisir un semestre —</option>
        <option
          v-for="s in semesters"
          :key="s.id"
          :value="s.id"
        >{{ s.name }}</option>
      </select>
    </div>

    <!-- Fichier Excel -->
    <div class="form-group">
      <input type="file" @change="onFileChange" accept=".xlsx,.xls" />
    </div>

    <!-- Actions -->
    <div class="form-actions">
      <button @click="previewAll" :disabled="!canPreview">
        1. Prévisualiser
      </button>
      <button @click="importAll" :disabled="!canImport">
        2. Importer définitivement
      </button>
      <button @click="submitAll" :disabled="!canSubmit">
        3. Valider planning
      </button>
    </div>

    <!-- Erreur -->
    <p v-if="error" class="error">{{ error }}</p>

    <!-- Sélecteur d’éducateur après preview -->
    <div v-if="previewEntries.length" class="form-group">
      <label for="staffFilter">Éducateur</label>
      <select id="staffFilter" v-model="selectedStaffId">
        <option disabled value="">— Choisir un éducateur —</option>
        <option
          v-for="st in staffList"
          :key="st.userId"
          :value="st.userId"
        >{{ st.firstName }} {{ st.lastName }}</option>
      </select>
    </div>

    <!-- Debug console data -->
    <pre v-if="debug" class="debug">
{{ JSON.stringify({ selectedStaffId, filteredEvents }, null, 2) }}
    </pre>

    <!-- Calendrier FullCalendar -->
    <FullCalendar
      v-if="calendarOptions.events.length"
      :options="calendarOptions"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import FullCalendar from '@fullcalendar/vue3'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin  from '@fullcalendar/daygrid'
import { usePlanningStore } from '@/stores/planning'

/** Stores & états locaux **/
const planning           = usePlanningStore()
const file               = ref<File|null>(null)
const selectedSemesterId = ref<string>('')
const selectedStaffId    = ref<string>('')
const debug              = ref(true)   // afficher le bloc <pre> pour débug

/** Données du store **/
const semesters      = computed(() => planning.semesters)
const staffList      = computed(() => planning.staffList)
const previewEntries = computed(() => planning.previewEntries)
const error          = computed(() => planning.error)
const loading        = computed(() => planning.loading)

/** Contrôles **/
const canPreview = computed(() =>
  !!file.value && selectedSemesterId.value !== '' && !loading.value
)
const canImport = computed(() => canPreview.value)
const canSubmit = computed(() =>
  previewEntries.value.length > 0 && !loading.value
)

/** Configuration du calendrier **/
const calendarOptions = ref({
  plugins: [ timeGridPlugin, dayGridPlugin ],
  initialView: 'timeGridWeek',
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'timeGridWeek,dayGridMonth'
  },
  events: [] as any[],
})

/** Met à jour `calendarOptions.events` et logge en console **/
watch(
  () => [ previewEntries.value, selectedStaffId.value ],
  () => {
    if (selectedStaffId.value) {
      const evts = previewEntries.value
        .filter(e => e.staffId === selectedStaffId.value)
        .map(e => ({
          id: e.id,
          title: e.activity,
          start: e.startTime,
          end: e.endTime,
          extendedProps: { children: e.children },
        }))
      calendarOptions.value.events = evts
      console.log('Staff sélectionné :', selectedStaffId.value)
      console.log('Événements pour cet éducateur :', evts)
    } else {
      calendarOptions.value.events = []
    }
  },
  { immediate: true }
)

/** Réinitialisation au changement de semestre **/
function onSemesterChange() {
  file.value = null
  selectedStaffId.value = ''
  planning.previewEntries = []
  calendarOptions.value.events = []
}

/** Gestion du fichier Excel **/
function onFileChange(e: Event) {
  file.value = (e.target as HTMLInputElement).files?.[0] ?? null
}

/** Appels au store **/
async function previewAll() {
  if (!canPreview.value) return
  planning.selectSemester(selectedSemesterId.value)
  await planning.fetchStaffList()
  await planning.previewAll(file.value!)
}
async function importAll() {
  if (!canImport.value) return
  planning.selectSemester(selectedSemesterId.value)
  await planning.importAll(file.value!)
}
async function submitAll() {
  if (!canSubmit.value) return
  await planning.submitPlanning()
  alert('Planning validé et publié !')
}

/** Au montage, on charge semestres & staff **/
onMounted(async () => {
  await planning.fetchSemesters()
  await planning.fetchStaffList()
})
</script>

<style scoped>
.planning-upload { max-width: 800px; margin: auto; }
.form-group    { margin-bottom: 1rem; }
.form-actions  { display: flex; gap: 0.5rem; margin: 1rem 0; }
.error         { color: red; }
.debug         { background: #f6f6f6; padding: 1rem; overflow: auto; margin: 1rem 0; }
</style>
