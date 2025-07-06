<template>
  <main class="profile-container" lang="fr" role="main">
    <!-- Skip links pour navigation clavier -->
    <div class="skip-links">
      <a href="#main-content" class="skip-link">Aller au contenu principal</a>
      <a href="#children-table" class="skip-link">Aller au tableau des enfants</a>
    </div>
    
    <!-- Content -->
    <div class="profile-content" id="main-content">
      <div class="content-grid">
        <!-- En-tête avec date -->
        <div class="profile-section">
          <div class="section-header">
            <h1>
              <i class="material-icons" aria-hidden="true">event_available</i>
              Appel des présences – {{ todayLabel }}
            </h1>
          </div>

          <!-- Info note -->
          <div class="info-note">
            <i class="material-icons" aria-hidden="true">info</i>
            <span>Cochez les enfants présents puis validez l'appel</span>
          </div>

          <!-- Statut de la feuille -->
          <div v-if="sheet" class="info-grid">
            <div class="info-item">
              <label>Statut</label>
              <div class="status-container">
                <p class="role-display" :class="getStatusClass(sheet.status)">
                  {{ getStatusLabel(sheet.status) }}
                </p>
                <button
                  v-if="!sheet?.validatedAtStaff"
                  class="edit-btn edit-btn-blue"
                  :disabled="submitting || !sheet"
                  @click="showValidationModal"
                  type="button"
                  aria-label="Valider l'appel des présences"
                >
                  <i class="material-icons" aria-hidden="true">
                    {{ submitting ? 'hourglass_empty' : 'check_circle' }}
                  </i>
                  {{ submitting ? 'Validation en cours…' : 'Valider l\'appel' }}
                </button>
              </div>
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
          </div>

          <!-- GridJS Table -->
          <div 
            v-if="sheet.records.length > 0" 
            ref="gridContainer" 
            id="children-table"
            class="grid-container"
            role="region"
            aria-label="Tableau des présences des enfants"
            aria-describedby="table-description"
            tabindex="0"
          ></div>
          <div id="table-description" class="sr-only">
            Tableau interactif permettant de marquer la présence des enfants. Utilisez Tab pour naviguer et Espace pour cocher/décocher.
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

    <!-- Modal de validation -->
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
function getStatusLabel(status: string) {
  const labels = {
    'PENDING_STAFF': 'En attente de validation',
    'PENDING_SECRETARY': 'Validé - En attente justifications',
    'VALIDATED': 'Complètement validé',
  }
  return labels[status as keyof typeof labels] || status
}

function getStatusClass(status: string) {
  const classes = {
    'PENDING_STAFF': 'status-pending-staff',
    'PENDING_SECRETARY': 'status-pending-secretary', 
    'VALIDATED': 'status-validated',
  }
  return classes[status as keyof typeof classes] || ''
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Grid initialization
function initGrid() {
  if (!gridContainer.value || !sheet.value) return
  
  // Destroy existing grid
  if (grid) {
    grid.destroy()
    grid = null
  }
  
  const isValidated = !!sheet.value.validatedAtStaff
  
  // Prepare data for GridJS
  const data = sheet.value.records.map(record => {
    console.log('🔍 DEBUG Record:', {
      childName: `${record.child.firstName} ${record.child.lastName}`,
      present: record.present,
      justificationType: record.justification?.type || 'NONE',
      hasJustification: !!record.justification,
      rawJustification: JSON.stringify(record.justification)
    })
    
    return [
      record.child.lastName,
      record.child.firstName,
      record.childId,  // Hidden column for childId
      record.justification,  // Include justification data
      record.present  // For the presence column
    ]
  })

  console.log('🎯 DEBUG GridJS Data length:', data.length)

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
      name: 'justification',
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
        
        // SOLUTION: Accéder directement aux données originales plutôt que GridJS
        const originalRecord = sheet.value?.records.find(r => r.childId === childId)
        const justification = originalRecord?.justification
        
        console.log('🔍 DEBUG Formatter:', {
          childId,
          isPresent,
          justificationType: justification?.type || 'NONE',
          hasJustification: !!justification,
          isValidated,
          rawJustification: JSON.stringify(justification)
        })
        
        if (isValidated) {
          // Mode lecture seule après validation - afficher présent/absent/retard
          if (justification?.type === 'LATENESS') {
            // Enfant en retard (considéré comme présent mais en retard)
            console.log('✅ Affichage "En retard" pour:', childId)
            return html(`<span class="badge badge-lateness"><i class="material-icons" style="color: #f59e0b;">schedule</i> En retard</span>`)
          } else if (isPresent || originalRecord?.present) {
            // Enfant présent (utilise les données originales pour plus de fiabilité)
            console.log('✅ Affichage "Présent" pour:', childId)
            return html(`<span class="badge badge-present"><i class="material-icons" style="color: #16a34a;">check_circle</i> Présent</span>`)
          } else {
            // Enfant absent
            console.log('✅ Affichage "Absent" pour:', childId)
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

  console.log('🚀 Début de la validation:', {
    sheetId: sheet.value.id,
    presentChildIds: [...store.presentChildIds],
    sheetStatus: sheet.value.status
  })

  submitting.value = true
  try {
    console.log('📞 Appel du store.validateSheet()...')
    await store.validateSheet()
    console.log('✅ Validation réussie, nouvelle sheet:', sheet.value)
    notify.showNotification('Appel validé avec succès', 'success')
    showModal.value = false
    // Refresh grid with new data
    await nextTick()
    initGrid()
  } catch (err: any) {
    console.error('❌ Erreur lors de la validation:', err)
    notify.showNotification(err?.message || 'Erreur lors de la validation', 'error')
  } finally {
    submitting.value = false
    console.log('🏁 Fin de la validation, submitting:', submitting.value)
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
.profile-container {
  background: #f8fafc;
  padding: 1rem;
  min-height: auto !important;
}

.profile-content {
  max-width: 1200px;
  margin: 0 auto;
}

.content-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.profile-section {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
}

.children-section {
  padding: 0;
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.children-section .section-header {
  background: #4444ac;
  border-radius: 0;
  padding: 1.5rem;
  margin-bottom: 0;
}

.section-header {
  background: #4444ac;
  padding: 1.5rem;
  border-radius: 12px;
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.section-header h1, .section-header h2 {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.75rem;
  font-weight: 700;
  color: white;
  margin: 0;
  font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
}

.section-header h2 {
  font-size: 1.5rem;
}

.section-header h1 i, .section-header h2 i {
  color: white;
  font-size: 1.5rem;
}

.edit-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
}

.edit-btn:hover:not(:disabled) {
  background: #059669;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
}

.edit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
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
}

.info-item p {
  color: #1e293b;
  font-size: 1rem;
  font-weight: 500;
  margin: 0;
}

.status-container {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.role-display {
  padding: 0.5rem 1rem;
  border-radius: 4px;
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

.presence-count {
  font-size: 1.5rem;
  font-weight: 700;
  padding: 0.5rem;
  border-radius: 4px;
  text-align: center;
  width: fit-content;
}

.presence-count.present {
  background-color: #d1fae5;
  color: #15803d;
}

.presence-count.absent {
  background-color: #fee2e2;
  color: #b91c1c;
}

.presence-count.lateness {
  background-color: #fef3c7;
  color: #b45309;
}

.presence-count.total {
  background-color: #e0e7ff;
  color: #312e81;
}

:deep(.grid-wrapper) {
  background: white;
  border: none;
  border-radius: 0;
  padding: 1.5rem;
  margin: 0;
}

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

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
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

.info-note {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border: 1px solid #bfdbfe;
  border-radius: 0.75rem;
  color: #1e40af;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 1rem;
}

.info-note i {
  color: #3b82f6;
  font-size: 1.1rem;
  flex-shrink: 0;
}

.checkbox-container {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.presence-checkbox {
  width: 1.25rem;
  height: 1.25rem;
  border: 2px solid #4b5563;
  border-radius: 4px;
  cursor: pointer;
}

.presence-checkbox:checked {
  background-color: #4338ca;
  border-color: #4338ca;
  background-image: url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='m13.854 3.646-7.5 7.5a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6 10.293l7.146-7.147a.5.5 0 0 1 .708.708z'/%3e%3c/svg%3e");
}

.checkbox-label {
  font-weight: 600;
  color: #374151;
  cursor: pointer;
  font-size: 0.875rem;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.875rem;
  text-transform: uppercase;
}

.badge-present {
  background-color: #dcfce7;
  color: #16a34a;
  border: 1px solid #bbf7d0;
}

.badge-absent {
  background-color: #fee2e2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.badge-lateness {
  background-color: #fef3c7;
  color: #f59e0b;
  border: 1px solid #fef3c7;
}

.child-count {
  font-size: 1rem;
  color: #475569;
  font-weight: 400;
}

/* Forcer la hauteur normale */
.skip-links {
  display: none;
}

.sr-only {
  display: none;
}

/* Responsive */
@media (max-width: 768px) {
  .profile-container {
    padding: 0.5rem;
  }
  
  .profile-section {
    padding: 1rem;
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


