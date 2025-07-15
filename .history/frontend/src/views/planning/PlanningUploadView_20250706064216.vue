<!-- src/views/planning/PlanningUploadView.vue -->
<template>
  <main class="profile-container" role="main">
    <!-- Skip links pour accessibilité -->
    <div class="skip-links">
      <a href="#main-content" class="skip-link">Aller au contenu principal</a>
      <a href="#semester-selection" class="skip-link">Aller à la sélection semestre</a>
      <a href="#file-upload" class="skip-link">Aller à l'upload fichier</a>
      <a href="#calendar-view" class="skip-link">Aller au calendrier</a>
    </div>

    <!-- Content -->
    <div class="profile-content" id="main-content">
              <div class="content-grid">
        
        <!-- En-tête principal moderne -->
        <PageHeader
          title="Planning Semestriel"
          subtitle="Import et gestion des emplois du temps pour tous les éducateurs"
          icon="upload_file"
          :status-text="selectedSemesterId && hasExistingPlanning ? 'Planning validé' : selectedSemesterId && file ? 'Prêt à importer' : ''"
          :status-icon="selectedSemesterId && hasExistingPlanning ? 'check_circle' : selectedSemesterId && file ? 'cloud_upload' : ''"
          :status-class="selectedSemesterId && hasExistingPlanning ? 'status-success' : selectedSemesterId && file ? 'status-info' : ''"
        />

        <!-- Configuration et import -->
        <section class="profile-section" id="semester-selection" aria-labelledby="config-title">
          <div class="section-header">
            <h2 id="config-title">
              <i class="material-icons" aria-hidden="true">settings</i>
              Configuration et Import
            </h2>
          </div>

          <div class="config-grid">
            <!-- Sélection semestre -->
            <div class="config-item">
              <label for="semester-select" class="config-label">
                <i class="material-icons">event</i>
                Semestre cible
              </label>
              <select
                id="semester-select"
                v-model="selectedSemesterId"
                @change="onSemesterChange"
                class="config-input"
                :disabled="loading"
                aria-describedby="semester-help"
                :aria-invalid="!selectedSemesterId && error ? 'true' : 'false'"
              >
                <option disabled value="">— Choisir un semestre —</option>
                <option v-for="s in semesters" :key="s.id" :value="s.id">
                  {{ s.name }}
                </option>
              </select>
              <small id="semester-help" class="config-help">Le planning sera appliqué à ce semestre</small>
            </div>

            <!-- Upload fichier ou planning existant -->
            <div class="config-item" id="file-upload">
              <label for="file-input" class="config-label">
                <i class="material-icons">attach_file</i>
                {{ hasExistingPlanning ? 'Planning existant' : 'Fichier Excel du planning' }}
              </label>
              
              <!-- Planning existant -->
              <div v-if="hasExistingPlanning" class="existing-planning-info">
                <div class="existing-file-display">
                  <div class="file-icon">
                    <i class="material-icons">description</i>
                  </div>
                  <div class="file-details">
                    <h4>Planning validé</h4>
                    <p>Un planning Excel a déjà été importé pour ce semestre</p>
                    <div class="file-actions">
                      <a 
                        v-if="hasFile"
                        :href="planning.downloadUrl"
                        download
                        class="btn btn-outline btn-sm"
                      >
                        <i class="material-icons">download</i>
                        Télécharger
                      </a>
                    </div>
                  </div>
                </div>
                
                <!-- Option pour remplacer le planning -->
                <details class="replace-planning" @toggle="onToggleReplace">
                  <summary :aria-expanded="isReplaceOpen ? 'true' : 'false'">
                    Remplacer le planning existant
                  </summary>
                  <div class="file-upload-area">
                    <input 
                      id="file-input"
                      type="file" 
                      @change="onFileChange" 
                      accept=".xlsx,.xls"
                      class="file-input"
                      :disabled="loading"
                      aria-describedby="file-help"
                      :aria-invalid="!file && error ? 'true' : 'false'"
                    />
                    <div class="file-upload-info">
                      <i class="material-icons" aria-hidden="true">cloud_upload</i>
                      <span v-if="!file">Sélectionner un nouveau fichier Excel</span>
                      <span v-else>{{ file.name }}</span>
                    </div>
                  </div>
                </details>
              </div>
              
              <!-- Upload initial -->
              <div v-else class="file-upload-area">
                <input 
                  id="file-input"
                  type="file" 
                  @change="onFileChange" 
                  accept=".xlsx,.xls"
                  class="file-input"
                  :disabled="loading"
                  aria-describedby="file-help"
                  :aria-invalid="!file && error ? 'true' : 'false'"
                />
                <div class="file-upload-info">
                  <i class="material-icons" aria-hidden="true">cloud_upload</i>
                  <span v-if="!file">Sélectionner un fichier Excel (.xlsx, .xls)</span>
                  <span v-else>{{ file.name }}</span>
                </div>
              </div>
              
              <small id="file-help" class="config-help">Format attendu : 5 onglets (Lundi à Vendredi) avec éducateurs en lignes</small>
            </div>
          </div>

          <!-- Actions principales -->
          <div class="action-section">
            <div class="action-buttons">
              <button 
                @click="importAll" 
                :disabled="!canImport || loading"
                class="btn btn-success"
                :aria-label="loading ? 'Traitement en cours, veuillez patienter' : 'Importer le fichier Excel dans le planning'"
              >
                <i class="material-icons" aria-hidden="true">save</i>
                {{ loading ? 'Traitement...' : 'Importer le planning' }}
              </button>

              <a
                v-if="hasFile"
                :href="planning.downloadUrl"
                download
                class="btn btn-outline"
                aria-label="Télécharger le fichier Excel du planning"
              >
                <i class="material-icons" aria-hidden="true">download</i>
                Télécharger Excel
              </a>
            </div>

            <!-- Validation finale -->
            <button 
              v-if="canSubmit"
              @click="submitPlanning"
              :disabled="loading"
              class="btn btn-validate"
              aria-label="Valider définitivement le planning pour le semestre"
            >
              <i class="material-icons" aria-hidden="true">check_circle</i>
              Valider le planning final
            </button>
          </div>

          <!-- Messages d'erreur -->
          <div v-if="error" class="error-message" role="alert" aria-live="polite">
            <i class="material-icons" aria-hidden="true">error</i>
            <div class="error-content">
              <strong>Planning incomplet</strong>
              <div class="error-details">
                <p v-if="formattedError.hasDetails">{{ formattedError.message }}</p>
                <ul v-if="formattedError.details.length > 0" style="margin-top: 0.5rem; padding-left: 1.5rem;">
                  <li v-for="detail in formattedError.details" :key="detail">{{ detail }}</li>
                </ul>
                <p v-if="formattedError.helpText" style="margin-top: 0.5rem; font-size: 0.9em; color: #6b7280;">
                  {{ formattedError.helpText }}
                </p>
                <p v-if="!formattedError.hasDetails">{{ formattedError.message }}</p>
              </div>
            </div>
          </div>

          <!-- Loading indicator -->
          <div v-if="loading" class="loading-indicator" aria-live="polite">
            <i class="material-icons spinning" aria-hidden="true">hourglass_empty</i>
            <span>Traitement en cours...</span>
          </div>
        </section>

        <!-- Statistiques du planning -->
        <section v-if="previewEntries.length" class="profile-section" aria-labelledby="stats-title">
          <div class="section-header">
            <h2 id="stats-title">
              <i class="material-icons">analytics</i>
              Statistiques du planning
            </h2>
          </div>

          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon">
                <i class="material-icons">event</i>
              </div>
              <div class="stat-content">
                <h3>Total créneaux</h3>
                <div class="stat-value">{{ totalSlots }}</div>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon">
                <i class="material-icons">people</i>
              </div>
              <div class="stat-content">
                <h3>Éducateurs</h3>
                <div class="stat-value">{{ uniqueStaff }}</div>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon">
                <i class="material-icons">child_care</i>
              </div>
              <div class="stat-content">
                <h3>Enfants</h3>
                <div class="stat-value">{{ uniqueChildren }}</div>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon">
                <i class="material-icons">beach_access</i>
              </div>
              <div class="stat-content">
                <h3>Vacances/Fériés</h3>
                <div class="stat-value">{{ vacationSlots }}</div>
              </div>
            </div>
          </div>
        </section>

        <!-- Sélection éducateur -->
        <section v-if="previewEntries.length || hasExistingPlanning" class="profile-section" aria-labelledby="staff-title">
          <div class="section-header">
            <h2 id="staff-title">
              <i class="material-icons">person</i>
              Visualisation par éducateur
            </h2>
          </div>

          <div class="staff-selection">
            <label for="staff-select" class="config-label">
              <i class="material-icons">group</i>
              Choisir un éducateur
            </label>
            <select id="staff-select" v-model="selectedStaffId" class="config-input">
              <option disabled value="">— Sélectionner un éducateur —</option>
              <option
                v-for="st in staffList"
                :key="st.userId"
                :value="st.userId"
              >{{ st.firstName }} {{ st.lastName }}</option>
            </select>
          </div>
        </section>

        <!-- Calendrier -->
        <section v-if="calendarOptions.events.length" class="profile-section calendar-section" id="calendar-view" aria-labelledby="calendar-title">
          <div class="section-header">
            <h2 id="calendar-title">
              <i class="material-icons">calendar_view_month</i>
              Planning {{ selectedStaffName }}
            </h2>
            <div class="calendar-legend">
              <div class="legend-item">
                <div class="legend-color normal"></div>
                <span>Cours normal</span>
              </div>
              <div class="legend-item">
                <div class="legend-color vacation"></div>
                <span>Vacances/Férié</span>
              </div>
              <div class="legend-item">
                <div class="legend-color cancelled"></div>
                <span>Cours annulé</span>
              </div>
            </div>
          </div>

          <div class="calendar-wrapper">
            <FullCalendar
              ref="fcRef"
              :options="calendarOptions"
            />
          </div>
        </section>
      </div>
    </div>

    <!-- Modale détails cours -->
    <CourseDetailsModal
      v-if="showModal"
      :course="selectedCourse"
      :staff-name="selectedStaffName"
      @close="closeModal"
    />
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import FullCalendar from '@fullcalendar/vue3'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin from '@fullcalendar/daygrid'
import frLocale from '@fullcalendar/core/locales/fr'
import { usePlanningStore } from '@/stores/planning'
import { useAuthStore } from '@/stores/auth'
import CourseDetailsModal from '../../components/planning/CourseDetailsModal.vue'
import PageHeader from '@/components/PageHeader.vue'

/** Store & états locaux **/
const planning = usePlanningStore()
const auth = useAuthStore()
const file = ref<File|null>(null)
const selectedSemesterId = ref<string>('')
const selectedStaffId = ref<string>('')
const showModal = ref(false)
const selectedCourse = ref<any>(null)
const isReplaceOpen = ref(false)

/** Données du store **/
const semesters = computed(() => planning.semesters)
const staffList = computed(() => planning.staffList)
const previewEntries = computed(() => planning.previewEntries)
const error = computed(() => planning.error)
const loading = computed(() => planning.loading)
const hasFile = computed(() => planning.downloadUrl !== '')
const selectedSemester = computed(() => planning.selectedSemester)

/** Nom de l'éducateur sélectionné **/
const selectedStaffName = computed(() => {
  const staff = staffList.value.find(s => s.userId === selectedStaffId.value)
  return staff ? `${staff.firstName} ${staff.lastName}` : ''
})

/** Logique de planning existant **/
const hasExistingPlanning = computed(() => 
  previewEntries.value.length > 0 && !file.value
)

/** Formatage de l'erreur pour affichage lisible **/
const formattedError = computed(() => {
  if (!error.value) return { hasDetails: false, message: '', details: [] }
  
  try {
    const errorObj = JSON.parse(error.value)
    if (errorObj.details && Array.isArray(errorObj.details)) {
      return {
        hasDetails: true,
        message: 'Les enfants suivants n\'ont pas de créneaux complets :',
        details: errorObj.details.map((detail: string) => 
          // Échapper les caractères HTML dangereux
          detail.replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#x27;')
        ),
        helpText: 'Veuillez vérifier votre fichier Excel et vous assurer que tous les enfants ont des créneaux pour chaque jour de la semaine.'
      }
    }
  } catch (e) {
    // Si ce n'est pas du JSON, afficher l'erreur telle quelle (échappée)
  }
  
  return {
    hasDetails: false,
    message: error.value?.replace(/&/g, '&amp;')
                      .replace(/</g, '&lt;')
                      .replace(/>/g, '&gt;')
                      .replace(/"/g, '&quot;')
                      .replace(/'/g, '&#x27;') || '',
    details: [],
    helpText: ''
  }
})

/** Contrôles des boutons **/
const canImport = computed(() =>
  !!file.value && selectedSemesterId.value !== '' && !loading.value
)
const canSubmit = computed(() =>
  previewEntries.value.length > 0 && !loading.value
)

/** Statistiques **/
const totalSlots = computed(() => previewEntries.value.length)
const uniqueStaff = computed(() => {
  const staffIds = new Set(previewEntries.value.map(e => e.staffId))
  return staffIds.size
})
const uniqueChildren = computed(() => {
  const childIds = new Set()
  previewEntries.value.forEach(e => {
    e.children.forEach(c => childIds.add(c.id))
  })
  return childIds.size
})
const vacationSlots = computed(() => {
  return previewEntries.value.filter(e => 
    e.activity.toLowerCase().includes('vacances') || 
    e.activity.toLowerCase().includes('férié')
  ).length
})

/** Events du calendrier **/
const calendarEvents = computed(() => {
  const raw = previewEntries.value
    .filter(e => e.staffId === selectedStaffId.value)
    .map(e => {
      const isVacation = isVacationOrHoliday(e.activity)
      
      // Le backend gère déjà les heures correctes (8h-16h pour les vacances)
      return {
        id: e.id,
        title: e.activity,
        start: e.startTime,
        end: e.endTime,
        // Ne jamais mettre allDay pour éviter l'affichage "Toute la journée"
        color: getEventColor(e.activity),
        extendedProps: { 
          children: e.children, 
          cancelled: e.activity.startsWith('Annulé –'),
          vacation: isVacation,
          originalStart: e.startTime, // Garder les horaires originaux
          originalEnd: e.endTime
        },
      }
    })

  // Grouper par jour pour l'affichage vue mensuelle
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

/** Fonctions utilitaires **/
function isVacationOrHoliday(activity: string): boolean {
  const act = activity.toLowerCase()
  return act.includes('vacances') || act.includes('férié')
}

function getEventColor(activity: string): string {
  if (activity.startsWith('Annulé –')) return '#B0BEC5'
  if (isVacationOrHoliday(activity)) return '#FFB74D'
  return '#4338ca'
}

/** Options FullCalendar **/
const calendarOptions = ref({
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
  scrollTime: '08:00:00',
  initialDate: undefined as string|undefined,
  height: 'auto',
  allDaySlot: false, // Masquer complètement la ligne "Toute la journée"
  allDayText: '', // Supprimer le texte "Toute la journée"
  eventContent(info: any) {
    if (info.view.type === 'dayGridMonth') {
      if (!info.event.extendedProps.showLabel) {
        return { domNodes: [] }
      }
      const act = (info.event.title ?? '').toLowerCase()
      let label = 'Journée de cours'
      let bgColor = '#4338ca' // bleu pour les cours
      let textColor = 'white'
      
      if (act.includes('férié')) {
        label = 'Jour férié'
        bgColor = '#FFB74D' // jaune pour fériés
        textColor = 'black'
      } else if (act.includes('vacances')) {
        label = 'Vacances scolaires'
        bgColor = '#FFB74D' // jaune pour vacances
        textColor = 'black'
      } else if (act.startsWith('annulé –')) {
        label = 'Cours annulé'
        bgColor = '#B0BEC5' // gris pour annulé
        textColor = 'black'
      }
      
      return { 
        html: `<div class="calendar-event-label" style="background-color: ${bgColor}; color: ${textColor}; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">${label}</div>` 
      }
    }
    return true
  },
  eventClick(info: any) {
    const kids = info.event.extendedProps.children || []
    
    // Toujours utiliser les horaires originaux pour éviter les problèmes de timezone
    const originalEntry = previewEntries.value.find(e => e.id === info.event.id)
    
    selectedCourse.value = {
      title: info.event.title,
      start: originalEntry ? new Date(originalEntry.startTime) : info.event.start,
      end: originalEntry ? new Date(originalEntry.endTime) : info.event.end,
      children: kids,
      cancelled: info.event.extendedProps.cancelled,
      vacation: info.event.extendedProps.vacation
    }
    showModal.value = true
  },
  events: [] as any[],
})

/** Réf vers le composant FullCalendar **/
const fcRef = ref<InstanceType<typeof FullCalendar> | null>(null)

/** Actions **/
function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  file.value = target.files?.[0] || null
}

function onSemesterChange() {
  planning.selectSemester(selectedSemesterId.value)
  calendarOptions.value.events = []
}

async function importAll() {
  if (!file.value) return
  await planning.importAll(file.value)
}

async function submitPlanning() {
  await planning.submitPlanning()
}

function closeModal() {
  showModal.value = false
  selectedCourse.value = null
}

function onToggleReplace(event: Event) {
  const details = event.target as HTMLDetailsElement
  isReplaceOpen.value = details.open
}

/** Watchers **/
watch(selectedSemesterId, async id => {
  const sem = planning.semesters.find(s => s.id === id)
  if (!sem) return

  calendarOptions.value.initialDate = sem.startDate
  if (fcRef.value) {
    const api = fcRef.value.getApi()
    api.gotoDate(sem.startDate)
  }

  // Vérifier s'il y a déjà un planning pour ce semestre
  planning.selectSemester(id)
  await planning.fetchOverview()
  await planning.downloadAll()
})

watch(calendarEvents, events => {
  calendarOptions.value.events = events
})

/** Lifecycle **/
onMounted(async () => {
  if (!semesters.value.length) await planning.fetchSemesters()
  if (!staffList.value.length) await planning.fetchStaffList()
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
  border-bottom: 1px solid #e5e7eb;
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

.info-note {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: #f8fafc;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
  color: #6b7280;
  font-size: 0.875rem;

  .material-icons {
    color: #4338ca;
    font-size: 1rem;
  }
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
  border-bottom: 1px solid #e5e7eb;

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

  &:disabled {
    background: #f9fafb;
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.config-help {
  color: #6b7280;
  font-size: 0.875rem;
  line-height: 1.4;
}

/* Upload de fichier */
.file-upload-area {
  position: relative;
  border: 2px dashed #d1d5db;
  border-radius: 0.5rem;
  padding: 1.5rem;
  text-align: center;
  transition: all 0.2s ease;

  &:hover {
    border-color: #4338ca;
    background: #f8fafc;
  }
}

/* Planning existant */
.existing-planning-info {
  .existing-file-display {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.5rem;
    background: #f0f9ff;
    border: 1px solid #bae6fd;
    border-radius: 0.5rem;
    margin-bottom: 1rem;

    .file-icon {
      width: 3rem;
      height: 3rem;
      background: #0ea5e9;
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      i {
        color: white;
        font-size: 1.5rem;
      }
    }

    .file-details {
      flex: 1;

      h4 {
        margin: 0 0 0.25rem 0;
        color: #0c4a6e;
        font-weight: 600;
      }

      p {
        margin: 0 0 0.75rem 0;
        color: #075985;
        font-size: 0.875rem;
      }

      .file-actions {
        display: flex;
        gap: 0.5rem;
      }
    }
  }

  .replace-planning {
    summary {
      cursor: pointer;
      padding: 0.75rem;
      background: #fef3c7;
      border: 1px solid #fcd34d;
      border-radius: 0.375rem;
      font-weight: 500;
      color: #92400e;
      margin-bottom: 0.75rem;

      &:hover {
        background: #fef3c7;
      }
    }

    .file-upload-area {
      margin-top: 0.75rem;
    }
  }
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

.file-input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
  }
}

.file-upload-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: #6b7280;
  font-weight: 500;

  i {
    font-size: 1.5rem;
    color: #4338ca;
  }
}

/* Actions */
.action-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e2e8f0;
}

.action-buttons {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

/* Boutons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 0.875rem;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s ease;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
  }

  &:not(:disabled):hover {
    transform: translateY(-1px);
  }
}

.btn-primary {
  background: #4338ca;
  color: white;

  &:hover:not(:disabled) {
    background: #3730a3;
  }
}

.btn-success {
  background: #10b981;
  color: white;

  &:hover:not(:disabled) {
    background: #059669;
  }
}

.btn-outline {
  background: white;
  color: #4338ca;
  border: 1px solid #4338ca;

  &:hover:not(:disabled) {
    background: #4338ca;
    color: white;
  }
}

.btn-validate {
  background: #059669;
  color: white;
  font-size: 1rem;
  padding: 1rem 2rem;
  align-self: center;

  &:hover:not(:disabled) {
    background: #047857;
  }
}

/* Messages */
.error-message {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 0.5rem;
  color: #b91c1c;

  i {
    color: #dc2626;
    font-size: 1.25rem;
    margin-top: 0.125rem;
  }
}

.error-content {
  flex: 1;

  strong {
    display: block;
    margin-bottom: 0.25rem;
  }

  p {
    margin: 0;
    font-size: 0.875rem;
  }
}

.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1rem;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 0.5rem;
  color: #0369a1;
  font-weight: 500;

  i {
    font-size: 1.25rem;
  }
}

.spinning {
  animation: spin 1s linear infinite;
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

/* Sélection staff */
.staff-selection {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-width: 400px;
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

  &.vacation {
    background: #FFB74D;
  }

  &.cancelled {
    background: #B0BEC5;
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

  :deep(.calendar-event-label) {
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
    background: rgba(255, 255, 255, 0.9);
    color: #374151;
    display: block;
    text-align: center;
    border: none !important;
    width: 100%;
    box-sizing: border-box;
  }
}

/* Header moderne pour planning */
.planning-header {
  background: #4444ac;
  padding: 2rem 2rem;
  border-radius: 1rem;
  margin-bottom: 2rem;
  box-shadow: 0 10px 30px rgba(68, 68, 172, 0.3);
  position: relative;
  overflow: hidden;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  z-index: 1;
}

.title-section {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.planning-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 4rem;
  height: 4rem;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 1rem;
  backdrop-filter: blur(10px);
}

.planning-icon i {
  font-size: 2rem;
  color: white;
}

.title-info h1 {
  font-size: 2.25rem;
  font-weight: 700;
  margin: 0;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.title-info .subtitle {
  color: rgba(255, 255, 255, 0.9);
  font-size: 1.125rem;
  margin: 0.5rem 0 0 0;
  font-weight: 500;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.5rem;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 2rem;
  backdrop-filter: blur(10px);
  font-weight: 600;
  color: white;
}

.status-indicator i {
  font-size: 1.25rem;
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

/* Animations */
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
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

  .action-buttons {
    flex-direction: column;
  }

  .calendar-legend {
    justify-content: center;
  }

  .calendar-wrapper {
    padding: 0 1rem 1rem 1rem;
  }
}
</style>
