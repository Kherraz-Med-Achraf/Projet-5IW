<template>
  <div class="profile-container">
    <!-- Content -->
    <div class="profile-content">
      <div class="content-grid">
        <!-- En-tête avec date et action -->
        <div class="profile-section">
          <div class="section-header">
            <h2>
              <i class="material-icons" aria-hidden="true">event_available</i>
              Appel des présences – {{ todayLabel }}
            </h2>
            <button
              v-if="!sheet?.validatedAtStaff"
              class="edit-btn"
              :disabled="submitting || !sheet"
              @click="onValidate"
              type="button"
              aria-label="Valider l'appel des présences"
            >
              <i class="material-icons" aria-hidden="true">
                {{ submitting ? 'hourglass_empty' : 'check_circle' }}
              </i>
              {{ submitting ? 'Validation en cours…' : 'Valider l\'appel' }}
            </button>
          </div>

          <!-- Statut de la feuille -->
          <div v-if="sheet" class="info-grid">
            <div class="info-item">
              <label>Statut</label>
              <p class="role-display" :class="getStatusClass(sheet.status)">
                {{ getStatusLabel(sheet.status) }}
              </p>
            </div>
            <div v-if="sheet.validatedAtStaff" class="info-item">
              <label>Validé par</label>
              <p>{{ staffName }}</p>
            </div>
            <div v-if="sheet.validatedAtStaff" class="info-item">
              <label>Validé le</label>
              <p>{{ formatDate(sheet.validatedAtStaff) }}</p>
            </div>
          </div>

          <!-- Loader -->
          <div v-if="loading" class="loading-indicator">
            <i class="material-icons spinning">hourglass_empty</i>
            <span>Chargement de la feuille de présence...</span>
          </div>
        </div>

        <!-- Statistiques (affiché après validation ou pour consultation) -->
        <div v-if="sheet && sheet.validatedAtStaff" class="profile-section">
          <div class="section-header">
            <h2>
              <i class="material-icons" aria-hidden="true">analytics</i>
              Statistiques de présence
            </h2>
          </div>

          <div class="info-grid">
            <div class="info-item">
              <label>Enfants présents</label>
              <p class="presence-count present">{{ presentCount }}</p>
            </div>
            <div class="info-item">
              <label>Enfants absents</label>
              <p class="presence-count absent">{{ absenceCount }}</p>
            </div>
            <div class="info-item">
              <label>Retards</label>
              <p class="presence-count lateness">{{ latenessCount }}</p>
            </div>
            <div class="info-item">
              <label>Total enfants</label>
              <p class="presence-count total">{{ sheet.records.length }}</p>
            </div>
          </div>
        </div>

        <!-- Table des enfants avec GridJS -->
        <div v-if="sheet" class="profile-section children-section">
          <div class="section-header">
            <h2>
              <i class="material-icons" aria-hidden="true">group</i>
              Liste des enfants
              <span class="child-count">({{ sheet.records.length }})</span>
            </h2>
            <div v-if="!sheet.validatedAtStaff" class="info-note">
              <i class="material-icons" aria-hidden="true">info</i>
              <span>Cochez les enfants présents puis validez l'appel</span>
            </div>
          </div>

          <!-- GridJS Table -->
          <div v-if="sheet.records.length > 0" class="table-container">
            <div ref="gridContainer" class="grid-container"></div>
          </div>

          <!-- Message si pas d'enfants -->
          <div v-if="sheet.records.length === 0" class="empty-state">
            <i class="material-icons">group_off</i>
            <p>Aucun enfant inscrit</p>
            <small>Contactez l'administration</small>
          </div>
        </div>

        <!-- Message si pas de feuille -->
        <div v-if="!loading && !sheet" class="profile-section">
          <div class="empty-state">
            <i class="material-icons">event_busy</i>
            <p>Aucune feuille de présence</p>
            <small>La feuille sera créée automatiquement</small>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, nextTick, watch } from 'vue'
import { Grid, html } from 'gridjs'
import { usePresenceStore } from '@/stores/presenceStore'
import { useNotificationStore } from '@/stores/notificationStore'
import 'gridjs/dist/theme/mermaid.css'

const store  = usePresenceStore()
const notify = useNotificationStore()

// Grid reference
const gridContainer = ref<HTMLElement>()
let grid: Grid | null = null

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
  // La feuille contient seulement staffId, pas l'objet staff complet
  return sheet.value?.staffId || 'Équipe'
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
  if (!gridContainer.value || !sheet.value) return

  // Destroy existing grid
  if (grid) {
    grid.destroy()
    grid = null
  }

  const isValidated = sheet.value.validatedAtStaff

    // Prepare data as array for GridJS (GridJS prefers arrays)
  const data = sheet.value.records.map(rec => [
    rec.child.lastName,
    rec.child.firstName,
    rec.childId,
    rec.present,
    rec.justification?.type || null,
    rec.justification?.motif || null
  ])

  // Define columns based on validation state
  const columns = [
    { 
      name: 'Nom', 
      width: '25%'
    },
    { 
      name: 'Prénom', 
      width: '25%'
    },
    {
      name: 'Présent',
      width: '15%',
      formatter: (cell: any, row: any) => {
        // Debug pour comprendre la structure
        console.log('GridJS formatter - raw data:', { cell, row })
        
        // Approche défensive pour accéder aux données
        let childId, isPresent, justificationType
        
        if (row && row.cells && Array.isArray(row.cells)) {
          // Format avec row.cells[index].data
          childId = row.cells[2]?.data
          isPresent = row.cells[3]?.data
          justificationType = row.cells[4]?.data
        } else if (Array.isArray(row)) {
          // Format direct avec array
          childId = row[2]
          isPresent = row[3]
          justificationType = row[4]
        } else {
          console.error('Format de données GridJS non reconnu:', row)
          return html(`<span>Erreur de données</span>`)
        }
        
        console.log('Extracted data:', { childId, isPresent, justificationType })
        
        if (isValidated) {
          // Mode lecture seule après validation
          if (justificationType === 'LATENESS') {
            return html(`<span class="badge badge-lateness"><i class="material-icons">schedule</i> Retard</span>`)
          } else if (justificationType === 'ABSENCE') {
            return html(`<span class="badge badge-absence"><i class="material-icons">event_busy</i> Absence</span>`)
          } else if (isPresent) {
            return html(`<span class="badge badge-present"><i class="material-icons">check_circle</i> Présent</span>`)
          } else {
            return html(`<span class="badge badge-absent"><i class="material-icons">cancel</i> Absent</span>`)
          }
        } else {
          // Mode édition avec checkbox
          const childIdNum = parseInt(String(childId), 10)
          
          // Vérifier si cet enfant est marqué comme présent
          const isCurrentlyPresent = store.presentChildIds.includes(childIdNum)
          const checked = isCurrentlyPresent ? 'checked' : ''
          
          return html(`
            <div class="checkbox-container">
              <input 
                type="checkbox" 
                value="${childId}" 
                ${checked}
                onchange="handlePresenceChange('${childId}', this.checked, event)"
                class="presence-checkbox"
                data-child-id="${childIdNum}"
              />
              <label class="checkbox-label">${isCurrentlyPresent ? 'Présent' : 'Absent'}</label>
            </div>
          `)
        }
      }
    }
  ]

  // Add justification column only if validated
  if (isValidated) {
    columns.push({
      name: 'Justification',
      width: '35%',
      formatter: (cell: any, row: any) => {
        const type = row.cells[4].data
        const motif = row.cells[5].data
        
        if (type && motif) {
          return html(`
            <div class="justification-info">
              <div class="justification-type">${type === 'LATENESS' ? 'Retard' : 'Absence'}</div>
              <div class="justification-motif">${motif}</div>
            </div>
          `)
        } else if (type) {
          return html(`<div class="justification-type">${type === 'LATENESS' ? 'Retard' : 'Absence'}</div>`)
        }
        return html(`<span class="no-justification">-</span>`)
      }
    })
  }

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
        placeholder: 'Rechercher un enfant...'
      },
      pagination: {
        previous: 'Précédent',
        next: 'Suivant',
        showing: 'Affichage de',
        results: () => 'résultats'
      }
    },
    className: {
      container: 'grid-wrapper',
      table: 'grid-table',
      th: 'grid-header',
      td: 'grid-cell'
    }
  })

  grid.render(gridContainer.value)
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

// Validation handler
async function onValidate() {
  if (!sheet.value) return
  if (!confirm('Une fois validé, vous ne pourrez plus modifier la feuille. Continuer ?'))
    return

  submitting.value = true
  try {
    await store.validateSheet()
    notify.showNotification('Appel validé avec succès', 'success')
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
/* ===== Reprendre les styles de ProfileView.vue ===== */

/* Container */
.profile-container {
  min-height: 100vh;
  background-color: #f8fafc;
  padding: 2rem 0;
  display: flex;
  justify-content: center;
}

.profile-content {
  max-width: 90rem;
  width: 100%;
  padding: 0 1rem;
}

.content-grid {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* Sections */
.profile-section {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: 
    0 1px 3px rgba(0, 0, 0, 0.1),
    0 1px 2px rgba(0, 0, 0, 0.06);
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
}

.profile-section:hover {
  box-shadow: 
    0 4px 6px rgba(0, 0, 0, 0.07),
    0 1px 3px rgba(0, 0, 0, 0.06);
  transform: translateY(-1px);
}

/* Section headers */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e2e8f0;
}

.section-header h2 {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.5rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.section-header h2 i {
  color: #6366f1;
  font-size: 1.75rem;
}

.child-count {
  font-size: 1rem;
  color: #64748b;
  font-weight: 400;
}

/* Edit button */
.edit-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border: none;
  border-radius: 0.75rem;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(99, 102, 241, 0.2);
}

.edit-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #5855eb 0%, #7c3aed 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(99, 102, 241, 0.3);
}

.edit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.edit-btn i {
  font-size: 1.125rem;
}

/* Info grid */
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info-item label {
  font-weight: 600;
  color: #64748b;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.info-item p {
  color: #1e293b;
  font-size: 1rem;
  font-weight: 500;
  margin: 0;
}

/* Status styles */
.role-display {
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 0.875rem;
  text-align: center;
  width: fit-content;
}

.status-pending-staff {
  background-color: #fef3c7;
  color: #92400e;
}

.status-pending-secretary {
  background-color: #fed7aa;
  color: #ea580c;
}

.status-validated {
  background-color: #d1fae5;
  color: #059669;
}

/* Presence counts */
.presence-count {
  font-size: 1.5rem;
  font-weight: 700;
  padding: 0.5rem;
  border-radius: 0.5rem;
  text-align: center;
  width: fit-content;
}

.presence-count.present {
  background-color: #d1fae5;
  color: #059669;
}

.presence-count.absent {
  background-color: #fee2e2;
  color: #dc2626;
}

.presence-count.lateness {
  background-color: #fef3c7;
  color: #d97706;
}

.presence-count.total {
  background-color: #e0e7ff;
  color: #3730a3;
}

/* Children section */
.children-section {
  grid-column: 1 / -1;
}

/* Table container */
.table-container {
  margin-top: 1rem;
}

/* Loading indicator */
.loading-indicator {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #6366f1;
  font-weight: 500;
  justify-content: center;
  padding: 2rem;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Empty state */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 3rem;
  text-align: center;
  color: #64748b;
}

.empty-state i {
  font-size: 3rem;
  color: #cbd5e1;
}

.empty-state p {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
}

.empty-state small {
  font-size: 0.875rem;
  color: #94a3b8;
}

/* Info note */
.info-note {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background-color: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  color: #475569;
  font-size: 0.875rem;
}

.info-note i {
  color: #6366f1;
  font-size: 1rem;
}

/* ===== GridJS Custom Styles ===== */

/* Grid container */
.grid-container {
  background: white;
  border-radius: 0.5rem;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* Grid wrapper */
:deep(.grid-wrapper) {
  border: none;
  font-family: inherit;
}

/* Grid table */
:deep(.grid-table) {
  border-collapse: collapse;
  width: 100%;
}

/* Grid headers */
:deep(.grid-header) {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  color: #1e293b;
  font-weight: 600;
  padding: 1rem 0.75rem;
  text-align: left;
  border-bottom: 2px solid #e2e8f0;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Grid cells */
:deep(.grid-cell) {
  padding: 0.75rem;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
}

:deep(.gridjs-tr:hover .grid-cell) {
  background-color: #f8fafc;
}

/* Search input */
:deep(.gridjs-search input) {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  background-color: white;
  margin-bottom: 1rem;
}

:deep(.gridjs-search input:focus) {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

/* Pagination */
:deep(.gridjs-pagination) {
  margin-top: 1rem;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
}

:deep(.gridjs-pagination button) {
  padding: 0.5rem 0.75rem;
  border: 1px solid #e2e8f0;
  background: white;
  color: #64748b;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s;
}

:deep(.gridjs-pagination button:hover:not(:disabled)) {
  background-color: #f8fafc;
  border-color: #6366f1;
  color: #6366f1;
}

:deep(.gridjs-pagination button:disabled) {
  opacity: 0.5;
  cursor: not-allowed;
}

:deep(.gridjs-pagination button.gridjs-currentPage) {
  background-color: #6366f1;
  color: white;
  border-color: #6366f1;
}

/* Checkbox styles */
.checkbox-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.presence-checkbox {
  width: 1.25rem;
  height: 1.25rem;
  border: 2px solid #d1d5db;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: all 0.2s;
}

.presence-checkbox:checked {
  background-color: #6366f1;
  border-color: #6366f1;
  background-image: url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='m13.854 3.646-7.5 7.5a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6 10.293l7.146-7.147a.5.5 0 0 1 .708.708z'/%3e%3c/svg%3e");
}

.presence-checkbox:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}

.checkbox-label {
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  font-size: 0.875rem;
}

/* Badge styles */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.375rem 0.75rem;
  border-radius: 0.5rem;
  font-weight: 500;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.badge i {
  font-size: 0.875rem;
}

.badge-present {
  background-color: #d1fae5;
  color: #059669;
}

.badge-absent {
  background-color: #fee2e2;
  color: #dc2626;
}

.badge-lateness {
  background-color: #fef3c7;
  color: #d97706;
}

.badge-absence {
  background-color: #fecaca;
  color: #b91c1c;
}

/* Justification info */
.justification-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.justification-type {
  font-weight: 600;
  color: #374151;
  font-size: 0.75rem;
  text-transform: uppercase;
}

.justification-motif {
  color: #6b7280;
  font-size: 0.875rem;
  font-style: italic;
}

.no-justification {
  color: #9ca3af;
  font-style: italic;
}

/* Responsive */
@media (max-width: 768px) {
  .profile-content {
    padding: 0 0.5rem;
  }
  
  .profile-section {
    padding: 1.5rem;
  }
  
  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .info-grid {
    grid-template-columns: 1fr;
  }
}
</style>


