<template>
  <div class="staff-schedule">
    <h1>Mon planning</h1>

    <div class="form-group">
      <label for="semester">Semestre</label>
      <select id="semester" v-model="selectedSemesterId" @change="loadSchedule">
        <option disabled value="">— Choisir un semestre —</option>
        <option v-for="s in semesters" :key="s.id" :value="s.id">{{ s.name }}</option>
      </select>
    </div>

    <FullCalendar v-if="events.length" :options="fcOptions" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed, onUnmounted } from 'vue'
import FullCalendar   from '@fullcalendar/vue3'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin  from '@fullcalendar/daygrid'
import listPlugin     from '@fullcalendar/list'
import frLocale       from '@fullcalendar/core/locales/fr'
import { usePlanningStore } from '@/stores/planning'
import { useAuthStore } from '@/stores/auth'

const planning = usePlanningStore()
const auth     = useAuthStore()

const selectedSemesterId = ref<string>('')
const semesters = computed(() => planning.semesters)

interface Entry {
  id: string; title: string; start: string; end: string; allDay?: boolean;
}
const events = ref<Entry[]>([])

const fcOptions: any = {
  plugins : [timeGridPlugin, dayGridPlugin, listPlugin],
  locales : [frLocale],
  locale  : 'fr',
  timeZone: 'Europe/Paris',
  initialView: 'timeGridWeek',
  slotMinTime: '08:00:00',
  slotMaxTime: '17:00:00',
  events : events.value,
  eventClick(info: any) {
    const kids = info.event.extendedProps.children || []
    if (kids.length) {
      const list = kids.map((c: any) => `${c.firstName} ${c.lastName}`).join('\n')
      alert(`Enfants concernés :\n${list}`)
    }
  },
}

async function loadSemesters() {
  if (!semesters.value.length) await planning.fetchSemesters()
}

async function loadSchedule() {
  events.value = []
  if (!selectedSemesterId.value) return
  const API = import.meta.env.VITE_NEST_API_URL ?? ''
  const res = await fetch(`${API}/planning/semesters/${selectedSemesterId.value}/staff/${auth.user!.id}`,{
    headers: { Authorization: `Bearer ${auth.token}` }
  })
  if (!res.ok) return
  const data = await res.json()
  events.value = data.map((e:any)=>({
    id: e.id,
    title: e.activity,
    start: e.startTime,
    end:   e.endTime,
    allDay: e.activity.toLowerCase().includes('vacances'),
    color: e.activity.startsWith('Annulé –') ? '#B0BEC5' : undefined,
    extendedProps: { children: e.children, cancelled: e.activity.startsWith('Annulé –') },
  }))
  ;(fcOptions as any).events = events.value
}

onMounted(async ()=>{
  await loadSemesters()
})

window.addEventListener('planning-updated', ()=>{
  if(selectedSemesterId.value) loadSchedule()
})

onUnmounted(()=>{
  window.removeEventListener('planning-updated', ()=>{})
})
</script>

<style scoped>
.staff-schedule { max-width: 800px; margin: auto; }
.form-group { margin-bottom: 1rem; }
</style> 