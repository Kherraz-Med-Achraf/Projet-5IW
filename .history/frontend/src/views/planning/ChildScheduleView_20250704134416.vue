<template>
  <main class="profile-container">
    <!-- Skip links pour l'accessibilité -->
    <div class="skip-links">
      <a href="#main-content" class="skip-link">Aller au contenu principal</a>
      <a href="#calendar-view" class="skip-link">Aller au planning</a>
    </div>

    <div class="profile-content" id="main-content">
      <div class="content-grid">
        
        <!-- En-tête avec gradient -->
        <header class="page-header" role="banner">
          <div class="header-content">
            <div class="title-section">
              <div class="header-icon" aria-hidden="true">
                <i class="material-icons">child_care</i>
              </div>
              <div class="title-info">
                <h1>Planning de mon enfant</h1>
                <p class="subtitle">Consultez l'emploi du temps de votre enfant</p>
              </div>
            </div>
            <div class="status-indicator">
              <div class="status-dot active" aria-hidden="true"></div>
              <span class="status-text">Système actif</span>
            </div>
          </div>
        </header>

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
import listPlugin from '@fullcalendar/list'
import frLocale from '@fullcalendar/core/locales/fr'
import { usePlanningStore } from '@/stores/planning'
import { useAuthStore } from '@/stores/auth'
import CourseDetailsModal from '../../components/planning/CourseDetailsModal.vue'

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

// Événements du calendrier avec logique de groupement
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

  // Grouper par jour pour l'affichage vue mensuelle (éviter les doublons)
  const byDate: Record<string, any[]> = {}
  raw.forEach(ev => {
    const key = ev.start.substring(0, 10)
    ;(byDate[key] = byDate[key] || []).push(ev)
  })
  
  Object.values(byDate).forEach(list => {
    list.sort((a, b) => a.start.localeCompare(b.start))
    list.forEach((ev, idx) => {
      ev.extendedProps.showLabel = idx === 0
    })
  })

  return raw
})

// Configuration FullCalendar
const calendarOptions = computed(() => ({
  plugins: [timeGridPlugin, dayGridPlugin, listPlugin],
  locales: [frLocale],
  locale: 'fr',
  timeZone: 'Europe/Paris',
  initialView: 'timeGridWeek',
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'timeGridWeek,dayGridMonth,listWeek'
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
    
    // Autres vues : affichage normal avec icônes
    const isVacation = isVacationOrHoliday(info.event.title)
    const isCancelled = info.event.title.startsWith('Annulé –')
    
    let icon = '📚'
    if (isVacation) icon = '🏖️'
    else if (isCancelled) icon = '❌'
    
    return { html: `<div class="fc-event-content"><span class="fc-event-icon">${icon}</span> ${info.event.title}</div>` }
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
  // Pour les parents, on peut retourner une valeur générique ou récupérer le nom depuis une API
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

/* En-tête avec gradient */
.page-header {
  background: linear-gradient(135deg, #4338ca 0%, #3730a3 100%);
  border-radius: 1rem;
  padding: 3rem 2rem;
  color: white;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.title-section {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.header-icon {
  width: 4rem;
  height: 4rem;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);

  i {
    font-size: 2rem;
    color: white;
  }
}

.title-info h1 {
  margin: 0;
  font-size: 2.5rem;
  font-weight: 700;
  font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.subtitle {
  margin: 0.5rem 0 0 0;
  font-size: 1.1rem;
  opacity: 0.9;
  font-weight: 400;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 0.75rem;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.status-dot {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.3);

  &.active {
    animation: pulse 2s infinite;
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.status-text {
  font-weight: 500;
  font-size: 0.9rem;
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
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 1rem;

  h2 {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin: 0;
    color: #1e293b;
    font-size: 1.5rem;
    font-weight: 600;
    font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

    i {
      color: #4338ca;
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
  border: 2px solid #e2e8f0;
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
  gap: 1rem;
  margin: 2rem 2rem 0 2rem;
  padding: 1.5rem;
  background: #f8fafc;
  border-radius: 0.75rem;
  border: 2px solid #e2e8f0;
}

.child-avatar {
  width: 3rem;
  height: 3rem;
  background: #4338ca;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;

  i {
    color: white;
    font-size: 1.5rem;
  }
}

.child-details h3 {
  margin: 0 0 0.25rem 0;
  color: #1e293b;
  font-weight: 600;
  font-size: 1.1rem;
}

.child-meta {
  margin: 0;
  color: #6b7280;
  font-size: 0.875rem;
}

/* Calendrier */
.calendar-section {
  padding: 0;
  overflow: hidden;

  .section-header {
    padding: 2rem 2rem 1rem 2rem;
    margin-bottom: 0;
    border-bottom: none;
  }
}

.calendar-legend {
  display: flex;
  gap: 1.5rem;
  align-items: center;
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