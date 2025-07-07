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

        <!-- Liste des enfants -->
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

          <!-- Phase avant validation : checkboxes -->
          <div v-if="!sheet.validatedAtStaff" class="children-grid">
            <div v-for="rec in sheet.records" :key="rec.id" class="child-card presence-card">
              <div class="child-info">
                <div class="child-header">
                  <h3>{{ rec.child.firstName }} {{ rec.child.lastName }}</h3>
                  <div class="presence-toggle">
                    <label class="toggle-switch">
                      <input
                        type="checkbox"
                        :value="rec.childId"
                        v-model="store.presentChildIds"
                        :aria-label="`Marquer ${rec.child.firstName} ${rec.child.lastName} comme présent`"
                      />
                      <span class="toggle-slider" aria-hidden="true"></span>
                    </label>
                    <span class="toggle-label">
                      {{ store.presentChildIds.includes(rec.childId) ? "Présent" : "Absent" }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Phase après validation : affichage des résultats -->
          <div v-else class="children-grid">
            <div v-for="rec in sheet.records" :key="rec.id" class="child-card presence-card">
              <div class="child-info">
                <div class="child-header">
                  <h3>{{ rec.child.firstName }} {{ rec.child.lastName }}</h3>
                  <div class="presence-status" :class="getPresenceStatusClass(rec)">
                    <i class="material-icons">
                      {{ getPresenceIcon(rec) }}
                    </i>
                    <span>{{ getPresenceLabel(rec) }}</span>
                  </div>
                </div>
                <div v-if="rec.justification" class="child-details">
                  <div class="detail-item">
                    <label>Type</label>
                    <p>{{ rec.justification.type === 'LATENESS' ? 'Retard' : 'Absence' }}</p>
                  </div>
                  <div v-if="rec.justification.motif" class="detail-item">
                    <label>Motif</label>
                    <p>{{ rec.justification.motif }}</p>
                  </div>
                </div>
              </div>
            </div>
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
import { computed, ref, onMounted } from 'vue'
import { usePresenceStore } from '@/stores/presenceStore'
import { useNotificationStore } from '@/stores/notificationStore'

const store  = usePresenceStore()
const notify = useNotificationStore()

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

function getPresenceStatusClass(rec: any) {
  if (rec.justification?.type === 'LATENESS') return 'status-lateness'
  if (rec.justification?.type === 'ABSENCE') return 'status-absence'
  if (rec.present) return 'status-present'
  return 'status-absent'
}

function getPresenceIcon(rec: any) {
  if (rec.justification?.type === 'LATENESS') return 'schedule'
  if (rec.justification?.type === 'ABSENCE') return 'event_busy'
  if (rec.present) return 'check_circle'
  return 'cancel'
}

function getPresenceLabel(rec: any) {
  if (rec.justification?.type === 'LATENESS') return 'Retard justifié'
  if (rec.justification?.type === 'ABSENCE') return 'Absence justifiée'
  if (rec.present) return 'Présent'
  return 'Absent'
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

// Validation handler
async function onValidate() {
  if (!sheet.value) return
  if (!confirm('Une fois validé, vous ne pourrez plus modifier la feuille. Continuer ?'))
    return

  submitting.value = true
  try {
    await store.validateSheet()
    notify.showNotification('Appel validé avec succès', 'success')
  } catch (err: any) {
    notify.showNotification(err?.message || 'Erreur lors de la validation', 'error')
  } finally {
    submitting.value = false
  }
}

// On mount, fetch today's sheet
onMounted(async () => {
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
  max-width: 80rem;
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

.children-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.child-card {
  background: linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%);
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 1.25rem;
  transition: all 0.3s ease;
}

.child-card:hover {
  border-color: #6366f1;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  transform: translateY(-2px);
}

.child-info {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.child-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.child-header h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
}

/* Presence toggle */
.presence-toggle {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 3rem;
  height: 1.5rem;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #cbd5e1;
  border-radius: 1.5rem;
  transition: all 0.3s ease;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 1.125rem;
  width: 1.125rem;
  left: 0.1875rem;
  bottom: 0.1875rem;
  background-color: white;
  border-radius: 50%;
  transition: all 0.3s ease;
}

input:checked + .toggle-slider {
  background-color: #6366f1;
}

input:checked + .toggle-slider:before {
  transform: translateX(1.5rem);
}

.toggle-label {
  font-weight: 500;
  color: #475569;
  font-size: 0.875rem;
}

/* Presence status */
.presence-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  font-weight: 500;
  font-size: 0.875rem;
  width: fit-content;
}

.status-present {
  background-color: #d1fae5;
  color: #059669;
}

.status-absent {
  background-color: #fee2e2;
  color: #dc2626;
}

.status-lateness {
  background-color: #fef3c7;
  color: #d97706;
}

.status-absence {
  background-color: #fecaca;
  color: #b91c1c;
}

/* Child details */
.child-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.detail-item label {
  font-weight: 500;
  color: #64748b;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.detail-item p {
  color: #1e293b;
  font-size: 0.875rem;
  margin: 0;
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
  
  .children-grid {
    grid-template-columns: 1fr;
  }
  
  .info-grid {
    grid-template-columns: 1fr;
  }
}
</style>


