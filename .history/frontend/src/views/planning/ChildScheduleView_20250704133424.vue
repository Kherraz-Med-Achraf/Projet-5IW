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

        <!-- Statistiques -->
        <section v-if="events.length" class="profile-section" aria-labelledby="stats-title">
          <div class="section-header">
            <h2 id="stats-title">
              <i class="material-icons">analytics</i>
              Statistiques
            </h2>
          </div>

          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon">
                <i class="material-icons">event</i>
              </div>
              <div class="stat-content">
                <h3>Total activités</h3>
                <div class="stat-value">{{ totalEvents }}</div>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon">
                <i class="material-icons">cancel</i>
              </div>
              <div class="stat-content">
                <h3>Cours annulés</h3>
                <div class="stat-value">{{ cancelledEvents }}</div>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon">
                <i class="material-icons">schedule</i>
              </div>
              <div class="stat-content">
                <h3>Heures/semaine</h3>
                <div class="stat-value">{{ weeklyHours }}h</div>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon">
                <i class="material-icons">school</i>
              </div>
              <div class="stat-content">
                <h3>Activités uniques</h3>
                <div class="stat-value">{{ uniqueActivities }}</div>
              </div>
            </div>
          </div>
        </section>

        <!-- Calendrier -->
        <section v-if="selectedSemesterId && childId && events.length" class="profile-section calendar-section" id="calendar-view" aria-labelledby="calendar-title">
          <div class="section-header">
            <h2 id="calendar-title">
              <i class="material-icons">calendar_view_week</i>
              Planning {{ selectedChild?.firstName }}
            </h2>
            <div class="calendar-legend">
              <div class="legend-item">
                <div class="legend-color normal"></div>
                <span>Cours normal</span>
              </div>
              <div class="legend-item">
                <div class="legend-color cancelled"></div>
                <span>Cours annulé</span>
              </div>
              <div class="legend-item">
                <div class="legend-color vacation"></div>
                <span>Vacances/Férié</span>
              </div>
            </div>
          </div>

          <div class="calendar-wrapper">
            <FullCalendar :options="fcOptions" />
          </div>
        </section>

        <!-- Message si pas de sélection -->
        <section v-else class="profile-section">
          <div class="empty-state">
            <div class="empty-icon">
              <i class="material-icons">event_note</i>
            </div>
            <h3>Aucun planning sélectionné</h3>
            <p>Veuillez sélectionner un semestre et un enfant pour voir le planning.</p>
          </div>
        </section>
      </div>
    </div>
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

const planning = usePlanningStore()
const auth = useAuthStore()

const selectedSemesterId = ref<string>('')
const semesters = computed(() => planning.semesters)

const children = ref<any[]>([])
const childId = ref<string>('')

interface Entry { 
  id: string
  title: string
  start: string
  end: string
  allDay?: boolean
  color?: string
}

const events = ref<Entry[]>([])

// Computed properties
const selectedSemester = computed(() => 
  semesters.value.find(s => s.id === selectedSemesterId.value)
)

const selectedSemesterName = computed(() => 
  selectedSemester.value?.name || ''
)

const selectedChild = computed(() => 
  children.value.find(c => c.id === parseInt(childId.value))
)

// Statistiques
const totalEvents = computed(() => events.value.length)

const cancelledEvents = computed(() => 
  events.value.filter(e => e.title.startsWith('Annulé –')).length
)

const weeklyHours = computed(() => {
  let totalMinutes = 0
  events.value.forEach(e => {
    if (!e.allDay) {
      const start = new Date(e.start)
      const end = new Date(e.end)
      totalMinutes += (end.getTime() - start.getTime()) / (1000 * 60)
    }
  })
  return Math.round(totalMinutes / 60)
})

const uniqueActivities = computed(() => {
  const activities = new Set()
  events.value.forEach(e => {
    const cleanTitle = e.title.replace(/^Annulé – /, '')
    activities.add(cleanTitle)
  })
  return activities.size
})

// Configuration FullCalendar
const fcOptions = computed(() => ({
  plugins: [timeGridPlugin, dayGridPlugin, listPlugin],
  locales: [frLocale],
  locale: 'fr',
  timeZone: 'Europe/Paris',
  initialView: 'timeGridWeek',
  slotMinTime: '08:00:00',
  slotMaxTime: '17:00:00',
  height: 'auto',
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth,timeGridWeek,listWeek'
  },
  buttonText: {
    today: "Aujourd'hui",
    month: 'Mois',
    week: 'Semaine',
    list: 'Liste'
  },
  events: events.value,
  eventDidMount: (info: any) => {
    if (info.event.title.startsWith('Annulé –')) {
      info.el.style.backgroundColor = '#B0BEC5'
      info.el.style.borderColor = '#90A4AE'
    } else if (info.event.allDay) {
      info.el.style.backgroundColor = '#FFB74D'
      info.el.style.borderColor = '#FF9800'
    } else {
      info.el.style.backgroundColor = '#4338ca'
      info.el.style.borderColor = '#3730a3'
    }
  }
}))

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
  events.value = []
  if (!selectedSemesterId.value || !childId.value) return
  
  try {
    const API = import.meta.env.VITE_NEST_API_URL ?? ''
    const res = await fetch(`${API}/planning/semesters/${selectedSemesterId.value}/child/${childId.value}`, {
      headers: { Authorization: `Bearer ${auth.token}` }
    })
    
    if (!res.ok) {
      console.error('Erreur lors du chargement du planning')
      return
    }
    
    const data = await res.json()
    const uniq: Record<string, any> = {}
    
    data.forEach((e: any) => {
      const key = `${e.startTime}-${e.endTime}-${e.activity}`
      if (!uniq[key]) {
        uniq[key] = {
          id: e.id,
          title: e.activity,
          start: e.startTime,
          end: e.endTime,
          allDay: e.activity.toLowerCase().includes('vacances') || e.activity.toLowerCase().includes('férié'),
          color: e.activity.startsWith('Annulé –') ? '#B0BEC5' : 
                 (e.activity.toLowerCase().includes('vacances') || e.activity.toLowerCase().includes('férié')) ? '#FFB74D' : 
                 '#4338ca',
        }
      }
    })
    
    events.value = Object.values(uniq)
  } catch (error) {
    console.error('Erreur lors du chargement du planning:', error)
  }
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

/* Statistiques */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  padding: 0 2rem 2rem 2rem;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: #f8fafc;
  border-radius: 0.75rem;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;

  &:hover {
    background: #f1f5f9;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
}

.stat-icon {
  width: 3rem;
  height: 3rem;
  background: #ede9fe;
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;

  i {
    color: #4338ca;
    font-size: 1.5rem;
  }
}

.stat-content h3 {
  margin: 0 0 0.25rem 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: #1e293b;
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

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
    padding: 0 1rem 2rem 1rem;
  }

  .stat-card {
    padding: 1rem;
  }

  .stat-icon {
    width: 2.5rem;
    height: 2.5rem;

    i {
      font-size: 1.25rem;
    }
  }

  .stat-value {
    font-size: 1.5rem;
  }

  .child-info {
    margin: 2rem 1rem 0 1rem;
    padding: 1rem;
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
  .stats-grid {
    grid-template-columns: 1fr;
  }

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