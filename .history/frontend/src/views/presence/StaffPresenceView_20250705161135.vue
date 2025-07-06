<template>
  <main class="profile-container" role="main" lang="fr">
    <div class="profile-content">
      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <h3>Chargement des données</h3>
        <p>Préparation de la feuille de présence...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="store.error" class="error-state">
        <span class="material-icons">error</span>
        <div>
          <h3>Erreur de chargement</h3>
          <p>{{ store.error }}</p>
        </div>
      </div>

      <!-- Main Content -->
      <div v-else class="content-grid">
        <!-- Header Section -->
        <div class="profile-section">
          <div class="section-header">
            <div class="header-content">
              <div class="title-group">
                <h1>
                  <span class="material-icons">event_available</span>
                  Appel des présences
                </h1>
                <p class="date-label">{{ todayLabel }}</p>
              </div>
              
              <button
                v-if="sheet && !sheet.validatedAtStaff"
                class="validate-btn"
                :disabled="submitting || !sheet"
                @click="showValidationModal"
                type="button"
              >
                <span class="material-icons">
                  {{ submitting ? 'hourglass_empty' : 'check_circle' }}
                </span>
                {{ submitting ? 'Validation en cours…' : 'Valider l\'appel' }}
              </button>
            </div>
          </div>

          <!-- Status Info -->
          <div v-if="sheet" class="status-grid">
            <div class="status-item">
              <label>Statut</label>
              <span class="status-badge" :class="getStatusClass(sheet.status)">
                {{ getStatusLabel(sheet.status) }}
              </span>
            </div>
            <div v-if="sheet.validatedAtStaff" class="status-item">
              <label>Validé par</label>
              <span>{{ staffName }}</span>
            </div>
            <div v-if="sheet.validatedAtStaff" class="status-item">
              <label>Validé le</label>
              <span>{{ formatDate(sheet.validatedAtStaff) }}</span>
            </div>
          </div>
        </div>

        <!-- Statistics Section -->
        <div v-if="sheet && sheet.validatedAtStaff" class="profile-section">
          <div class="section-header">
            <h2>
              <span class="material-icons">analytics</span>
              Statistiques
            </h2>
          </div>

          <div class="stats-grid">
            <div class="stat-card present">
              <div class="stat-icon">
                <span class="material-icons">check_circle</span>
              </div>
              <div class="stat-info">
                <span class="stat-value">{{ presentCount }}</span>
                <span class="stat-label">Présents</span>
              </div>
            </div>
            <div class="stat-card absent">
              <div class="stat-icon">
                <span class="material-icons">cancel</span>
              </div>
              <div class="stat-info">
                <span class="stat-value">{{ absenceCount }}</span>
                <span class="stat-label">Absents</span>
              </div>
            </div>
            <div class="stat-card lateness">
              <div class="stat-icon">
                <span class="material-icons">schedule</span>
              </div>
              <div class="stat-info">
                <span class="stat-value">{{ latenessCount }}</span>
                <span class="stat-label">Retards</span>
              </div>
            </div>
            <div class="stat-card total">
              <div class="stat-icon">
                <span class="material-icons">group</span>
              </div>
              <div class="stat-info">
                <span class="stat-value">{{ sheet.records.length }}</span>
                <span class="stat-label">Total</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Children List Section -->
        <div v-if="sheet" class="profile-section">
          <div class="section-header">
            <h2>
              <span class="material-icons">group</span>
              Liste des enfants ({{ sheet.records.length }})
            </h2>
            <div v-if="!sheet.validatedAtStaff" class="info-note">
              <span class="material-icons">info</span>
              <span>Cochez les enfants présents puis validez l'appel</span>
            </div>
          </div>

          <!-- GridJS Table -->
          <div 
            v-if="sheet.records.length > 0" 
            ref="gridContainer" 
            class="grid-container"
          ></div>

          <!-- Empty State -->
          <div v-if="sheet.records.length === 0" class="empty-state">
            <span class="material-icons">group_off</span>
            <p>Aucun enfant inscrit</p>
            <small>Contactez l'administration</small>
          </div>
        </div>

        <!-- No Sheet State -->
        <div v-if="!loading && !sheet" class="profile-section">
          <div class="empty-state">
            <span class="material-icons">event_busy</span>
            <p>Aucune feuille de présence</p>
            <small>La feuille sera créée automatiquement</small>
          </div>
        </div>
      </div>
    </div>

    <!-- Validation Modal -->
    <ValidatePresenceModal
      :is-open="showModal"
      :present-count="presentCount"
      :absent-count="absenceCount"
      :total-count="sheet?.records.length || 0"
      :date="todayIso"
      :loading="submitting"
      @close="closeModal"
      @confirm="confirmValidation"
    />
  </main>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, nextTick, watch } from 'vue'
import { Grid, html } from 'gridjs'
import { usePresenceStore } from '@/stores/presenceStore'
import { useNotificationStore } from '@/stores/notificationStore'
import ValidatePresenceModal from '@/components/presence/ValidatePresenceModal.vue'
import 'gridjs/dist/theme/mermaid.css'

const store  = usePresenceStore()
const notify = useNotificationStore()

// Grid reference
const gridContainer = ref<HTMLElement>()
let grid: Grid | null = null

// Modal state
const showModal = ref(false)

// Today's ISO and formatted label
const todayIso   = new Date().toISOString().substring(0, 10)
const todayLabel = computed(() =>
  new Date(todayIso).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day:     '2-digit',
    month:   'long',
    year:    'numeric',
  })
)

// Reactive state & store bindings
const sheet      = computed(() => store.sheet)
const loading    = computed(() => store.loading)
const submitting = ref(false)

// Display staff name from the sheet
const staffName = computed(() => {
  if (sheet.value?.staff?.staffProfile) {
    const profile = sheet.value.staff.staffProfile
    return `${profile.firstName} ${profile.lastName}`
  }
  return 'Équipe'
})

const presentCount  = computed(() => sheet.value?.records.filter(r => r.present).length || 0)
const latenessCount = computed(() => sheet.value?.records.filter(r => r.justification?.type === 'LATENESS').length || 0)
const absenceCount  = computed(() => sheet.value?.records.filter(r => !r.present && r.justification?.type === 'ABSENCE').length || 0)

// Style helpers
function getStatusClass(status: string) {
  switch (status) {
    case 'PENDING_STAFF': return 'status-pending-staff'
    case 'PENDING_SECRETARY': return 'status-pending-secretary'
    case 'VALIDATED': return 'status-validated'
    default: return ''
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'PENDING_STAFF': return 'En attente de validation'
    case 'PENDING_SECRETARY': return 'Validé - En attente secrétaire'
    case 'VALIDATED': return 'Entièrement validé'
    default: return status
  }
}

// Date formatter for display
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day:    '2-digit',
    month:  '2-digit',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  })
}

// GridJS setup
function initGrid() {
  if (!gridContainer.value || !sheet.value || !sheet.value.records || sheet.value.records.length === 0) {
    console.log('initGrid: conditions not met', { 
      hasContainer: !!gridContainer.value, 
      hasSheet: !!sheet.value,
      hasRecords: !!sheet.value?.records,
      recordsLength: sheet.value?.records?.length
    })
    return
  }
  
  console.log('initGrid: initializing with', sheet.value.records.length, 'records')

  // Debug: Vérification de la structure des records
  if (sheet.value.records.length > 0 && !sheet.value.records[0].childId) {
    console.warn('⚠️ childId manquant dans les records de présence')
  }

  // Destroy existing grid
  if (grid) {
    grid.destroy()
    grid = null
  }

  const isValidated = sheet.value.validatedAtStaff

    // Prepare data pour STAFF - seulement nom, prénom, childId, présent
  const data = sheet.value.records.map(rec => [
    rec.child.lastName,    // index 0
    rec.child.firstName,   // index 1  
    rec.childId,          // index 2
    rec.present           // index 3
  ])
  
  console.log('GridJS data prepared for STAFF:', data)

  // Define columns pour STAFF - seulement les données nécessaires
  const columns = [
    { 
      name: 'Nom', 
      width: '30%'
    },
    { 
      name: 'Prénom', 
      width: '30%'
    },
    {
      name: 'childId',
      hidden: true
    },
    {
      name: 'Présent',
      width: '40%',
      formatter: (cell: any, row: any) => {
        const isPresent = cell
        
        // Récupération du childId depuis les données de la ligne
        let childId = row.cells?.[2]?.data || row._data?.[2] || row.data?.[2]
        
        if (childId === undefined || childId === null) {
          console.error('⚠️ childId manquant pour cette ligne:', row)
          return html(`<span style="color: red; font-family: Satoshi;">ID manquant</span>`)
        }
        
        if (isValidated) {
          // Mode lecture seule après validation - pour le staff, juste présent/absent
          if (isPresent) {
            return html(`<span class="badge badge-present"><i class="material-icons" style="color: #16a34a;">check_circle</i> Présent</span>`)
          } else {
            return html(`<span class="badge badge-absent"><i class="material-icons" style="color: #dc2626;">cancel</i> Absent</span>`)
          }
        } else {
          // Mode édition avec checkbox
          const childIdNum = parseInt(String(childId), 10)
          
          // Vérifier si cet enfant est marqué comme présent
          const isCurrentlyPresent = store.presentChildIds.includes(childIdNum)
          const checked = isCurrentlyPresent ? 'checked' : ''
          
          const checkboxId = `presence-${childId}`
          const labelId = `label-${childId}`
          
          return html(`
            <div class="checkbox-container">
              <input 
                type="checkbox" 
                id="${checkboxId}"
                value="${childId}" 
                ${checked}
                onchange="handlePresenceChange('${childId}', this.checked, event)"
                class="presence-checkbox"
                data-child-id="${childIdNum}"
                aria-describedby="${labelId}"
                aria-label="Marquer ${row.cells[0].data} ${row.cells[1].data} comme ${isCurrentlyPresent ? 'présent' : 'absent'}"
              />
              <label for="${checkboxId}" id="${labelId}" class="checkbox-label">
                ${isCurrentlyPresent ? 'Présent' : 'Absent'}
              </label>
            </div>
          `)
        }
      }
    }
  ]

  // Pour le STAFF, pas de colonne justification
  // Les justifications sont gérées par la secrétaire après validation

  // Create grid
  grid = new Grid({
    columns,
    data,
    search: true,
    sort: true,
    pagination: {
      limit: 20,
      summary: true
    },
    language: {
      search: {
        placeholder: 'Rechercher un enfant par nom ou prénom...'
      },
      pagination: {
        previous: 'Précédent',
        next: 'Suivant',
        showing: 'Affichage de',
        to: 'à',
        of: 'des',
        results: () => 'résultats'
      },
      loading: 'Chargement...',
      noRecordsFound: 'Aucun enfant trouvé',
      error: 'Erreur lors du chargement des données'
    },
    className: {
      container: 'grid-wrapper',
      table: 'grid-table',
      th: 'grid-header',
      td: 'grid-cell'
    },
    style: {
      table: {
        'border-collapse': 'separate',
        'border-spacing': '0'
      }
    }
  })

  grid.render(gridContainer.value)
  
  // Ajouter l'icône de loupe après le rendu
  setTimeout(() => {
    const searchContainer = gridContainer.value?.querySelector('.gridjs-search') as HTMLElement
    if (searchContainer && !searchContainer.querySelector('.search-icon')) {
      const icon = document.createElement('i')
      icon.className = 'material-icons search-icon'
      icon.textContent = 'search'
      icon.setAttribute('aria-hidden', 'true')
      searchContainer.style.position = 'relative'
      searchContainer.appendChild(icon)
    }
  }, 100)
}

// Global function for checkbox handling
function setupGlobalCheckboxHandler() {
  ;(window as any).handlePresenceChange = (childId: string, checked: boolean, event: Event) => {
    // Convert childId to number to match store type
    const childIdNum = parseInt(childId, 10)
    
    console.log('handlePresenceChange called:', { childId, childIdNum, checked, currentPresentIds: [...store.presentChildIds] })
    
    if (checked) {
      if (!store.presentChildIds.includes(childIdNum)) {
        store.presentChildIds.push(childIdNum)
        console.log('Added child to present list:', childIdNum)
      }
    } else {
      const index = store.presentChildIds.indexOf(childIdNum)
      if (index > -1) {
        store.presentChildIds.splice(index, 1)
        console.log('Removed child from present list:', childIdNum)
      }
    }
    
    console.log('Updated present IDs:', [...store.presentChildIds])
    
    // Update only the specific checkbox label that was clicked
    const checkbox = event?.target as HTMLInputElement
    if (checkbox) {
      const label = checkbox.nextElementSibling
      if (label) {
        label.textContent = checkbox.checked ? 'Présent' : 'Absent'
      }
    }
    
    // Force refresh of all checkboxes on current page to ensure consistency
    setTimeout(() => {
      const allCheckboxes = document.querySelectorAll('.presence-checkbox')
      allCheckboxes.forEach((cb: any) => {
        const cbChildId = parseInt(cb.getAttribute('data-child-id'), 10)
        const shouldBeChecked = store.presentChildIds.includes(cbChildId)
        if (cb.checked !== shouldBeChecked) {
          cb.checked = shouldBeChecked
          const label = cb.nextElementSibling
          if (label) {
            label.textContent = shouldBeChecked ? 'Présent' : 'Absent'
          }
        }
      })
    }, 50)
  }
}

// Modal handlers
function showValidationModal() {
  if (!sheet.value) return
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

async function confirmValidation() {
  if (!sheet.value) return

  submitting.value = true
  try {
    await store.validateSheet()
    notify.showNotification('Appel validé avec succès', 'success')
    showModal.value = false
    // Refresh grid with new data
    await nextTick()
    initGrid()
  } catch (err: any) {
    notify.showNotification(err?.message || 'Erreur lors de la validation', 'error')
  } finally {
    submitting.value = false
  }
}

// Watch for sheet changes to reinitialize grid
watch(sheet, async (newSheet) => {
  if (newSheet && newSheet.records.length > 0) {
    await nextTick()
    initGrid()
  }
}, { immediate: true })

// On mount, setup and fetch data
onMounted(async () => {
  setupGlobalCheckboxHandler()
  store.setDate(todayIso)
  await store.fetchSheet()
})
</script>

<style scoped>
/* Base Container */
.profile-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
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
  gap: 1.5rem;
}

/* Loading & Error States */
.loading-state, .error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  text-align: center;
  gap: 1rem;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e2e8f0;
  border-top: 3px solid #4f46e5;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-state {
  color: #dc2626;
}

.error-state .material-icons {
  font-size: 3rem;
  color: #dc2626;
}

/* Section Styles */
.profile-section {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
}

.section-header {
  margin-bottom: 1.5rem;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.title-group h1 {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.75rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 0.5rem 0;
}

.title-group .material-icons {
  color: #4f46e5;
  font-size: 2rem;
}

.date-label {
  color: #6b7280;
  font-size: 1rem;
  margin: 0;
}

.section-header h2 {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.section-header .material-icons {
  color: #4f46e5;
  font-size: 1.5rem;
}

/* Validate Button */
.validate-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.validate-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
}

.validate-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* Status Grid */
.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.status-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.status-item label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-item span {
  font-weight: 600;
  color: #1f2937;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  width: fit-content;
}

.status-pending-staff {
  background: #fef3c7;
  color: #92400e;
}

.status-pending-secretary {
  background: #fed7aa;
  color: #ea580c;
}

.status-validated {
  background: #d1fae5;
  color: #059669;
}

/* Statistics Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid;
}

.stat-card.present {
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.stat-card.absent {
  background: #fef2f2;
  border-color: #fecaca;
}

.stat-card.lateness {
  background: #fffbeb;
  border-color: #fed7aa;
}

.stat-card.total {
  background: #f8fafc;
  border-color: #e2e8f0;
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-card.present .stat-icon {
  background: #dcfce7;
  color: #16a34a;
}

.stat-card.absent .stat-icon {
  background: #fee2e2;
  color: #dc2626;
}

.stat-card.lateness .stat-icon {
  background: #fef3c7;
  color: #d97706;
}

.stat-card.total .stat-icon {
  background: #e2e8f0;
  color: #64748b;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
}

.stat-label {
  font-size: 0.875rem;
  color: #6b7280;
}

/* Info Note */
.info-note {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: #f3f4f6;
  border-radius: 8px;
  font-size: 0.875rem;
  color: #4b5563;
}

.info-note .material-icons {
  font-size: 1rem;
  color: #6b7280;
}

/* Grid Container */
.grid-container {
  margin-top: 1rem;
}

/* Grid Styles */
:deep(.gridjs-wrapper) {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}

:deep(.gridjs-head) {
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

:deep(.gridjs-th) {
  padding: 1rem;
  font-weight: 600;
  color: #374151;
  border-right: 1px solid #e2e8f0;
}

:deep(.gridjs-td) {
  padding: 1rem;
  border-right: 1px solid #f3f4f6;
  border-bottom: 1px solid #f3f4f6;
}

:deep(.gridjs-tr):hover {
  background: #f9fafb;
}

/* Checkbox Styles */
:deep(.checkbox-container) {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

:deep(.presence-checkbox) {
  width: 18px;
  height: 18px;
  border: 2px solid #6b7280;
  border-radius: 4px;
  cursor: pointer;
}

:deep(.presence-checkbox:checked) {
  background: #4f46e5;
  border-color: #4f46e5;
}

:deep(.checkbox-label) {
  font-weight: 500;
  color: #374151;
  cursor: pointer;
}

/* Badge Styles */
:deep(.badge) {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
}

:deep(.badge-present) {
  background: #dcfce7;
  color: #16a34a;
}

:deep(.badge-absent) {
  background: #fee2e2;
  color: #dc2626;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: #6b7280;
}

.empty-state .material-icons {
  font-size: 3rem;
  color: #9ca3af;
  margin-bottom: 1rem;
}

.empty-state p {
  font-size: 1.125rem;
  font-weight: 500;
  margin: 0 0 0.5rem 0;
}

.empty-state small {
  color: #9ca3af;
}

/* Responsive */
@media (max-width: 768px) {
  .profile-content {
    padding: 0 0.5rem;
  }
  
  .header-content {
    flex-direction: column;
    align-items: stretch;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .status-grid {
    grid-template-columns: 1fr;
  }
}
</style>


