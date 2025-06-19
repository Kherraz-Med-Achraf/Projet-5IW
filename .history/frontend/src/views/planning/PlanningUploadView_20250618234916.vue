<!-- src/views/planning/PlanningUploadView.vue -->
<template>
  <div class="planning-upload">
    <h1>Gestion Planning Semestriel</h1>

    <!-- 1) Choix du semestre -->
    <div class="form-group">
      <label for="semester">Semestre</label>
      <select
        id="semester"
        v-model="selectedSemesterId"
        @change="onSemesterChange"
      >
        <option disabled value="">— Choisir un semestre —</option>
        <option v-for="s in semesters" :key="s.id" :value="s.id">
          {{ s.name }}
        </option>
      </select>
    </div>

    <!-- 2) Import du fichier Excel -->
    <div class="form-group">
      <input type="file" @change="onFileChange" accept=".xlsx,.xls" />
    </div>

    <!-- 3) Boutons d'action -->
    <div class="form-actions">
      <button @click="previewAll" :disabled="!canPreview">1. Prévisualiser</button>
      <button @click="importAll"   :disabled="!canImport">2. Importer définitivement</button>
      <button @click="submitAll"   :disabled="!canSubmit">3. Valider planning</button>
    </div>

    <!-- 4) Affiche l'erreur s'il y en a -->
    <p v-if="error" class="error">{{ error }}</p>

    <!-- 5) Choix de l'éducateur après preview -->
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

    <!-- 6) Bloc debug pour voir en clair les events -->
    <pre v-if="debug" class="debug">
{{ JSON.stringify({ selectedStaffId, events: calendarOptions.events }, null, 2) }}
    </pre>

    <!-- 7) Le calendrier FullCalendar -->
    <FullCalendar
      ref="fcRef"
      v-if="calendarOptions.events.length"
      :options="calendarOptions"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import FullCalendar   from '@fullcalendar/vue3'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin  from '@fullcalendar/daygrid'
import listPlugin     from '@fullcalendar/list'
import frLocale       from '@fullcalendar/core/locales/fr'
import { usePlanningStore } from '@/stores/planning'

/** 0) Store & états locaux **/
const planning           = usePlanningStore()
const file               = ref<File|null>(null)
const selectedSemesterId = ref<string>('')
const selectedStaffId    = ref<string>('')
const debug              = ref(true)

/** 1) Données du store **/
const semesters      = computed(() => planning.semesters)
const staffList      = computed(() => planning.staffList)
const previewEntries = computed(() => planning.previewEntries)
const error          = computed(() => planning.error)
const loading        = computed(() => planning.loading)

/** 2) Contrôles des boutons **/
const canPreview = computed(() =>
  !!file.value && selectedSemesterId.value !== '' && !loading.value
)
const canImport = computed(() => canPreview.value)
const canSubmit = computed(() =>
  previewEntries.value.length > 0 && !loading.value
)

/** 3) Extraction des events **/
const calendarEvents = computed(() =>
  previewEntries.value
    .filter(e => e.staffId === selectedStaffId.value)
    .map(e => ({
      id: e.id,
      title: e.activity,
      start: e.startTime,
      end: e.endTime,
      allDay: e.activity.toLowerCase().includes('vacances'),
      color: e.activity.toLowerCase().includes('vacances') ? '#FFB74D' : undefined,
      extendedProps: { children: e.children },
    }))
)

/** 4) Options FullCalendar **/
const calendarOptions = ref({
  plugins: [ timeGridPlugin, dayGridPlugin, listPlugin ],
  locales: [frLocale],
  locale : 'fr',
  initialView: 'listYear',          // affiche tout le semestre en liste
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'listYear,timeGridWeek,dayGridMonth'
  },
  slotMinTime: '08:00:00',
  slotMaxTime: '17:00:00',
  scrollTime : '08:00:00',
  initialDate: undefined as string|undefined,
  events: [] as any[],
})

/** 5) Réf vers le composant pour piloter l'API **/
const fcRef = ref<InstanceType<typeof FullCalendar> | null>(null)

/** 6) Quand on change de semestre, on centre la vue **/
watch(selectedSemesterId, id => {
  const sem = planning.semesters.find(s => s.id === id)
  if (!sem) return

  calendarOptions.value.initialDate = sem.startDate
  if (fcRef.value) {
    const api = fcRef.value.getApi()
    api.gotoDate(sem.startDate)
  }

  calendarOptions.value.events = []
})

/** 7) Dès qu'on sélectionne un staff, on injecte ses events **/
watch(
  [ calendarEvents, selectedStaffId ],
  () => {
    calendarOptions.value.events = selectedStaffId.value
      ? calendarEvents.value
      : []
  },
  { immediate: true }
)

/** 8) Réinitialiser au changement de semestre **/
function onSemesterChange() {
  file.value = null
  selectedStaffId.value = ''
  planning.previewEntries = []
  calendarOptions.value.events = []
}

/** 9) Gestion du fichier Excel **/
function onFileChange(e: Event) {
  file.value = (e.target as HTMLInputElement).files?.[0] ?? null
}

/** 10) Appels au store **/
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

/** 11) Au montage, on charge semestres & éducateurs **/
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
