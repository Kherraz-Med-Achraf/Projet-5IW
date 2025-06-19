<template>
    <div>
      <h1>Import Planning Semestriel</h1>
  
      <!-- Sélecteur de semestre -->
      <label for="semester">Semestre</label>
      <select id="semester" v-model="selectedSemesterId">
        <option v-for="s in semesters" :key="s.id" :value="s.id">
          {{ s.name }} ({{ s.startDate }} → {{ s.endDate }})
        </option>
      </select>
  
      <!-- Upload Excel -->
      <input type="file" @change="onFileChange" accept=".xlsx,.xls" />
  
      <!-- Boutons -->
      <button @click="preview" :disabled="!file">Prévisualiser</button>
      <button @click="generate" :disabled="!file">Générer</button>
  
      <!-- Erreur -->
      <p v-if="error" class="error">{{ error }}</p>
  
      <!-- FullCalendar pour la preview -->
      <FullCalendar
        v-if="previewEntries.length"
        :events="fullCalendarEvents(previewEntries)"
        initialView="timeGridWeek"
        :headerToolbar="{
          left: 'prev,next today',
          center: 'title',
          right: 'timeGridWeek,dayGridMonth'
        }"
      />
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import FullCalendar from '@fullcalendar/vue3'
  import timeGridPlugin from '@fullcalendar/timegrid'
  import dayGridPlugin from '@fullcalendar/daygrid'
  import { usePlanningStore } from '@/stores/planning'
  
  const planning = usePlanningStore()
  
  // local state
  const file = ref<File|null>(null)
  const selectedSemesterId = ref<string|null>(null)
  const error = ref<string|null>(null)
  
  // charger les semestres
  onMounted(() => planning.fetchSemesters())
  
  // upload handlers
  function onFileChange(e: Event) {
    file.value = (e.target as HTMLInputElement).files?.[0] || null
  }
  
  // preview
  async function preview() {
    if (!file.value || !selectedSemesterId.value) return
    error.value = null
    try {
      await planning.selectSemester(selectedSemesterId.value)
      await planning.previewUpload(file.value, /* staffId à renseigner */)
    } catch (err: any) {
      error.value = err.message
    }
  }
  
  // generate
  async function generate() {
    if (!file.value || !selectedSemesterId.value) return
    error.value = null
    try {
      await planning.generateSchedule(file.value, /* staffId */)
      alert('Planning généré avec succès !')
    } catch (err: any) {
      error.value = err.message
    }
  }
  
  // transformer les ScheduleEntry en events FullCalendar
  function fullCalendarEvents(entries) {
    return entries.map(e => ({
      id: e.id,
      title: e.activity,
      start: e.startTime,
      end: e.endTime,
      // tu peux ajouter children dans extendedProps
      extendedProps: { children: e.children },
    }))
  }
  </script>
  