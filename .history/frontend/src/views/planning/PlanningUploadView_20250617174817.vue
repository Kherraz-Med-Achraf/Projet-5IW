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

    <!-- Sélecteur de staff -->
    <div class="form-group">
      <label for="staff">Éducateur</label>
      <select id="staff" v-model="selectedStaffId">
        <option disabled value="">— Choisir un éducateur —</option>
        <option v-for="st in staffList" :key="st.userId" :value="st.userId">
          {{ st.firstName }} {{ st.lastName }}
        </option>
      </select>
    </div>

    <!-- Import Excel -->
    <div class="form-group">
      <input type="file" @change="onFileChange" accept=".xlsx,.xls" />
    </div>

    <!-- Boutons d’action -->
    <div class="form-actions">
      <button @click="importExcel" :disabled="!canImport">
        1. Importer
      </button>
      <button @click="previewAll" :disabled="!selectedSemesterId">
        2. Prévisualiser
      </button>
      <button @click="submitAll" :disabled="!allImported">
        3. Valider planning
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
const file               = ref<File|null>(null)
const selectedSemesterId = ref<string>('')
const selectedStaffId    = ref<string>('')

// computed store data
const error       = computed(() => planning.error)
const loading     = computed(() => planning.loading)
const semesters   = computed(() => planning.semesters)
const staffList   = computed(() => planning.staffList)
const allEntries  = computed(() => planning.allEntries)

// contrôle des boutons
const canImport = computed(() =>
  !!file.value &&
  selectedSemesterId.value !== '' &&
  selectedStaffId.value !== '' &&
  !loading.value
)
// tout importé si chaque éducateur a son Excel
const allImported = computed(() =>
  staffList.value.length > 0 &&
  planning.importedStaffIds.length === staffList.value.length
)

// handlers
function onFileChange(e: Event) {
  file.value = (e.target as HTMLInputElement).files?.[0] ?? null
}

async function importExcel() {
  if (!canImport.value) return
  planning.selectSemester(selectedSemesterId.value)
  await planning.importForStaff(file.value!, selectedStaffId.value)
}

async function previewAll() {
  if (!selectedSemesterId.value) return
  planning.selectSemester(selectedSemesterId.value)
  await planning.fetchAggregated()
}

async function submitAll() {
  if (!allImported.value) return
  await planning.submitPlanning()
  alert('Planning validé et rendu disponible !')
}

// FullCalendar events
const calendarEvents = computed(() =>
  allEntries.value.map(e => ({
    id: e.id,
    title: e.activity,
    start: e.startTime,
    end: e.endTime,
    extendedProps: { children: e.children },
  }))
)

// on mount
onMounted(async () => {
  await planning.fetchSemesters()
  await planning.fetchStaffList()
  if (auth.user?.role === 'STAFF') {
    selectedStaffId.value = auth.user.id
  }
})
</script>

<style scoped>
.planning-upload { max-width: 800px; margin: auto; }
.form-group    { margin-bottom: 1rem; }
.form-actions  { margin: 1rem 0; }
.error         { color: red; }
</style>
