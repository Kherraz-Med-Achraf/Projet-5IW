<template>
  <main class="profile-container" role="main">
    <!-- Skip links pour accessibilité -->
    <div class="skip-links">
      <a href="#main-content" class="skip-link">Aller au contenu principal</a>
      <a href="#semester-selection" class="skip-link">Aller à la sélection</a>
      <a href="#calendar-view" class="skip-link">Aller au calendrier</a>
    </div>

    <!-- Content -->
    <div class="profile-content" id="main-content">
      <div class="content-grid">
        
        <!-- En-tête principal -->
        <PageHeader
          title="Mon Planning"
          subtitle="Consultation de vos créneaux et activités"
          icon="schedule"
        />

        <!-- Configuration et sélection -->
        <section class="profile-section" id="semester-selection" aria-labelledby="config-title">
          <div class="section-header">
            <h2 id="config-title">
              <i class="material-icons">tune</i>
              Configuration
            </h2>
          </div>

          <div class="config-grid">
            <!-- Sélection semestre -->
            <div class="config-item">
              <label for="semester-select" class="config-label">
                <i class="material-icons">event</i>
                Semestre
              </label>
              <select 
                id="semester-select" 
                v-model="selectedSemesterId" 
                @change="loadSchedule"
                class="config-input"
              >
                <option disabled value="">— Choisir un semestre —</option>
                <option v-for="s in semesters" :key="s.id" :value="s.id">{{ s.name }}</option>
              </select>
            </div>
          </div>

          <!-- Instructions -->
          <div class="instructions-section">
            <div class="info-note">
              <span class="material-icons">info</span>
              <div>
                <strong>Votre planning éducateur :</strong> Vue semaine pour le détail par jour, vue mois pour l'aperçu général. Cliquez sur un cours pour voir les enfants concernés.
              </div>
            </div>
          </div>
        </section>

        <!-- Calendrier -->
        <section v-if="selectedSemesterId && displayEvents.length" class="profile-section calendar-section" id="calendar-view" aria-labelledby="calendar-title">
          <div class="section-header">
            <h2 id="calendar-title">
              <i class="material-icons">calendar_view_week</i>
              Planning {{ auth.user?.firstName }} {{ auth.user?.lastName }}
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
            <h3>Aucun planning sélectionné</h3>
            <p>Veuillez sélectionner un semestre pour voir votre planning.</p>
          </div>
        </section>
      </div>
    </div>

    <!-- Modale détails cours -->
    <CourseDetailsModal
      v-if="showModal && selectedCourse"
      :course="selectedCourse"
      :staff-name="`${auth.user?.firstName} ${auth.user?.lastName}`"
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
import CourseDetailsModal from '@/components/planning/CourseDetailsModal.vue'
import PageHeader from '@/components/PageHeader.vue'

const planning = usePlanningStore()
const auth = useAuthStore()

const selectedSemesterId = ref<string>('')
const scheduleEntries = ref<any[]>([])
const showModal = ref(false)
const selectedCourse = ref<any>(null)

const semesters = computed(() => planning.semesters)
const selectedSemester = computed(() => 
  semesters.value.find(s => s.id === selectedSemesterId.value)
)

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

const displayEvents = computed(() => calendarEvents.value)

// Configuration FullCalendar
const calendarOptions = computed(() => ({
  plugins: [timeGridPlugin, dayGridPlugin],
  locales: [frLocale],
  locale: 'fr',
  timeZone: 'Europe/Paris',
  initialView: 'timeGridWeek',
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
    
    showModal.value = true
  }
}))

// Fonctions
async function loadSemesters() {
  if (!semesters.value.length) {
    await planning.fetchSemesters()
  }
}

async function loadSchedule() {
  scheduleEntries.value = []
  if (!selectedSemesterId.value) return
  
  const API = import.meta.env.VITE_NEST_API_URL ?? ''
  const res = await fetch(`${API}/planning/semesters/${selectedSemesterId.value}/staff/${auth.user!.id}`, {
    headers: { Authorization: `Bearer ${auth.token}` }
  })
  
  if (!res.ok) return
  
  const data = await res.json()
  scheduleEntries.value = data
}

function closeModal() {
  showModal.value = false
  selectedCourse.value = null
}

onMounted(async () => {
  await loadSemesters()
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



.info-note {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
  color: #6b7280;
  font-size: 0.875rem;
  line-height: 1.5;

  .material-icons {
    color: #4338ca;
    font-size: 1rem;
    margin-top: 0.125rem;
  }
}

/* Sections */
.profile-section {
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
  padding: 2rem 2rem 1rem 2rem;
  background: #4444ac;
  border-radius: 1rem 1rem 0 0;
  border-bottom: none;

  h2 {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: white;

    i {
      color: white;
      font-size: 1.5rem;
    }
  }
}

/* Configuration */
.config-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.config-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.config-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;

  i {
    font-size: 1rem;
    color: #6b7280;
  }
}

.config-input {
  padding: 0.75rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #4338ca;
    box-shadow: 0 0 0 3px rgba(67, 56, 202, 0.1);
  }
}

/* Instructions */
.instructions-section {
  margin-top: 1.5rem;
}



/* Calendrier */
.calendar-section {
  padding: 0;
  overflow: hidden;
}

.calendar-section .section-header {
  padding: 2rem 2rem 1rem 2rem;
  margin-bottom: 0;
  background: #4444ac;
  border-radius: 1rem 1rem 0 0;

  h2 {
    color: white;

    i {
      color: white;
    }
  }
}

.calendar-legend {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
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
  padding: 0 2rem 2rem 2rem;
}

/* Empty state */
.empty-state {
  text-align: center;
  padding: 3rem 2rem;
  color: #6b7280;
}

.empty-icon {
  width: 4rem;
  height: 4rem;
  background: #f3f4f6;
  border-radius: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.5rem auto;

  i {
    font-size: 2rem;
    color: #9ca3af;
  }
}

.empty-state h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #374151;
}

.empty-state p {
  margin: 0;
  font-size: 0.875rem;
}

/* Skip links */
.skip-links {
  position: absolute;
  top: -40px;
  left: 6px;
  z-index: 1000;
}

.skip-link {
  position: absolute;
  top: -40px;
  left: 6px;
  padding: 8px;
  background: #4338ca;
  color: white;
  text-decoration: none;
  border-radius: 4px;
  transition: top 0.3s;

  &:focus {
    top: 6px;
  }
}

/* Responsive */
@media (max-width: 768px) {
  .profile-content {
    padding: 0 0.5rem;
  }

  .page-header {
    padding: 2rem 1rem;
  }

  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .title-section {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .title-info h1 {
    font-size: 2rem;
  }

  .config-grid {
    grid-template-columns: 1fr;
  }

  .calendar-legend {
    justify-content: center;
  }

  .instruction-card {
    flex-direction: column;
    text-align: center;
  }
}

/* FullCalendar customizations */
:deep(.fc-event) {
  border: none !important;
  border-radius: 6px !important;
  font-size: 0.75rem !important;
  font-weight: 500 !important;
  padding: 2px 6px !important;
  margin: 1px 0 !important;
}

:deep(.fc-event-title) {
  font-weight: 500 !important;
}

:deep(.fc-daygrid-event) {
  margin: 2px 1px !important;
}

:deep(.fc-timegrid-event) {
  border-radius: 4px !important;
}

:deep(.fc-button-primary) {
  background-color: #4338ca !important;
  border-color: #4338ca !important;
  color: white !important;
}

:deep(.fc-button-primary:hover) {
  background-color: #3730a3 !important;
  border-color: #3730a3 !important;
}

:deep(.fc-today-button) {
  background-color: #059669 !important;
  border-color: #059669 !important;
}

:deep(.fc-today-button:hover) {
  background-color: #047857 !important;
  border-color: #047857 !important;
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
</style> 