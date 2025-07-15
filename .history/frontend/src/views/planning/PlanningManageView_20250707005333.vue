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
          title="Gestion des Cours"
          :subtitle="selectedStaffName ? `Planning de ${selectedStaffName}` : ''"
          icon="edit_calendar"
          status-text="Annulation et réaffectation des créneaux"
          status-icon="info"
          status-class="status-info"
        />
        <!-- Configuration et sélection -->
        <section class="profile-section config-section" id="semester-selection" aria-labelledby="config-title">
          <div class="section-header">
            <h2 id="config-title">
              <i class="material-icons" aria-hidden="true">tune</i>
              Configuration
            </h2>
          </div>

          <div class="config-grid">
            <!-- Sélection semestre -->
            <div class="config-item">
              <label for="semester-select" class="config-label">
                <i class="material-icons" aria-hidden="true">event</i>
                Semestre
              </label>
              <select 
                id="semester-select" 
                v-model="selectedSemesterId" 
                @change="loadEvents"
                class="config-input"
                aria-describedby="semester-help"
                :aria-invalid="!selectedSemesterId && semesters.length > 0 ? 'true' : 'false'"
              >
                <option disabled value="">— Choisir un semestre —</option>
                <option v-for="s in semesters" :key="s.id" :value="s.id">{{ s.name }}</option>
              </select>
              <small id="semester-help" class="config-help">
                Sélectionnez le semestre pour lequel vous souhaitez gérer les cours
              </small>
            </div>

            <!-- Sélection éducateur -->
            <div class="config-item">
              <label for="staff-select" class="config-label">
                <i class="material-icons" aria-hidden="true">person</i>
                Éducateur
              </label>
              <select 
                id="staff-select" 
                v-model="selectedStaffId" 
                @change="loadEvents"
                class="config-input"
                aria-describedby="staff-help"
                :disabled="!selectedSemesterId"
                :aria-invalid="!selectedStaffId && staffList.length > 0 && selectedSemesterId ? 'true' : 'false'"
              >
                <option disabled value="">— Choisir un éducateur —</option>
                <option v-for="s in staffList" :key="s.userId" :value="s.userId">
                  {{ s.firstName }} {{ s.lastName }}
                </option>
              </select>
              <small id="staff-help" class="config-help">
                Sélectionnez l'éducateur dont vous souhaitez voir et gérer le planning
              </small>
            </div>
          </div>

          <!-- Instructions -->
          <div class="instructions-section">
            <div class="info-note" role="note">
              <i class="material-icons" aria-hidden="true">info</i>
              <span>Clic simple : voir détails • Annuler : réaffectation automatique • Réassigner : transférer vers autre créneau</span>
            </div>
          </div>
        </section>

        <!-- Statistiques du planning -->
        <section v-if="events.length > 0" class="profile-section config-section" aria-labelledby="stats-title">
          <div class="section-header">
            <h2 id="stats-title">
              <i class="material-icons" aria-hidden="true">analytics</i>
              Statistiques
            </h2>
          </div>

          <div class="stats-grid" role="group" aria-labelledby="stats-title">
            <div class="stat-card" role="img" :aria-label="`${totalEvents} créneaux au total`">
              <div class="stat-icon" aria-hidden="true">
                <i class="material-icons">event</i>
              </div>
              <div class="stat-content">
                <h3>Total créneaux</h3>
                <div class="stat-value">{{ totalEvents }}</div>
              </div>
            </div>

            <div class="stat-card" role="img" :aria-label="`${cancelledEvents} cours annulés`">
              <div class="stat-icon" aria-hidden="true">
                <i class="material-icons">cancel</i>
              </div>
              <div class="stat-content">
                <h3>Cours annulés</h3>
                <div class="stat-value">{{ cancelledEvents }}</div>
              </div>
            </div>

            <div class="stat-card" role="img" :aria-label="`${totalChildren} enfants suivis`">
              <div class="stat-icon" aria-hidden="true">
                <i class="material-icons">child_care</i>
              </div>
              <div class="stat-content">
                <h3>Enfants suivis</h3>
                <div class="stat-value">{{ totalChildren }}</div>
              </div>
            </div>

            <div class="stat-card" role="img" :aria-label="`${weeklyHours} heures par semaine`">
              <div class="stat-icon" aria-hidden="true">
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
        <section 
          v-if="selectedSemesterId && selectedStaffId && displayEvents.length" 
          class="profile-section calendar-section" 
          id="calendar-view" 
          aria-labelledby="calendar-title"
        >
          <div class="section-header">
            <h2 id="calendar-title">
              <i class="material-icons" aria-hidden="true">calendar_view_week</i>
              Planning {{ selectedStaffName }}
            </h2>
          </div>

          <div class="calendar-legend" role="group" aria-label="Légende du calendrier">
            <div class="legend-item">
              <div class="legend-color normal" aria-hidden="true"></div>
              <span>Cours normal</span>
            </div>
            <div class="legend-item">
              <div class="legend-color cancelled" aria-hidden="true"></div>
              <span>Cours annulé</span>
            </div>
            <div class="legend-item">
              <div class="legend-color vacation" aria-hidden="true"></div>
              <span>Vacances/Férié</span>
            </div>
          </div>

          <div class="calendar-wrapper" role="application" aria-label="Calendrier interactif du planning">
            <div class="calendar-instructions sr-only">
              <p>
                Utilisez les flèches ou Tab pour naviguer dans le calendrier. 
                Appuyez sur Entrée ou Espace pour sélectionner un événement.
              </p>
            </div>
            <FullCalendar 
              :options="calendarOptions" 
              aria-label="Calendrier du planning"
            />
          </div>
        </section>

        <!-- Message si pas de sélection -->
        <section v-else class="profile-section" aria-live="polite">
          <div class="empty-state">
            <div class="empty-icon" aria-hidden="true">
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
      v-if="showConfirmModal"
      :course="selectedCourse"
      @confirm="confirmCancelCourse"
      @cancel="cancelCancelCourse"
    />

    <!-- Modale de transfert individuel -->
    <ChildTransferModal
      v-if="showTransferModal"
      :cancelled-course="transferData.cancelledCourse"
      :alternatives="transferData.alternatives"
      :staff-list="staffList"
      @close="closeTransferModal"
      @transfer-children="handleIndividualTransfers"
    />

    <!-- Indicateur de chargement -->
    <div 
      v-if="loading" 
      class="loading-overlay" 
      role="status" 
      aria-live="polite"
      aria-label="Chargement en cours"
    >
      <div class="loading-spinner" aria-hidden="true">
        <i class="material-icons spinning">hourglass_empty</i>
      </div>
      <p>Chargement du planning...</p>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import FullCalendar from '@fullcalendar/vue3'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin from '@fullcalendar/daygrid'
import frLocale from '@fullcalendar/core/locales/fr'
import { usePlanningStore } from '@/stores/planning'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'vue-toastification'
import CourseDetailsModal from '../../components/planning/CourseDetailsModal.vue'
import ConfirmCancelModal from '../../components/planning/ConfirmCancelModal.vue'
import ChildTransferModal from '../../components/planning/ChildTransferModal.vue'
import PageHeader from '@/components/PageHeader.vue'

/** Store & états locaux **/
const planning = usePlanningStore()
const auth = useAuthStore()
const toast = useToast()
const selectedSemesterId = ref<string>('')
const selectedStaffId = ref<string>('')
const showModal = ref(false)
const showConfirmModal = ref(false)
const showTransferModal = ref(false)
const selectedCourse = ref<any>(null)
const transferData = ref<any>({})
const loading = ref(false)

/** Données du store **/
const semesters = computed(() => {
  // Éliminer les doublons par ID
  const uniqueSemesters = planning.semesters.filter((semester, index, self) =>
    index === self.findIndex(s => s.id === semester.id)
  )
  return uniqueSemesters
})

const staffList = computed(() => {
  console.log('Computed staffList called, raw data length:', planning.staffList.length)
  console.log('Raw staff userIds:', planning.staffList.map(s => `${s.firstName} ${s.lastName} (${s.userId})`))
  
  // La déduplication est maintenant gérée au niveau du store, mais on garde une vérification par sécurité
  const result = planning.staffList.filter((staff, index, self) => {
    if (!staff.userId) return false
    return index === self.findIndex(s => s.userId && String(s.userId) === String(staff.userId))
  })
  
  console.log('Final staff list length:', result.length)
  return result
})

const events = computed(() => planning.events)

/** Nom de l'éducateur sélectionné **/
const selectedStaffName = computed(() => {
  const staff = staffList.value.find(s => s.userId === selectedStaffId.value)
  return staff ? `${staff.firstName} ${staff.lastName}` : ''
})

/** Configuration FullCalendar - copie exacte de PlanningUploadView.vue **/
const calendarOptions = ref({
  plugins: [timeGridPlugin, dayGridPlugin],
  locales: [frLocale],
  locale: 'fr',
  timeZone: 'Europe/Paris',
  initialView: 'timeGridWeek',
  initialDate: new Date(), // Sera modifié par le watcher
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'timeGridWeek,dayGridMonth'
  },
  slotMinTime: '08:00:00',
  slotMaxTime: '17:00:00',
  scrollTime: '08:00:00',
  height: 'auto',
  allDaySlot: false,
  eventClick: handleEventClick,
  events: [] as any[],
})

/** Fonctions utilitaires - corrigée pour détecter seulement les cours explicitement annulés **/
function getEventColor(event: any): string {
  // Cours annulé SEULEMENT si nom contient "annulé" (pas seulement s'il n'a pas d'enfants)
  const isCancelled = event.activity.toLowerCase().includes('annulé')
  const isVacation = event.activity.toLowerCase().includes('vacances') || 
                    event.activity.toLowerCase().includes('férié')
  
  if (isCancelled && !isVacation) return '#B0BEC5' // Gris pour annulé
  if (isVacation) return '#FFB74D' // Orange pour vacances  
  return '#4338ca' // Bleu pour normal
}

/** Événements filtrés pour affichage **/
const displayEvents = computed(() => {
  if (!selectedSemesterId.value || !selectedStaffId.value) return []
  
  return events.value.map(event => {
    // Détecter si le cours est annulé (SEULEMENT si nom contient "annulé")
    const isCancelled = event.activity.toLowerCase().includes('annulé')
    const isVacation = event.activity.toLowerCase().includes('vacances') || 
                      event.activity.toLowerCase().includes('férié')
    
    // Modifier le titre pour les cours annulés (sauf si c'est des vacances)
    let displayTitle = event.activity
    if (isCancelled && !isVacation && !displayTitle.toLowerCase().startsWith('annulé')) {
      displayTitle = `ANNULÉ - ${event.activity}`
    }
    
    const baseEvent = {
      id: event.id,
      title: displayTitle,
      start: event.startTime,
      end: event.endTime,
      color: getEventColor(event),
      extendedProps: {
        cancelled: isCancelled,
        vacation: isVacation,
        children: event.children,
        staffId: event.staffId,
        originalActivity: event.activity // Garder l'activité originale
      }
    }
    

    
    return baseEvent
  })
})

/** Statistiques calculées **/
const totalEvents = computed(() => displayEvents.value.length)
const cancelledEvents = computed(() => 
  displayEvents.value.filter(e => e.extendedProps.cancelled).length
)
const totalChildren = computed(() => {
  const childrenIds = new Set()
  events.value.forEach(event => {
    event.children.forEach(child => childrenIds.add(child.id))
  })
  return childrenIds.size
})
const weeklyHours = computed(() => {
  const totalMinutes = displayEvents.value.reduce((acc, event) => {
    if (event.extendedProps.cancelled || event.extendedProps.vacation) return acc
    const start = new Date(event.start)
    const end = new Date(event.end)
    return acc + (end.getTime() - start.getTime()) / (1000 * 60)
  }, 0)
  return Math.round(totalMinutes / 60)
})

/** Lifecycle **/
onMounted(() => {
  loadSemesters()
  loadStaff()
})

/** Méthodes **/
async function loadSemesters() {
  await planning.loadSemesters()
}

async function loadStaff() {
  await planning.loadStaff()
}

async function loadEvents() {
  if (!selectedSemesterId.value || !selectedStaffId.value) return
  
  loading.value = true
  try {
    await planning.loadStaffSchedule(selectedSemesterId.value, selectedStaffId.value)
  } finally {
    loading.value = false
  }
}

function handleEventClick(clickInfo: any) {
  const event = clickInfo.event
  const extendedProps = event.extendedProps
  
  selectedCourse.value = {
    id: event.id,
    title: extendedProps.originalActivity || event.title, // Utiliser l'activité originale pour la modale
    displayTitle: event.title, // Titre d'affichage avec "ANNULÉ"
    start: new Date(event.start),
    end: new Date(event.end),
    children: extendedProps.children || [],
    cancelled: extendedProps.cancelled || false,
    vacation: extendedProps.vacation || false
  }
  
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  selectedCourse.value = null
}

async function handleCancelCourse(course: any) {
  if (!course) return
  
  const courseData = events.value.find(e => e.id === course.id)
  if (!courseData) return
  
  // Si le cours est déjà annulé, on le réactive directement
  if (course.cancelled) {
    try {
      console.log('=== RÉACTIVATION DU COURS ===')
      console.log('Course ID:', course.id)
      console.log('Course data before:', course)
      
      await planning.reactivateCourse(course.id)
      console.log('API call réactivation terminé')
      
      // Attendre un peu pour que l'API se mette à jour
      await new Promise(resolve => setTimeout(resolve, 500))
      
      console.log('Rechargement des événements...')
      await loadEvents()
      console.log('Événements rechargés')
      
      // Vérifier que le cours est bien réactivé
      const updatedCourse = events.value.find(e => e.id === course.id)
      if (updatedCourse) {
        console.log('Cours après réactivation:', updatedCourse)
        console.log('Activité après réactivation:', updatedCourse.activity)
        console.log('Cours considéré comme annulé?', updatedCourse.activity.toLowerCase().includes('annulé'))
      }
      
      // Forcer aussi un rafraîchissement de l'aperçu global
      if (selectedSemesterId.value) {
        console.log('Rechargement de l\'aperçu global...')
        await planning.fetchOverview()
        console.log('Aperçu global rechargé')
      }
      
      closeModal()
      console.log('=== RÉACTIVATION TERMINÉE ===')
      
      // Informer l'utilisateur du succès de la réactivation
      toast.success('Cours réactivé avec succès ! Les enfants transférés ont été automatiquement restaurés.')
    } catch (err: any) {
      console.error('=== ERREUR RÉACTIVATION ===', err)
      // Afficher l'erreur à l'utilisateur
      toast.error('Erreur lors de la réactivation : ' + (err.message || 'Erreur inconnue'))
    }
    return
  }
  
  // Sinon, c'est une annulation - vérifier s'il y a des enfants à transférer
  if (courseData.children && courseData.children.length > 0) {
    try {
      // Charger les alternatives
      const alternatives = await planning.findAlternatives(course.id)
      
      if (alternatives.length > 0) {
        // Ouvrir la modale de transfert individuel
        transferData.value = {
          cancelledCourse: course,
          alternatives: alternatives
        }
        showTransferModal.value = true
        closeModal()
        toast.info(`${alternatives.length} cours alternatifs trouvés pour le transfert.`)
      } else {
        // Pas d'alternatives, confirmer l'annulation directe
        showConfirmModal.value = true
        closeModal()
        toast.warning('Aucun cours alternatif trouvé. Voulez-vous annuler le cours sans transfert ?')
      }
    } catch (err: any) {
      console.error('Erreur lors de la recherche d\'alternatives:', err)
      toast.error('Impossible de trouver des cours alternatifs.')
      return
    }
  } else {
    // Pas d'enfants, annuler directement
    try {
      console.log('Annulation du cours:', course.id)
      await planning.cancelCourse(course.id)
      console.log('Cours annulé avec succès')
      await loadEvents()
      closeModal()
      toast.success('Cours annulé avec succès.')
    } catch (err: any) {
      console.error('Erreur lors de l\'annulation:', err)
      toast.error('Erreur lors de l\'annulation : ' + (err.message || 'Erreur inconnue'))
    }
  }
}

function handleReassignChildren(sourceId: string, targetId: string) {
  // Gestion des réassignations
  console.log('Réassignation:', sourceId, '->', targetId)
}

async function confirmCancelCourse() {
  if (selectedCourse.value) {
    try {
      await planning.cancelCourse(selectedCourse.value.id)
      await loadEvents()
      toast.success('Cours annulé avec succès.')
    } catch (err: any) {
      console.error('Erreur lors de l\'annulation:', err)
      toast.error('Erreur lors de l\'annulation : ' + (err.message || 'Erreur inconnue'))
    }
  }
  showConfirmModal.value = false
}

function cancelCancelCourse() {
  showConfirmModal.value = false
}

function closeTransferModal() {
  showTransferModal.value = false
  transferData.value = {}
}

async function handleIndividualTransfers(transfers: Record<number, string>) {
  // Sauvegarder l'ID du cours annulé avant de fermer la modale
  const cancelledCourseId = transferData.value.cancelledCourse?.id
  const cancelledCourse = transferData.value.cancelledCourse
  
  closeTransferModal()
  
  // Vérifier que l'ID existe
  if (!cancelledCourseId) {
    console.error('Cancelled course ID not found')
    toast.error('Erreur de transfert : ID du cours non trouvé')
    return
  }
  
  try {
    // Effectuer les transferts individuels
    let transferCount = 0
    for (const [childId, targetCourseId] of Object.entries(transfers)) {
      if (targetCourseId) {
        await planning.transferChild(
          cancelledCourseId,
          parseInt(childId),
          targetCourseId
        )
        transferCount++
      }
    }
    
    // Maintenant annuler automatiquement le cours
    if (transferCount > 0) {
      console.log('Annulation automatique du cours après transferts...')
      await planning.cancelCourse(cancelledCourseId)
      console.log('Cours annulé automatiquement après transferts')
      
      toast.success(`Transferts terminés ! ${transferCount} enfant(s) transféré(s) et cours annulé automatiquement.`)
    } else {
      toast.info('Aucun enfant n\'a été transféré.')
    }
    
    // Rafraîchir le planning
    await loadEvents()
  } catch (err: any) {
    console.error('Erreur lors du transfert:', err)
    toast.error('Erreur lors du transfert : ' + (err.message || 'Erreur inconnue'))
  }
}

/** Watchers **/
watch(selectedSemesterId, loadEvents)
watch(selectedStaffId, loadEvents)

// Watcher pour naviguer vers la date de début du semestre
watch(selectedSemesterId, async (newSemesterId) => {
  if (!newSemesterId) return
  
  const sem = semesters.value.find(s => s.id === newSemesterId)
  if (!sem) return
  
  // Positionner le calendrier à la date de début du semestre
  calendarOptions.value.initialDate = sem.startDate
  
  // Si le calendrier est déjà monté, naviguer vers la date
  const calendarApi = document.querySelector('.fc')
  if (calendarApi) {
    // Attendre que le calendrier se mette à jour
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Naviguer vers la date de début
    const fcApi = (calendarApi as any)?.__vue__?.getApi?.()
    if (fcApi) {
      fcApi.gotoDate(sem.startDate)
    }
  }
})

watch(displayEvents, events => {
  calendarOptions.value.events = events
})
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
    color: white;
    font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

    .material-icons {
      color: white;
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
  color: #374151; /* Couleur plus foncée pour meilleur contraste */
  font-size: 0.875rem;

  .material-icons {
    color: #4338ca;
    font-size: 1rem;
  }
}

/* ===== EN-TÊTE MODERNE (maintenant géré par PageHeader) ===== */

/* Sections */
.profile-section {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1), 0 3px 6px rgba(0, 0, 0, 0.08);
  }

  &:focus-within {
    box-shadow: 0 0 0 2px rgba(67, 56, 202, 0.2);
  }
}

.config-section {
  padding: 0;
}

.config-section .section-header {
  margin-bottom: 0;
}

.config-section .config-grid {
  margin: 0;
  padding: 2rem;
}

.config-section .instructions-section {
  margin: 0;
  padding: 0 2rem 2rem 2rem;
}

.config-section .stats-grid {
  margin: 0;
  padding: 2rem;
}

/* Header principal avec style moderne */
.main-header-section {
  background: #4444ac;
  color: white;
  box-shadow: 0 10px 30px rgba(68, 68, 172, 0.3);
  margin-bottom: 2rem;
  font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

  .section-header {
    border-bottom: none;
    padding-bottom: 0;
    margin-bottom: 0;
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;

    h1 {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin: 0;
      font-size: 1.875rem;
      font-weight: 600;
      color: white;
      font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

      .material-icons {
        color: white;
        font-size: 2rem;
      }
    }
  }

  .info-note {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
    border: 1px solid #bfdbfe;
    border-radius: 0.75rem;
    color: #1e40af;
    font-size: 0.875rem;
    font-weight: 500;

    .material-icons {
      color: #3b82f6;
      font-size: 1.25rem;
    }
  }
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  padding: 2rem 2rem 1rem 2rem;
  background: #4444ac;
  border-radius: 1rem 1rem 0 0;
  border-bottom: none;

  h2 {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 1.5rem;
    font-weight: 600;
    color: white;
    margin: 0;
    font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

    i {
      color: white;
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
  color: #1f2937; /* Couleur plus foncée pour meilleur contraste */
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
  color: #1f2937; /* Couleur plus foncée pour meilleur contraste */

  &:focus {
    outline: none;
    border-color: #4338ca;
    box-shadow: 0 0 0 3px rgba(67, 56, 202, 0.1);
  }

  &:invalid {
    border-color: #dc2626;
    box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
  }

  &:disabled {
    background: #f9fafb;
    color: #6b7280;
    cursor: not-allowed;
  }
}

.config-help {
  font-size: 0.75rem;
  color: #374151; /* Couleur plus foncée pour meilleur contraste */
  margin-top: 0.25rem;
}

/* Instructions */
.instructions-section {
  margin-top: 1.5rem;
}

/* Note d'information - même style que le blog */
.info-note {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border: 1px solid #bfdbfe;
  border-radius: 0.75rem;
  color: #1e40af;
  font-size: 0.875rem;
  font-weight: 500;

  i {
    color: #3b82f6;
    font-size: 1.25rem;
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
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-radius: 0.75rem;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .stat-icon {
    width: 3rem;
    height: 3rem;
    background: linear-gradient(135deg, #4338ca 0%, #6366f1 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 1.5rem;
  }

  .stat-content {
    h3 {
      margin: 0 0 0.25rem 0;
      color: #1e293b;
      font-size: 0.875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .stat-value {
      font-size: 1.875rem;
      font-weight: 700;
      color: #4338ca;
    }
  }
}

/* Calendrier */
.calendar-section {
  padding: 0;
  overflow: hidden;

  .section-header {
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
}

.calendar-legend {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
  padding: 1rem 2rem;
  margin: 0;
  background: #f8fafc;
  border-radius: 0;
  border: 1px solid #e5e7eb;
  border-left: none;
  border-right: none;
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
    transition: all 0.2s ease;

    &:hover:not(:disabled) {
      background: #3730a3;
    }

    &:focus {
      outline: 2px solid #4338ca;
      outline-offset: 2px;
    }

    &:disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }
  }

  :deep(.fc-event) {
    border: none;
    border-radius: 0.25rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      filter: brightness(1.1);
      transform: translateY(-1px);
    }

    &:focus {
      outline: 2px solid #1f2937;
      outline-offset: 2px;
    }

    &.fc-event-accessible {
      position: relative;
    }

    &.fc-event-cancelled {
      opacity: 0.7;
      text-decoration: line-through;
    }

    &.fc-event-vacation {
      font-style: italic;
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

  // Style des événements - Simple et fonctionnel
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
  color: #374151; /* Couleur plus foncée pour meilleur contraste */

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
      color: #6b7280;
    }
  }

  h3 {
    margin: 0 0 0.5rem 0;
    color: #1f2937;
    font-size: 1.25rem;
    font-weight: 600;
  }

  p {
    margin: 0;
    font-size: 1rem;
    line-height: 1.6;
  }
}

/* Loading */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  color: white;

  .loading-spinner {
    margin-bottom: 1rem;
    
    .spinning {
      animation: spin 1s linear infinite;
      font-size: 2rem;
    }
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
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
  top: 0;
  left: 0;
  background: #4338ca;
  color: white;
  padding: 0.5rem 1rem;
  text-decoration: none;
  border-radius: 0 0 0.5rem 0.5rem;
  font-weight: 500;
  transition: all 0.2s ease;

  &:focus {
    top: 0;
    outline: 2px solid #fff;
    outline-offset: 2px;
  }

  &:hover {
    background: #3730a3;
  }
}

/* Screen reader only */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Mode contraste élevé */
@media (prefers-contrast: high) {
  .config-input {
    border: 2px solid #000;
  }
  
  .legend-color {
    border: 2px solid #000;
  }
  
  :deep(.fc-event) {
    border: 2px solid #000 !important;
  }
}

/* Mode mouvement réduit */
@media (prefers-reduced-motion: reduce) {
  .profile-section {
    transition: none;
    
    &:hover {
      transform: none;
    }
  }
  
  .stat-card {
    transition: none;
    
    &:hover {
      transform: none;
    }
  }
  
  :deep(.fc-event) {
    transition: none;
    
    &:hover {
      transform: none;
    }
  }
  
  .loading-spinner .spinning {
    animation: none;
  }
}
</style> 