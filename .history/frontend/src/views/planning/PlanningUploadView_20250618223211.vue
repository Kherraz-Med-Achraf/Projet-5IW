<template>
  <!-- … -->
  <FullCalendar
    ref="fcRef"
    v-if="calendarOptions.events.length"
    :options="calendarOptions"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import FullCalendar from '@fullcalendar/vue3'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin  from '@fullcalendar/daygrid'
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
      extendedProps: { children: e.children },
    }))
)

/** 4) Options FullCalendar **/
const calendarOptions = ref({
  plugins: [ timeGridPlugin, dayGridPlugin ],
  initialView: 'timeGridWeek',
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'timeGridWeek,dayGridMonth',
  },
  initialDate: undefined as string|undefined,
  events: [] as any[],
})

/** 5) Réf vers le composant pour accéder à l’API **/
const fcRef = ref<InstanceType<typeof FullCalendar> | null>(null)

/** 6) Quand on change de semestre, positionne la vue **exactement** sur son début **/
watch(selectedSemesterId, id => {
  const sem = planning.semesters.find(s => s.id === id)
  if (!sem) return

  // 1) mets à jour initialDate (pour la première ouverture)
  calendarOptions.value.initialDate = sem.startDate

  // 2) et force le gotoDate si FullCalendar est déjà monté
  if (fcRef.value) {
    const api = fcRef.value.getApi()
    api.gotoDate(sem.startDate)
  }

  // vide les events en attendant la preview
  calendarOptions.value.events = []
})

/** 7) Dès qu’on a un staff, on injecte les events calculés **/
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
