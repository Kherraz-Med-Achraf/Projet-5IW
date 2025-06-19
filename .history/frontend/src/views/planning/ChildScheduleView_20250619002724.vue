<template>
  <div class="child-schedule">
    <h1>Planning de l'enfant</h1>

    <div class="form-group">
      <label for="semester">Semestre</label>
      <select id="semester" v-model="selectedSemesterId" @change="loadSchedule">
        <option disabled value="">— Choisir un semestre —</option>
        <option v-for="s in semesters" :key="s.id" :value="s.id">{{ s.name }}</option>
      </select>
    </div>

    <div class="form-group">
      <label for="child">Enfant</label>
      <select id="child" v-model="childId" @change="loadSchedule">
        <option disabled value="">— Choisir un enfant —</option>
        <option v-for="c in children" :key="c.id" :value="c.id">{{ c.firstName }} {{ c.lastName }}</option>
      </select>
    </div>

    <FullCalendar v-if="events.length" :options="fcOptions" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
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

const children = ref<any[]>([])
const childId  = ref<string>('')

interface Entry { id:string; title:string; start:string; end:string; allDay?:boolean }
const events = ref<Entry[]>([])

const fcOptions = {
  plugins : [timeGridPlugin, dayGridPlugin, listPlugin],
  locales : [frLocale],
  locale  : 'fr',
  timeZone: 'Europe/Paris',
  initialView: 'timeGridWeek',
  slotMinTime: '08:00:00',
  slotMaxTime: '17:00:00',
  events : events.value,
}

async function loadSemesters() {
  if (!semesters.value.length) await planning.fetchSemesters()
}

async function loadChildren() {
  const API = import.meta.env.VITE_NEST_API_URL ?? ''
  const res = await fetch(`${API}/children`, {
    headers: { Authorization: `Bearer ${auth.token}`