<!-- src/views/planning/PlanningUploadView.vue -->
<template>
  <div class="planning-upload">
    <h1>Import Planning Semestriel</h1>

    <!-- Sélecteur de semestre -->
    <div class="form-group">
      <label for="semester">Semestre</label>
      <select
        id="semester"
        v-model="selectedSemesterId"
      >
        <option disabled value="">— Choisir un semestre —</option>
        <option
          v-for="s in semesters"
          :key="s.id"
          :value="s.id"
        >
          {{ s.name }} ({{ s.startDate }} → {{ s.endDate }})
        </option>
      </select>
    </div>

    <!-- Sélecteur de membre du staff -->
    <div class="form-group">
      <label for="staff">Éducateur</label>
      <select
        id="staff"
        v-model="selectedStaffId"
      >
        <option disabled value="">— Choisir un éducateur —</option>
        <option
          v-for="st in staffList"
          :key="st.id"
          :value="st.userId"
        >
          {{ st.firstName }} {{ st.lastName }}
        </option>
      </select>
    </div>

    <!-- Upload Excel -->
    <div class="form-group">
      <input
        type="file"
        @change="onFileChange"
        accept=".xlsx,.xls"
      />
    </div>

    <!-- Boutons -->
    <div class="form-actions">
      <button
        @click="preview"
        :disabled="!canUpload"
      >
        Prévisualiser
      </button>
      <button
        @click="generate"
        :disabled="!canUpload"
      >
        Générer
      </button>
    </div>

    <!-- Erreur -->
    <p v-if="error" class="error">{{ error }}</p>

    <!-- FullCalendar pour la preview -->
    <FullCalendar
      v-if="previewEntries.length"
      :plugins="[timeGridPlugin, dayGridPlugin]"
      :events="fullCalendarEvents"
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
const auth = useAuthStore()

// local state
const file = ref<File | null>(null)
const selectedSemesterId = ref<string>('')
const selectedStaffId = ref<string>('')

// computed from store
const semesters = computed(() => planning.semesters)
const staffList = computed(() => planning.staffList)
const previewEntries = computed(() => planning.previewEntries)
const error = computed(() => planning.error)
const loading = computed(() => planning.loading)

// canUpload: a semester, a staff and a file must be chosen, and we're not loading
const canUpload = computed(() =>
  !!file.value &&
  selectedSemesterId.value !== '' &&
  selectedStaffId.value !== '' &&
  !loading.value
)

// on mount, load semesters AND staff list
onMounted(async () => {
  await planning.fetchSemesters()
  await planning.fetchStaffList()

  // if the logged-in user is STAFF, pre-select them
  if (auth.user?.role === 'STAFF') {
    selectedStaffId.value = auth.user.id
  }
})

// file input handler
function onFileChange(e: Event) {
  file.value = (e.target as HTMLInputElement).files?.[0] ?? null
}

// preview
async function preview() {
  if (!canUpload.value) return
  planning.selectSemester(selectedSemesterId.value)
  await planning.previewUpload(
    file.value as File,
    selectedStaffId.value
  )
}

// generate/persist with console.log of stored entries
async function generate() {
  if (!canUpload.value) return

  // ensure selectedSemester is set
  planning.selectSemester(selectedSemesterId.value)

  // persist planning
  await planning.generateSchedule(
    file.value as File,
    selectedStaffId.value
  )

  // reload from database and log result
  await planning.fetchMySchedule(selectedStaffId.value)
  console.log('Planning stocké en base :', planning.scheduleEntries)

  alert('Planning généré avec succès !')
}

// transform entries into FullCalendar events
const fullCalendarEvents = computed(() =>
  previewEntries.value.map(e => ({
    id: e.id,
    title: e.activity,
    start: e.startTime,
    end: e.endTime,
    extendedProps: { children: e.children },
  }))
)
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
  margin-bottom: 1rem;
}

.error {
  color: red;
  margin-top: 0.5rem;
}
</style>
