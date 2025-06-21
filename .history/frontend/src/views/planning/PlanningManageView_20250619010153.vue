<template>
  <div class="manage-schedule">
    <h1>Gestion des cours (annulation / réaffectation)</h1>

    <div class="form-group">
      <label for="semester">Semestre</label>
      <select id="semester" v-model="selectedSemesterId" @change="loadEvents">
        <option disabled value="">— Choisir un semestre —</option>
        <option v-for="s in semesters" :key="s.id" :value="s.id">{{ s.name }}</option>
      </select>
    </div>

    <div class="form-group">
      <label for="staff">Éducateur</label>
      <select id="staff" v-model="selectedStaffId" @change="loadEvents">
        <option value="">— Tous —</option>
        <option v-for="s in staffList" :key="s.userId" :value="s.userId">
          {{ s.firstName }} {{ s.lastName }}
        </option>
      </select>
    </div>

    <FullCalendar v-if="selectedSemesterId && selectedStaffId && displayEvents.length" :options="fcOptions" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import FullCalendar   from '@fullcalendar/vue3'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin  from '@fullcalendar/daygrid'
import listPlugin     from '@fullcalendar/list'
import frLocale       from '@fullcalendar/core/locales/fr'
import { usePlanningStore } from '@/stores/planning'
import { useAuthStore } from '@/stores/auth'

const planning = usePlanningStore()
const auth     = useAuthStore()

const selectedSemesterId = ref('')
const semesters = computed(()=>planning.semesters)
const staffList = computed(()=>planning.staffList)
const selectedStaffId = ref('')
const events   = ref<any[]>([])

const fcOptions: any = {
  plugins : [timeGridPlugin, dayGridPlugin, listPlugin],
  locales : [frLocale],
  locale  : 'fr',
  timeZone: 'Europe/Paris',
  initialView: 'timeGridWeek',
  slotMinTime: '08:00:00',
  slotMaxTime: '17:00:00',
  events : events.value,
  eventClick(info:any){
    currentSelection.value = info.event
    const kids = info.event.extendedProps.children || []
    const cancelled = info.event.title.startsWith('Annulé – ')
    const txtKids = kids.length ? kids.map((c:any)=>`${c.firstName} ${c.lastName}`).join('\n') : 'Aucun enfant'
    let action = prompt(`${txtKids}\n\nTapez C pour ${cancelled?'réactiver':'annuler'} ce cours,\nR pour réaffecter les enfants vers un autre cours (sélectionnez-le ensuite),\nOu laissez vide pour fermer`) || ''
    action = action.toUpperCase()
    if(action==='C'){
      planning.cancelEntry(info.event.id, !cancelled).then(()=>loadEvents())
    }else if(action==='R'){
      reassignSource.value = info.event
      alert('Sélectionnez maintenant le cours cible (click)')
    }
  }
}

const reassignSource = ref<any|null>(null)
const currentSelection = ref<any|null>(null)

async function loadEvents(){
  events.value = []
  if(!selectedSemesterId.value || !selectedStaffId.value) return
  const API = import.meta.env.VITE_NEST_API_URL ?? ''
  const res = await fetch(`${API}/planning/semesters/${selectedSemesterId.value}/staff/${selectedStaffId.value}`,{
    headers:{ Authorization:`Bearer ${auth.token}` }
  })
  if(!res.ok) return
  const data = await res.json()
  events.value = data.map((e:any)=>({
    id:e.id,
    title:e.activity,
    start:e.startTime,
    end:e.endTime,
    extendedProps:{ children:e.children, staffId:e.staffId }
  }))
  fcOptions.events = events.value
}

onMounted(async()=>{
  if(!semesters.value.length) await planning.fetchSemesters()
  if(!staffList.value.length) await planning.fetchStaffList()
})

const displayEvents = computed(()=>{
  return selectedStaffId.value
    ? events.value.filter(e=>e.extendedProps.staffId===selectedStaffId.value)
    : events.value
})

// handler second click for reassignment
document.addEventListener('click', (evt:any)=>{
  if(!reassignSource.value) return
  // FullCalendar events clicks are already handled, currentSelection stores last event.
  if(currentSelection.value && currentSelection.value.id!==reassignSource.value.id){
    planning.reassignChildren(reassignSource.value.id, currentSelection.value.id).then(()=>{
      reassignSource.value=null
      loadEvents()
      alert('Enfants réaffectés !')
    })
  }
})

function filterEvents(){
  loadEvents()
}

watch(selectedSemesterId, loadEvents)
watch(selectedStaffId, loadEvents)
</script>

<style scoped>
.manage-schedule{max-width:900px;margin:auto}
.form-group{margin-bottom:1rem}
</style> 