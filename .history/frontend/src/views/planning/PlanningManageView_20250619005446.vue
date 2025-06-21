<template>
  <div class="manage-schedule">
    <h1>Gestion des cours (annulation / réaffectation)</h1>

    <div class="form-group">
      <label for="semester">Semestre</label>
      <select id="semester" v-model="selectedSemesterId" @change="loadOverview">
        <option disabled value="">— Choisir un semestre —</option>
        <option v-for="s in semesters" :key="s.id" :value="s.id">{{ s.name }}</option>
      </select>
    </div>

    <FullCalendar v-if="events.length" :options="fcOptions" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
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
      planning.cancelEntry(info.event.id, !cancelled).then(()=>loadOverview())
    }else if(action==='R'){
      reassignSource.value = info.event
      alert('Sélectionnez maintenant le cours cible (click)')
    }
  }
}

const reassignSource = ref<any|null>(null)
const currentSelection = ref<any|null>(null)

async function loadOverview(){
  events.value = []
  if(!selectedSemesterId.value) return
  planning.selectSemester(selectedSemesterId.value)
  await planning.fetchOverview()
  events.value = planning.previewEntries.map(e=>({
    id:e.id,
    title:e.activity,
    start:e.startTime,
    end:e.endTime,
    extendedProps:{ children:e.children }
  }))
  fcOptions.events = events.value
}

onMounted(async()=>{
  if(!semesters.value.length) await planning.fetchSemesters()
})

// handler second click for reassignment
document.addEventListener('click', (evt:any)=>{
  if(!reassignSource.value) return
  // FullCalendar events clicks are already handled, currentSelection stores last event.
  if(currentSelection.value && currentSelection.value.id!==reassignSource.value.id){
    planning.reassignChildren(reassignSource.value.id, currentSelection.value.id).then(()=>{
      reassignSource.value=null
      loadOverview()
      alert('Enfants réaffectés !')
    })
  }
})
</script>

<style scoped>
.manage-schedule{max-width:900px;margin:auto}
.form-group{margin-bottom:1rem}
</style> 