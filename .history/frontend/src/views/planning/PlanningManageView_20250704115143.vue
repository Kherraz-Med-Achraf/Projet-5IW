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
        <header class="page-header">
          <div class="header-content">
            <div class="title-section">
              <div class="header-icon">
                <i class="material-icons">edit_calendar</i>
              </div>
              <div class="title-info">
                <h1>Gestion des Cours</h1>
                <p class="subtitle">Annulation et réaffectation des créneaux</p>
              </div>
            </div>
            <div v-if="selectedSemester && selectedStaff" class="status-indicator">
              <i class="material-icons">person</i>
              <span>{{ selectedStaff.firstName }} {{ selectedStaff.lastName }}</span>
            </div>
          </div>
        </header>

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
                @change="loadEvents"
                class="config-input"
              >
                <option disabled value="">— Choisir un semestre —</option>
                <option v-for="s in semesters" :key="s.id" :value="s.id">{{ s.name }}</option>
              </select>
            </div>

            <!-- Sélection éducateur -->
            <div class="config-item">
              <label for="staff-select" class="config-label">
                <i class="material-icons">person</i>
                Éducateur
              </label>
              <select 
                id="staff-select" 
                v-model="selectedStaffId" 
                @change="loadEvents"
                class="config-input"
              >
                <option disabled value="">— Choisir un éducateur —</option>
                <option v-for="s in staffList" :key="s.userId" :value="s.userId">
                  {{ s.firstName }} {{ s.lastName }}
                </option>
              </select>
            </div>
          </div>

          <!-- Instructions -->
          <div class="instructions-section">
            <div class="instruction-card">
              <div class="instruction-icon">
                <i class="material-icons">info</i>
              </div>
              <div class="instruction-content">
                <h4>Instructions d'utilisation</h4>
                <ul>
                  <li><strong>Clic simple :</strong> Voir les détails du cours et les enfants concernés</li>
                  <li><strong>Annuler un cours :</strong> Les enfants seront automatiquement réaffectés</li>
                  <li><strong>Réaffectation :</strong> Transférer les enfants vers un autre créneau</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <!-- Statistiques du planning -->
        <section v-if="events.length > 0" class="profile-section" aria-labelledby="stats-title">
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
                <h3>Total créneaux</h3>
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
                <i class="material-icons">child_care</i>
              </div>
              <div class="stat-content">
                <h3>Enfants suivis</h3>
                <div class="stat-value">{{ totalChildren }}</div>
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
          </div>
        </section>

        <!-- Calendrier -->
        <section v-if="selectedSemesterId && selectedStaffId && displayEvents.length" class="profile-section calendar-section" id="calendar-view" aria-labelledby="calendar-title">
          <div class="section-header">
            <h2 id="calendar-title">
              <i class="material-icons">calendar_view_week</i>
              Planning {{ selectedStaffName }}
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
            <p>Veuillez sélectionner un semestre et un éducateur pour voir le planning.</p>
          </div>
        </section>
      </div>
    </div>

    <!-- Modale détails cours -->
    <CourseDetailsModal
      v-if="showModal && selectedCourse"
      :course="selectedCourse"
      :staff-name="selectedStaffName"
      @close="closeModal"
      @cancel-course="handleCancelCourse"
      @reassign-children="handleReassignChildren"
    />

    <!-- Modale de confirmation d'annulation -->
    <ConfirmCancelModal
      v-if="showCancelModal"
      :course="courseToCancel"
      @confirm="confirmCancelCourse"
      @cancel="showCancelModal = false"
    />
  </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import FullCalendar from '@fullcalendar/vue3'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin from '@fullcalendar/daygrid'
import listPlugin from '@fullcalendar/list'
import frLocale from '@fullcalendar/core/locales/fr'
import { usePlanningStore } from '@/stores/planning'
import { useAuthStore } from '@/stores/auth'
import CourseDetailsModal from '../../components/planning/CourseDetailsModal.vue'
import ConfirmCancelModal from '../../components/planning/ConfirmCancelModal.vue'
import TransferChildrenModal from '../../components/planning/TransferChildrenModal.vue'

const planning = usePlanningStore()
const auth = useAuthStore()

const selectedSemesterId = ref('')
const selectedStaffId = ref('')
const events = ref<any[]>([])
const allEvents = ref<any[]>([])
const currentSelection = ref<any>(null)
const reassignSource = ref<any>(null)
const showModal = ref(false)
const selectedCourse = ref<any>(null)
const showCancelModal = ref(false)
const courseToCancel = ref<any>(null)
const showTransferModal = ref(false)
const transferData = ref<{
  cancelledCourse: any
  alternatives: any[]
}>({
  cancelledCourse: null,
  alternatives: []
})

const semesters = computed(() => planning.semesters)
const staffList = computed(() => planning.staffList)

const selectedSemester = computed(() => 
  semesters.value.find(s => s.id === selectedSemesterId.value)
)

const selectedStaff = computed(() => 
  staffList.value.find(s => s.userId === selectedStaffId.value)
)

const selectedStaffName = computed(() => {
  const staff = selectedStaff.value
  return staff ? `${staff.firstName} ${staff.lastName}` : ''
})

// Statistiques
const totalEvents = computed(() => events.value.length)
const cancelledEvents = computed(() => 
  events.value.filter(e => e.title.startsWith('Annulé –')).length
)
const totalChildren = computed(() => {
  const childIds = new Set()
  events.value.forEach(e => {
    if (e.extendedProps?.children) {
      e.extendedProps.children.forEach((c: any) => childIds.add(c.id))
    }
  })
  return childIds.size
})
const weeklyHours = computed(() => {
  let totalMinutes = 0
  events.value.forEach(e => {
    const start = new Date(e.start)
    const end = new Date(e.end)
    totalMinutes += (end.getTime() - start.getTime()) / (1000 * 60)
  })
  return Math.round(totalMinutes / 60)
})

function staffName(userId: string) {
  const st = staffList.value.find(s => s.userId === userId)
  return st ? `${st.firstName} ${st.lastName}` : 'Inconnu'
}

const fcOptions: any = {
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
  allDaySlot: false, // Masquer complètement la ligne "Toute la journée"
  allDayText: '', // Supprimer le texte "Toute la journée"
  events: events.value,
  eventContent(info: any) {
    const isVacation = info.event.title.toLowerCase().includes('vacances') || 
                      info.event.title.toLowerCase().includes('férié')
    const isCancelled = info.event.title.startsWith('Annulé –')
    
    // Vue mois : affichage spécial avec background coloré
    if (info.view.type === 'dayGridMonth') {
      let label = 'Journée de cours'
      let bgColor = '#4338ca' // bleu pour les cours
      let textColor = 'white'
      
      if (isVacation) {
        label = info.event.title.toLowerCase().includes('férié') ? 'Jour férié' : 'Vacances scolaires'
        bgColor = '#FFB74D' // jaune pour vacances/fériés
        textColor = 'black'
      } else if (isCancelled) {
        label = 'Cours annulé'
        bgColor = '#B0BEC5' // gris pour annulé
        textColor = 'black'
      }
      
      return { 
        html: `<div class="fc-event-month" style="background-color: ${bgColor}; color: ${textColor}; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">${label}</div>` 
      }
    }
    
    // Autres vues : affichage normal avec icônes
    let icon = '📚'
    if (isVacation) icon = '🏖️'
    else if (isCancelled) icon = '❌'
    
    return { html: `<div class="fc-event-content"><span class="fc-event-icon">${icon}</span> ${info.event.title}</div>` }
  },
     eventClick(info: any) {
     const kids = info.event.extendedProps.children || []
     const cancelled = info.event.title.startsWith('Annulé –')
     const vacation = info.event.extendedProps.vacation || false
     
     // Toujours utiliser les horaires originaux pour éviter les problèmes de timezone
     selectedCourse.value = {
       id: info.event.id,
       title: info.event.title,
       start: new Date(info.event.extendedProps.originalStart),
       end: new Date(info.event.extendedProps.originalEnd),
       children: kids,
       cancelled,
       vacation,
       staffId: info.event.extendedProps.staffId
     }
     showModal.value = true
     currentSelection.value = info.event
   }
}

async function loadEvents() {
  events.value = []
  if (!selectedSemesterId.value || !selectedStaffId.value) return
  
  const API = import.meta.env.VITE_NEST_API_URL ?? ''
  const res = await fetch(`${API}/planning/semesters/${selectedSemesterId.value}/staff/${selectedStaffId.value}`, {
    headers: { Authorization: `Bearer ${auth.token}` }
  })
  if (!res.ok) return
  
  const data = await res.json()
  events.value = data.map((e: any) => {
    const isVacation = e.activity.toLowerCase().includes('vacances') || 
                      e.activity.toLowerCase().includes('férié')
    
    // Le backend gère déjà les heures correctes (8h-16h pour les vacances)
    return {
      id: e.id,
      title: e.activity,
      start: e.startTime,
      end: e.endTime,
      color: getEventColor(e.activity),
      extendedProps: { 
        children: e.children, 
        staffId: e.staffId,
        originalStart: e.startTime,
        originalEnd: e.endTime,
        vacation: isVacation
      }
    }
  })
  fcOptions.events = events.value

  // Charger tous les événements pour les réaffectations
  const resAll = await fetch(`${API}/planning/semesters/${selectedSemesterId.value}/overview`, {
    headers: { Authorization: `Bearer ${auth.token}` }
  })
  if (resAll.ok) {
    const arr = await resAll.json()
    allEvents.value = arr.map((e: any) => ({
      id: e.id,
      title: e.activity,
      start: e.startTime,
      end: e.endTime,
      extendedProps: { children: e.children, staffId: e.staffId }
    }))
  }
}

function getEventColor(activity: string): string {
  if (activity.startsWith('Annulé –')) return '#B0BEC5'
  if (activity.toLowerCase().includes('vacances') || activity.toLowerCase().includes('férié')) return '#FFB74D'
  return '#4338ca'
}

const displayEvents = computed(() => {
  return selectedStaffId.value
    ? events.value.filter(e => e.extendedProps.staffId === selectedStaffId.value)
    : events.value
})

function closeModal() {
  showModal.value = false
  selectedCourse.value = null
}

function handleCancelCourse(course: any) {
  courseToCancel.value = course
  showCancelModal.value = true
  showModal.value = false
}

async function confirmCancelCourse() {
  if (!courseToCancel.value) return
  
  const cancelled = courseToCancel.value.title.startsWith('Annulé – ')
  await planning.cancelEntry(courseToCancel.value.id, !cancelled)
  await loadEvents()
  
  showCancelModal.value = false
  courseToCancel.value = null
}

function handleReassignChildren(sourceId: string, targetId: string) {
  planning.reassignChildren(sourceId, targetId).then(() => {
    loadEvents()
    showModal.value = false
  })
}

onMounted(async () => {
  if (!semesters.value.length) await planning.fetchSemesters()
  if (!staffList.value.length) await planning.fetchStaffList()
})

watch(selectedSemesterId, loadEvents)
watch(selectedStaffId, loadEvents)
</script>

<style scoped lang="scss">
/* ===== Reprendre le style des autres vues ===== */

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
  border-radius: 1rem;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.2);
  font-weight: 600;
  font-size: 0.9rem;
}

/* Sections */
.profile-section {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1), 0 3px 6px rgba(0, 0, 0, 0.08);
  }
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e2e8f0;

  h2 {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 1.5rem;
    font-weight: 600;
    color: #1e293b;
    margin: 0;
    font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

    i {
      color: #4338ca;
      font-size: 1.75rem;
    }
  }
}

/* Configuration */
.config-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

.config-item {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.config-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;

  i {
    color: #4338ca;
    font-size: 1.2rem;
  }
}

.config-input {
  padding: 0.75rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 1rem;
  background: white;
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

.instruction-card {
  display: flex;
  gap: 1rem;
  padding: 1.5rem;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 0.75rem;

  .instruction-icon {
    width: 2.5rem;
    height: 2.5rem;
    background: #0ea5e9;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    i {
      color: white;
      font-size: 1.25rem;
    }
  }

  .instruction-content {
    flex: 1;

    h4 {
      margin: 0 0 0.75rem 0;
      color: #0c4a6e;
      font-weight: 600;
    }

    ul {
      margin: 0;
      padding-left: 1.25rem;
      color: #075985;
      font-size: 0.875rem;
      line-height: 1.6;

      li {
        margin-bottom: 0.5rem;

        strong {
          color: #0c4a6e;
        }
      }
    }
  }
}

/* Statistiques */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
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

  :deep(.fc-event-content) {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  :deep(.fc-event-icon) {
    font-size: 0.875rem;
  }
  
  :deep(.fc-event-month) {
    display: block;
    text-align: center;
    border: none !important;
    width: 100%;
    box-sizing: border-box;
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

  .profile-section {
    padding: 1.5rem;
  }

  .header-content {
    flex-direction: column;
    text-align: center;
  }

  .title-info h1 {
    font-size: 2rem;
  }

  .header-icon {
    width: 3rem;
    height: 3rem;

    i {
      font-size: 1.5rem;
    }
  }

  .calendar-legend {
    justify-content: center;
  }

  .calendar-wrapper {
    padding: 0 1rem 1rem 1rem;
  }

  .instruction-card {
    flex-direction: column;
    text-align: center;
  }
}
</style> 