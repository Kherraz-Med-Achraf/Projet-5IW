<template>
  <main class="profile-container">
    <!-- Skip links pour l'accessibilité -->
    <div class="skip-links">
      <a href="#main-content" class="skip-link">Aller au contenu principal</a>
      <a href="#calendar-view" class="skip-link">Aller au planning</a>
    </div>

    <div class="profile-content" id="main-content">
      <div class="content-grid">
        
        <!-- En-tête principal -->
        <PageHeader
          title="Planning de mon enfant"
          subtitle="Consultez l'emploi du temps de votre enfant"
          icon="child_care"
        />

        <!-- Filtres et sélection -->
        <section class="profile-section" aria-labelledby="filters-title">
          <div class="section-header">
            <h2 id="filters-title">
              <i class="material-icons">tune</i>
              Sélection
            </h2>
          </div>

          <div class="filters-grid">
            <div class="filter-group">
              <label for="semester" class="filter-label">
                <i class="material-icons">school</i>
                Semestre
              </label>
              <select 
                id="semester" 
                v-model="selectedSemesterId" 
                @change="loadSchedule"
                class="filter-select"
                :disabled="!semesters.length"
              >
                <option disabled value="">— Choisir un semestre —</option>
                <option v-for="s in semesters" :key="s.id" :value="s.id">
                  {{ s.name }}
                </option>
              </select>
            </div>

            <div class="filter-group">
              <label for="child" class="filter-label">
                <i class="material-icons">face</i>
                Enfant
              </label>
              <select 
                id="child" 
                v-model="childId" 
                @change="loadSchedule"
                class="filter-select"
                :disabled="!children.length"
              >
                <option disabled value="">— Choisir un enfant —</option>
                <option v-for="c in children" :key="c.id" :value="c.id">
                  {{ c.firstName }} {{ c.lastName }}
                </option>
              </select>
            </div>
          </div>

          <!-- Informations enfant sélectionné -->
          <div v-if="selectedChild" class="child-info">
            <div class="child-avatar">
              <i class="material-icons">account_circle</i>
            </div>
            <div class="child-details">
              <h3>{{ selectedChild.firstName }} {{ selectedChild.lastName }}</h3>
              <p class="child-meta">Planning sélectionné : {{ selectedSemesterName }}</p>
            </div>
          </div>
        </section>

        <!-- Calendrier -->
        <section v-if="calendarEvents.length" class="profile-section calendar-section" id="calendar-view" aria-labelledby="calendar-title">
          <div class="section-header">
            <h2 id="calendar-title">
              <i class="material-icons">calendar_view_week</i>
              Planning {{ selectedChild?.firstName }} {{ selectedChild?.lastName }}
            </h2>
          </div>

          <div class="calendar-legend">
            <div class="legend-item">
              <div class="legend-color normal"></div>
              <span>Activité normale</span>
            </div>
            <div class="legend-item">
              <div class="legend-color cancelled"></div>
              <span>Activité annulée</span>
            </div>
            <div class="legend-item">
              <div class="legend-color vacation"></div>
              <span>Vacances/Férié</span>
            </div>
          </div>

          <div class="calendar-wrapper">
            <FullCalendar :options="calendarOptions" />
          </div>
        </section>

        <!-- Message si pas de sélection -->
        <section v-else class="profile-section">
          <div class="empty-state">
            <div class="empty-icon">
              <i class="material-icons">event_note</i>
            </div>
            <h3>Aucun planning disponible</h3>
            <p>Veuillez sélectionner un semestre et un enfant pour voir le planning.</p>
          </div>
        </section>
      </div>
    </div>

    <!-- Modale détails activité -->
    <CourseDetailsModal
      v-if="showModal && selectedCourse"
      :course="selectedCourse"
      :staff-name="selectedStaffName"
      :can-manage-course="false"
      @close="closeModal"
    />
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import FullCalendar from '@fullcalendar/vue3'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin from '@fullcalendar/daygrid'
import frLocale from '@fullcalendar/core/locales/fr'

import { usePlanningStore } from '@/stores/planning'
import { useAuthStore } from '@/stores/auth'
import CourseDetailsModal from '../../components/planning/CourseDetailsModal.vue'
import PageHeader from '@/components/PageHeader.vue'

const planning = usePlanningStore()
const auth = useAuthStore()

const selectedSemesterId = ref<string>('')
const childId = ref<string>('')
const showModal = ref(false)
const selectedCourse = ref<any>(null)
const selectedStaffName = ref<string>('')

const semesters = computed(() => planning.semesters)
const children = ref<any[]>([])
const selectedChild = computed(() => children.value.find(c => c.id === childId.value))
const selectedSemesterName = computed(() => {
  const semester = semesters.value.find(s => s.id === selectedSemesterId.value)
  return semester?.name || ''
})

// Données brutes des activités
const scheduleEntries = ref<any[]>([])

// Utilitaires
function isVacationOrHoliday(activity: string): boolean {
  const act = activity.toLowerCase()
  return act.includes('vacances') || act.includes('férié')
}

function getEventColor(activity: string): string {
  if (activity.startsWith('Annulé –')) return '#B0BEC5'
  if (isVacationOrHoliday(activity)) return '#FFB74D'
  return '#4338ca'
}

// Événements du calendrier avec logique de déduplication
const calendarEvents = computed(() => {
  const raw = scheduleEntries.value.map(e => {
    const isVacation = isVacationOrHoliday(e.activity)
    
    return {
      id: e.id,
      title: e.activity,
      start: e.startTime,
      end: e.endTime,
      color: getEventColor(e.activity),
      extendedProps: { 
        children: e.children, 
        cancelled: e.activity.startsWith('Annulé –'),
        vacation: isVacation,
        originalStart: e.startTime,
        originalEnd: e.endTime,
        staffId: e.staffId
      }
    }
  })

  // Déduplication des activités identiques (même horaire + même titre)
  const duplicateGroups: Record<string, any[]> = {}
  raw.forEach(ev => {
    // Créer une clé unique basée sur l'horaire + titre
    const key = `${ev.start}-${ev.end}-${ev.title}`
    ;(duplicateGroups[key] = duplicateGroups[key] || []).push(ev)
  })
  
  // Garder seulement le premier événement de chaque groupe
  const uniqueEvents: any[] = []
  Object.values(duplicateGroups).forEach(group => {
    group.sort((a, b) => a.start.localeCompare(b.start))
    uniqueEvents.push(group[0]) // Garder seulement le premier
  })

  // Grouper par jour pour l'affichage vue mensuelle (labels uniques)
  const byDate: Record<string, any[]> = {}
  uniqueEvents.forEach(ev => {
    const key = ev.start.substring(0, 10)
    ;(byDate[key] = byDate[key] || []).push(ev)
  })
  
  Object.values(byDate).forEach(list => {
    list.sort((a, b) => a.start.localeCompare(b.start))
    list.forEach((ev, idx) => {
      ev.extendedProps.showLabel = idx === 0
    })
  })

  return uniqueEvents
})

// Configuration FullCalendar
const calendarOptions = computed(() => ({
  plugins: [timeGridPlugin, dayGridPlugin],
  locales: [frLocale],
  locale: 'fr',
  timeZone: 'Europe/Paris',
  initialView: 'timeGridWeek',
  initialDate: (() => {
    const semester = semesters.value.find(s => s.id === selectedSemesterId.value)
    return semester?.startDate || new Date()
  })(),
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'timeGridWeek,dayGridMonth'
  },
  slotMinTime: '08:00:00',
  slotMaxTime: '17:00:00',
  height: 'auto',
  allDaySlot: false,
  allDayText: '',
  events: calendarEvents.value,
  eventContent(info: any) {
    if (info.view.type === 'dayGridMonth') {
      // Dans la vue mois, n'afficher qu'une seule fois par jour
      if (!info.event.extendedProps.showLabel) {
        return { domNodes: [] }
      }
      
      const act = (info.event.title ?? '').toLowerCase()
      let label = 'Activité'
      let bgColor = '#4338ca'
      let textColor = 'white'
      
      if (act.includes('férié')) {
        label = 'Jour férié'
        bgColor = '#FFB74D'
        textColor = 'black'
      } else if (act.includes('vacances')) {
        label = 'Vacances scolaires'
        bgColor = '#FFB74D'
        textColor = 'black'
      } else if (act.startsWith('annulé –')) {
        label = 'Activité annulée'
        bgColor = '#B0BEC5'
        textColor = 'black'
      }
      
      return { 
        html: `<div class="fc-event-month" style="background-color: ${bgColor}; color: ${textColor}; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">${label}</div>` 
      }
    }
    
    // Autres vues : affichage normal sans icônes
    return { html: `<div class="fc-event-content">${info.event.title}</div>` }
  },
  eventClick(info: any) {
    const kids = info.event.extendedProps?.children || []
    const originalEntry = scheduleEntries.value.find(e => e.id === info.event.id)
    
    selectedCourse.value = {
      id: info.event.id,
      title: info.event.title,
      start: originalEntry ? new Date(originalEntry.startTime) : new Date(info.event.start),
      end: originalEntry ? new Date(originalEntry.endTime) : new Date(info.event.end),
      children: kids,
      cancelled: info.event.extendedProps.cancelled,
      vacation: info.event.extendedProps.vacation,
      staffId: info.event.extendedProps.staffId
    }
    
    // Trouver le nom de l'éducateur
    selectedStaffName.value = getStaffName(info.event.extendedProps.staffId)
    
    showModal.value = true
  }
}))

// Fonctions
async function loadSemesters() {
  if (!semesters.value.length) {
    await planning.fetchSemesters()
  }
}

async function loadChildren() {
  try {
    const API = import.meta.env.VITE_NEST_API_URL ?? ''
    const res = await fetch(`${API}/children`, {
      headers: { Authorization: `Bearer ${auth.token}` }
    })
    if (res.ok) {
      children.value = await res.json()
    }
  } catch (error) {
    console.error('Erreur lors du chargement des enfants:', error)
  }
}

async function loadSchedule() {
  scheduleEntries.value = []
  if (!selectedSemesterId.value || !childId.value) return
  
  const API = import.meta.env.VITE_NEST_API_URL ?? ''
  const res = await fetch(`${API}/planning/semesters/${selectedSemesterId.value}/child/${childId.value}`, {
    headers: { Authorization: `Bearer ${auth.token}` }
  })
  
  if (!res.ok) return
  
  const data = await res.json()
  scheduleEntries.value = data
}

function getStaffName(staffId: string): string {
  // Pour les parents, on peut retourner une valeur générique
  // Le nom exact de l'éducateur n'est pas critique pour les parents
  return 'Éducateur'
}

function closeModal() {
  showModal.value = false
  selectedCourse.value = null
  selectedStaffName.value = ''
}

onMounted(async () => {
  await loadSemesters()
  await loadChildren()
})
</script>

<style scoped lang="scss">
/* Container principal */
.profile-container {
  min-height: 100vh;
  background-color: #f8fafc;
  padding: 2rem 0;
}

.profile-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

.content-grid {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* En-tête simple style journal */
.section-header {
  padding: 2rem 2rem 1rem 2rem;
  margin-bottom: 1rem;

  h1 {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin: 0 0 1rem 0;
    font-size: 1.875rem;
    font-weight: 600;
    color: #1f2937;
    font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

    .material-icons {
      color: #4338ca;
      font-size: 2rem;
    }
  }
}

.info-note {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: #f8fafc;
  border-radius: 0.5rem;
  color: #6b7280;
  font-size: 0.875rem;

  .material-icons {
    color: #4338ca;
    font-size: 1rem;
  }
}

/* Sections */
.profile-section {
  background: white;
  border-radius: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.section-header {
  padding: 2rem 2rem 1rem 2rem;
  margin-bottom: 1rem;
  background: #4444ac;
  border-radius: 1rem 1rem 0 0;

  h2 {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin: 0;
    color: white;
    font-size: 1.5rem;
    font-weight: 600;
    font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

    i {
      color: white;
      font-size: 1.75rem;
    }
  }
}

/* Filtres */
.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  padding: 0 2rem 2rem 2rem;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: #374151;
  font-size: 0.9rem;

  i {
    color: #4338ca;
    font-size: 1.2rem;
  }
}

.filter-select {
  padding: 0.875rem 1rem;
  border-radius: 0.5rem;
  font-size: 1rem;
  background: white;
  color: #1e293b;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #4338ca;
    box-shadow: 0 0 0 3px rgba(67, 56, 202, 0.1);
  }

  &:disabled {
    background: #f8fafc;
    color: #9ca3af;
    cursor: not-allowed;
  }
}

/* Informations enfant */
.child-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 1rem 2rem 0 2rem;
  padding: 1rem;
  background: #dbeafe;
  border-radius: 0.75rem;
  border: 1px solid #3b82f6;
}

.child-avatar {
  width: 2.5rem;
  height: 2.5rem;
  background: #4338ca;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;

  i {
    color: white;
    font-size: 1.25rem;
  }
}

.child-details h3 {
  margin: 0 0 0.125rem 0;
  color: #1e293b;
  font-weight: 600;
  font-size: 1rem;
}

.child-meta {
  margin: 0;
  color: #6b7280;
  font-size: 0.8rem;
}

/* Calendrier */
.calendar-section {
  padding: 0;
  overflow: hidden;

  .section-header {
    padding: 2rem 2rem 1rem 2rem;
    margin-bottom: 0;
    border-bottom: none;
    background: #4444ac;
    border-radius: 1rem 1rem 0 0;
    
    h2 {
      color: white;
      
      i {
        color: white;
      }
    }
  }
}

.calendar-legend {
  display: flex;
  gap: 1.5rem;
  align-items: center;
  flex-wrap: wrap;
  padding: 1rem 2rem;
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.legend-color {
  width: 1rem;
  height: 1rem;
  border-radius: 0.25rem;

  &.normal {
    background: #4338ca;
  }

  &.cancelled {
    background: #B0BEC5;
  }

  &.vacation {
    background: #FFB74D;
  }
}

.calendar-wrapper {
  padding: 1.5rem 2rem 2rem 2rem;

  :deep(.fc) {
    font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  :deep(.fc-button) {
    background: #4338ca;
    border: none;
    border-radius: 0.375rem;
    font-weight: 500;
    padding: 0.5rem 1rem;

    &:hover:not(:disabled) {
      background: #3730a3;
    }

    &:focus {
      box-shadow: 0 0 0 2px rgba(67, 56, 202, 0.2);
    }
  }

  :deep(.fc-event) {
    border: none;
    border-radius: 0.25rem;
    font-weight: 500;
    cursor: pointer;

    &:hover {
      filter: brightness(1.1);
    }
  }

  // Axe des heures - Style propre
  :deep(.fc-timegrid-axis) {
    width: 60px;
    border-right: 1px solid #e5e7eb;
  }

  :deep(.fc-timegrid-slot-label) {
    color: #6b7280;
    font-weight: 500;
    font-size: 0.875rem;
    text-align: center;
    vertical-align: middle;
    padding: 4px 8px;
  }

  :deep(.fc-timegrid-slot-label-cushion) {
    display: inline-block;
  }

  // Style des événements - Plus doux
  :deep(.fc-timegrid-event) {
    border-radius: 6px !important;
    margin: 1px !important;
  }

  :deep(.fc-timegrid-event .fc-event-main) {
    padding: 4px 8px !important;
    display: flex !important;
    flex-direction: column !important;
    justify-content: center !important;
    min-height: 20px !important;
  }

  :deep(.fc-timegrid-event .fc-event-time) {
    display: none !important;
  }

  :deep(.fc-timegrid-event .fc-event-title) {
    font-size: 0.875rem !important;
    font-weight: 500 !important;
    text-align: center !important;
    line-height: 1.2 !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }
}

/* Empty state */
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: #6b7280;

  .empty-icon {
    width: 4rem;
    height: 4rem;
    background: #f3f4f6;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 1.5rem;

    i {
      font-size: 2rem;
      color: #9ca3af;
    }
  }

  h3 {
    margin: 0 0 0.5rem 0;
    color: #374151;
    font-size: 1.25rem;
    font-weight: 600;
  }

  p {
    margin: 0;
    font-size: 1rem;
    line-height: 1.6;
  }
}

/* Skip links */
.skip-links {
  position: absolute;
  top: -100px;
  left: 0;
  z-index: 1000;
}

.skip-link {
  position: absolute;
  top: -100px;
  left: 10px;
  padding: 0.75rem 1rem;
  background: #4338ca;
  color: white;
  text-decoration: none;
  border-radius: 0.5rem;
  font-weight: 600;
  transition: top 0.2s ease;

  &:focus {
    top: 10px;
    outline: 3px solid #fbbf24;
    outline-offset: 2px;
  }
}

/* Responsive */
@media (max-width: 768px) {
  .profile-content {
    padding: 0 0.5rem;
  }

  .page-header {
    padding: 2rem 1rem;

    .title-info h1 {
      font-size: 2rem;
    }

    .header-content {
      flex-direction: column;
      text-align: center;
    }
  }

  .filters-grid {
    grid-template-columns: 1fr;
    padding: 0 1rem 2rem 1rem;
  }

  .calendar-wrapper {
    padding: 0 1rem 2rem 1rem;
  }

  .calendar-legend {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
}

@media (max-width: 480px) {
  .title-section {
    flex-direction: column;
    text-align: center;
    gap: 1rem;
  }

  .header-icon {
    width: 3rem;
    height: 3rem;

    i {
      font-size: 1.5rem;
    }
  }
}
</style> 