<!-- src/views/planning/PlanningUploadView.vue -->
<template>
  <div class="planning-upload">
    <h1>Gestion Planning Semestriel</h1>

    <!-- Sélecteur de semestre -->
    <div class="form-group">
      <label for="semester">Semestre</label>
      <select id="semester" v-model="selectedSemesterId" @change="onSemesterChange">
        <option disabled value="">— Choisir un semestre —</option>
        <option v-for="s in semesters" :key="s.id" :value="s.id">
          {{ s.name }}
        </option>
      </select>
    </div>

    <!-- Fichier Excel -->
    <div class="form-group">
      <input type="file" @change="onFileChange" accept=".xlsx,.xls" />
    </div>

    <!-- Actions -->
    <div class="form-actions">
      <button @click="previewAll" :disabled="!canPreview">1. Prévisualiser</button>
      <button @click="importAll" :disabled="!canImport">2. Importer définitivement</button>
      <button @click="submitAll" :disabled="!canSubmit">3. Valider planning</button>
    </div>

    <!-- Erreur -->
    <p v-if="error" class="error">{{ error }}</p>

    <!-- Sélecteur d’éducateur après preview -->
    <div v-if="previewEntries.length" class="form-group">
      <label for="staffFilter">Éducateur</label>
      <select id="staffFilter" v-model="selectedStaffId">
        <option disabled value="">— Choisir un éducateur —</option>
        <option v-for="st in staffList" :key="st.userId" :value="st.userId">
          {{ st.firstName }} {{ st.lastName }}
        </option>
      </select>
    </div>

    <!-- Calendrier pour l’éducateur sélectionné -->
    <FullCalendar
      v-if="filteredEvents.length"
      :plugins="[timeGridPlugin, dayGridPlugin]"
      :events="filteredEvents"
      initialView="timeGridWeek"         <!-- camelCase ici -->
      :headerToolbar="{                <!-- camelCase ici aussi -->
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

// état local
const file               = ref<File|null>(null)
const selectedSemesterId = ref<string>('')
const selectedStaffId    = ref<string>('')

// données du store
const semesters      = computed(() => planning.semesters)
const staffList      = computed(() => planning.staffList)
const previewEntries = computed(() => planning.previewEntries)
const error          = computed(() => planning.error)
const loading        = computed(() => planning.loading)

// contrôles
const canPreview = computed(() =>
  !!file.value && selectedSemesterId.value !== '' && !loading.value
)
const canImport = computed(() => canPreview.value)
const canSubmit = computed(() =>
  previewEntries.value.length > 0 && !loading.value
)

// filtrage des événements selon l’éducateur sélectionné
const filteredEvents = computed(() =>
  previewEntries.value
    .filter(e => e.staffId === selectedStaffId.value)
    .map(e => ({
      id: e.id,
      title: e.activity,
      start: e.startTime,
      end: e.endTime,
      extendedProps: { children: e.children },
    }))
)

// remet à zéro le staff et le fichier quand on change de semestre
function onSemesterChange() {
  file.value = null
  selectedStaffId.value = ''
  planning.previewEntries = []
}

// gestion du fichier
function onFileChange(e: Event) {
  file.value = (e.target as HTMLInputElement).files?.[0] ?? null
}

// preview
async function previewAll() {
  if (!canPreview.value) return
  planning.selectSemester(selectedSemesterId.value)
  await planning.previewAll(file.value!)
}

// import définitif
async function importAll() {
  if (!canImport.value) return
  planning.selectSemester(selectedSemesterId.value)
  await planning.importAll(file.value!)
}

// soumission
async function submitAll() {
  if (!canSubmit.value) return
  await planning.submitPlanning()
  alert('Planning validé et publié !')
}

// on mount : on charge semestres + staffList
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
</style>
