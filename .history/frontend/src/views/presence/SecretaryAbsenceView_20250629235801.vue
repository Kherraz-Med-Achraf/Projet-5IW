<template>
  <main class="profile-container" lang="fr" role="main">
    <!-- Skip links pour navigation clavier -->
    <div class="skip-links">
      <a href="#main-content" class="skip-link">Aller au contenu principal</a>
      <a href="#statistics" class="skip-link">Aller aux statistiques</a>
      <a href="#tabs-section" class="skip-link">Aller aux onglets de présence</a>
    </div>
    
    <!-- Content -->
    <div class="profile-content" id="main-content">
      <div class="content-grid">
        <!-- En-tête avec date et sélecteur -->
        <div class="profile-section">
          <div class="section-header">
            <h1>
              <i class="material-icons" aria-hidden="true">assignment_late</i>
              Gestion des absences / retards – {{ formattedDate }}
            </h1>
          </div>

          <!-- Sélecteur de date -->
          <div class="date-selector">
            <label for="date-picker" class="date-label">
              <i class="material-icons" aria-hidden="true">calendar_today</i>
              Date :
            </label>
            <input
              id="date-picker"
              type="date"
              v-model="date"
              class="date-input"
              aria-describedby="date-description"
            />
            <div id="date-description" class="sr-only">
              Sélectionnez une date pour voir les présences de cette journée
            </div>
          </div>

          <!-- Loader -->
          <div v-if="loading" class="loading-indicator">
            <i class="material-icons spinning">hourglass_empty</i>
            <span>Chargement de la feuille de présence...</span>
          </div>

          <!-- Message si pas de feuille pour la date -->
          <div v-else-if="!sheet" class="empty-state">
            <i class="material-icons">event_busy</i>
            <p>Aucune feuille de présence</p>
            <small>Aucune feuille n'existe pour le {{ formattedDate }}</small>
          </div>
        </div>

        <!-- Statistiques -->
        <div v-if="sheet" class="profile-section" id="statistics">
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
              <label>Absents non justifiés</label>
              <p class="presence-count pending">{{ pendingCount }}</p>
            </div>
            <div class="info-item">
              <label>Retards justifiés</label>
              <p class="presence-count lateness">{{ latenessCount }}</p>
            </div>
            <div class="info-item">
              <label>Absences justifiées</label>
              <p class="presence-count absent">{{ absenceCount }}</p>
            </div>
          </div>
        </div>

        <!-- Section avec onglets -->
        <div v-if="sheet" class="profile-section" id="tabs-section">
          <div class="section-header">
            <h2>
              <i class="material-icons" aria-hidden="true">tab</i>
              Détail des présences
            </h2>
          </div>

          <!-- Onglets -->
          <div class="tabs-container">
            <div class="tabs-nav" role="tablist" aria-label="Navigation des présences">
              <button
                v-if="presentRecords.length > 0"
                class="tab-button"
                :class="{ active: activeTab === 'present' }"
                @click="setActiveTab('present')"
                role="tab"
                :aria-selected="activeTab === 'present'"
                :aria-controls="'tabpanel-present'"
                :id="'tab-present'"
              >
                <i class="material-icons" aria-hidden="true">check_circle</i>
                <span>Présents</span>
                <span class="tab-count">{{ presentCount }}</span>
              </button>

              <button
                v-if="pendingRecords.length > 0"
                class="tab-button"
                :class="{ active: activeTab === 'pending' }"
                @click="setActiveTab('pending')"
                role="tab"
                :aria-selected="activeTab === 'pending'"
                :aria-controls="'tabpanel-pending'"
                :id="'tab-pending'"
              >
                <i class="material-icons" aria-hidden="true">error</i>
                <span>Absents non justifiés</span>
                <span class="tab-count urgent">{{ pendingCount }}</span>
              </button>

              <button
                v-if="justifiedLateness.length > 0"
                class="tab-button"
                :class="{ active: activeTab === 'lateness' }"
                @click="setActiveTab('lateness')"
                role="tab"
                :aria-selected="activeTab === 'lateness'"
                :aria-controls="'tabpanel-lateness'"
                :id="'tab-lateness'"
              >
                <i class="material-icons" aria-hidden="true">schedule</i>
                <span>Retards justifiés</span>
                <span class="tab-count">{{ latenessCount }}</span>
              </button>

              <button
                v-if="justifiedAbsences.length > 0"
                class="tab-button"
                :class="{ active: activeTab === 'absences' }"
                @click="setActiveTab('absences')"
                role="tab"
                :aria-selected="activeTab === 'absences'"
                :aria-controls="'tabpanel-absences'"
                :id="'tab-absences'"
              >
                <i class="material-icons" aria-hidden="true">check</i>
                <span>Absences justifiées</span>
                <span class="tab-count">{{ absenceCount }}</span>
              </button>
            </div>

            <!-- Contenu des onglets -->
            <div class="tabs-content">
              <!-- Onglet Présents -->
              <div
                v-if="activeTab === 'present' && presentRecords.length > 0"
                class="tab-panel"
                role="tabpanel"
                :aria-labelledby="'tab-present'"
                :id="'tabpanel-present'"
              >
                <div class="tab-panel-header">
                  <h3>Enfants présents ({{ presentCount }})</h3>
                  <div class="info-note">
                    <i class="material-icons" aria-hidden="true">info</i>
                    <span>Liste des enfants marqués comme présents</span>
                  </div>
                </div>

                <div class="table-wrapper">
                  <table class="custom-table" role="table" aria-label="Liste des enfants présents">
                    <thead>
                      <tr>
                        <th scope="col">Nom</th>
                        <th scope="col">Prénom</th>
                        <th scope="col">Téléphone du parent</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="rec in presentRecords" :key="rec.id">
                        <td>{{ rec.child.lastName }}</td>
                        <td>{{ rec.child.firstName }}</td>
                        <td>{{ rec.child.parent?.phone || 'N/A' }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Onglet Absents non justifiés -->
              <div
                v-if="activeTab === 'pending' && pendingRecords.length > 0"
                class="tab-panel"
                role="tabpanel"
                :aria-labelledby="'tab-pending'"
                :id="'tabpanel-pending'"
              >
                <div class="tab-panel-header">
                  <h3>Absents non justifiés ({{ pendingCount }})</h3>
                  <div class="info-note urgent">
                    <i class="material-icons" aria-hidden="true">warning</i>
                    <span>Ces absences nécessitent une justification</span>
                  </div>
                </div>

                <div class="table-wrapper">
                  <table class="custom-table" role="table" aria-label="Liste des enfants absents non justifiés">
                    <thead>
                      <tr>
                        <th scope="col">Nom</th>
                        <th scope="col">Prénom</th>
                        <th scope="col">Téléphone du parent</th>
                        <th scope="col">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="rec in pendingRecords" :key="rec.id">
                        <td>{{ rec.child.lastName }}</td>
                        <td>{{ rec.child.firstName }}</td>
                        <td>{{ rec.child.parent?.phone || 'N/A' }}</td>
                        <td class="action-cell">
                          <button
                            class="justify-btn"
                            @click="openModal(rec)"
                            :aria-label="`Justifier l'absence de ${rec.child.firstName} ${rec.child.lastName}`"
                          >
                            <i class="material-icons" aria-hidden="true">edit</i>
                            Justifier
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Onglet Retards justifiés -->
              <div
                v-if="activeTab === 'lateness' && justifiedLateness.length > 0"
                class="tab-panel"
                role="tabpanel"
                :aria-labelledby="'tab-lateness'"
                :id="'tabpanel-lateness'"
              >
                <div class="tab-panel-header">
                  <h3>Retards justifiés ({{ latenessCount }})</h3>
                  <div class="info-note">
                    <i class="material-icons" aria-hidden="true">info</i>
                    <span>Retards avec justification fournie</span>
                  </div>
                </div>

                <div class="table-wrapper">
                  <table class="custom-table" role="table" aria-label="Liste des retards justifiés">
                    <thead>
                      <tr>
                        <th scope="col">Nom</th>
                        <th scope="col">Prénom</th>
                        <th scope="col">Téléphone du parent</th>
                        <th scope="col">Date justification</th>
                        <th scope="col">Motif</th>
                        <th scope="col">Fichier</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="rec in justifiedLateness" :key="rec.id">
                        <td>{{ rec.child.lastName }}</td>
                        <td>{{ rec.child.firstName }}</td>
                        <td>{{ rec.child.parent?.phone || 'N/A' }}</td>
                        <td>{{ formatDate(rec.justification!.justificationDate) }}</td>
                        <td>{{ rec.justification!.motif || '—' }}</td>
                        <td class="action-cell">
                          <div class="file-actions" v-if="rec.justification!.filePath">
                            <a
                              :href="fileUrl(rec.justification!.filePath)"
                              target="_blank"
                              rel="noopener"
                              class="file-btn file-btn-view"
                              :aria-label="`Ouvrir le fichier de justification pour ${rec.child.firstName} ${rec.child.lastName}`"
                            >
                              <i class="material-icons" aria-hidden="true">visibility</i>
                              Ouvrir
                            </a>
                            <a
                              :href="fileUrl(rec.justification!.filePath)"
                              download
                              class="file-btn file-btn-download"
                              :aria-label="`Télécharger le fichier de justification pour ${rec.child.firstName} ${rec.child.lastName}`"
                            >
                              <i class="material-icons" aria-hidden="true">download</i>
                              Télécharger
                            </a>
                          </div>
                          <span v-else class="no-file">Aucun fichier</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Onglet Absences justifiées -->
              <div
                v-if="activeTab === 'absences' && justifiedAbsences.length > 0"
                class="tab-panel"
                role="tabpanel"
                :aria-labelledby="'tab-absences'"
                :id="'tabpanel-absences'"
              >
                <div class="tab-panel-header">
                  <h3>Absences justifiées ({{ absenceCount }})</h3>
                  <div class="info-note">
                    <i class="material-icons" aria-hidden="true">info</i>
                    <span>Absences avec justification fournie</span>
                  </div>
                </div>

                <div class="table-wrapper">
                  <table class="custom-table" role="table" aria-label="Liste des absences justifiées">
                    <thead>
                      <tr>
                        <th scope="col">Nom</th>
                        <th scope="col">Prénom</th>
                        <th scope="col">Téléphone du parent</th>
                        <th scope="col">Date justification</th>
                        <th scope="col">Motif</th>
                        <th scope="col">Fichier</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="rec in justifiedAbsences" :key="rec.id">
                        <td>{{ rec.child.lastName }}</td>
                        <td>{{ rec.child.firstName }}</td>
                        <td>{{ rec.child.parent?.phone || 'N/A' }}</td>
                        <td>{{ formatDate(rec.justification!.justificationDate) }}</td>
                        <td>{{ rec.justification!.motif }}</td>
                        <td class="action-cell">
                          <div class="file-actions" v-if="rec.justification!.filePath">
                            <a
                              :href="fileUrl(rec.justification!.filePath)"
                              target="_blank"
                              rel="noopener"
                              class="file-btn file-btn-view"
                              :aria-label="`Ouvrir le fichier de justification pour ${rec.child.firstName} ${rec.child.lastName}`"
                            >
                              <i class="material-icons" aria-hidden="true">visibility</i>
                              Ouvrir
                            </a>
                            <a
                              :href="fileUrl(rec.justification!.filePath)"
                              download
                              class="file-btn file-btn-download"
                              :aria-label="`Télécharger le fichier de justification pour ${rec.child.firstName} ${rec.child.lastName}`"
                            >
                              <i class="material-icons" aria-hidden="true">download</i>
                              Télécharger
                            </a>
                          </div>
                          <span v-else class="no-file">Aucun fichier</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Message si aucun onglet actif ou aucune donnée -->
              <div v-if="!hasAnyData" class="tab-panel empty-tab">
                <div class="empty-state">
                  <i class="material-icons">inbox</i>
                  <p>Aucune donnée disponible</p>
                  <small>Tous les enfants sont présents pour cette date</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de justification -->
    <JustifyModal
      v-if="modalOpen"
      :record="modalRecord"
      @close="closeModal"
      @submit="submitJustification"
    />
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { usePresenceStore } from '@/stores/presenceStore'
import { useNotificationStore } from '@/stores/notificationStore'
import JustifyModal from '@/components/presence/JustifyModal.vue'

const store = usePresenceStore()
const notify = useNotificationStore()

// État des onglets
const activeTab = ref<'present' | 'pending' | 'lateness' | 'absences'>('pending')

// Liaison du sélecteur de date sur store.date via computed getter/setter
const date = computed<string>({
  get: () => store.date,
  set: async (val: string) => {
    store.setDate(val)
    await store.fetchSheet()
  },
})

const loading = computed(() => store.loading)
const sheet = computed(() => store.sheet)
const formattedDate = computed(() =>
  new Date(date.value).toLocaleDateString('fr-FR', { 
    weekday: 'long',
    day: '2-digit', 
    month: 'long', 
    year: 'numeric' 
  })
)

// Jeux d'enregistrements filtrés par type
const presentRecords    = computed(() => sheet.value?.records.filter(r => r.present) || [])
const pendingRecords    = computed(() => sheet.value?.records.filter(r => !r.present && !r.justification) || [])
const justifiedLateness = computed(() => sheet.value?.records.filter(r => r.justification?.type === 'LATENESS') || [])
const justifiedAbsences = computed(() => sheet.value?.records.filter(r => r.justification?.type === 'ABSENCE') || [])

// Compteurs
const presentCount  = computed(() => presentRecords.value.length)
const pendingCount  = computed(() => pendingRecords.value.length)
const latenessCount = computed(() => justifiedLateness.value.length)
const absenceCount  = computed(() => justifiedAbsences.value.length)

// Vérifier s'il y a des données à afficher
const hasAnyData = computed(() => 
  presentRecords.value.length > 0 || 
  pendingRecords.value.length > 0 || 
  justifiedLateness.value.length > 0 || 
  justifiedAbsences.value.length > 0
)

const modalOpen   = ref(false)
const modalRecord = ref<any>(null)

// Gestion des onglets
function setActiveTab(tab: 'present' | 'pending' | 'lateness' | 'absences') {
  activeTab.value = tab
}

// Auto-sélection du premier onglet disponible
watch([presentRecords, pendingRecords, justifiedLateness, justifiedAbsences], () => {
  // Prioriser les absents non justifiés (le plus urgent)
  if (pendingRecords.value.length > 0) {
    activeTab.value = 'pending'
  } else if (presentRecords.value.length > 0) {
    activeTab.value = 'present'
  } else if (justifiedLateness.value.length > 0) {
    activeTab.value = 'lateness'
  } else if (justifiedAbsences.value.length > 0) {
    activeTab.value = 'absences'
  }
}, { immediate: true })

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
function fileUrl(path: string) {
  const cleaned = path.startsWith('/') ? path : `/${path}`
  return `http://localhost:3000${cleaned}`
}

function openModal(rec: any) {
  modalRecord.value = rec
  modalOpen.value   = true
}
function closeModal() {
  modalOpen.value = false
}
async function submitJustification(payload: any) {
  try {
    await store.justifyRecord(
      payload.recordId,
      payload.type,
      payload.justificationDate,
      payload.motif,
      payload.file,
    )
    notify.showNotification('Justification enregistrée', 'success')
  } catch (err: any) {
    notify.showNotification(err.message || 'Erreur lors de la justification', 'error')
  } finally {
    closeModal()
  }
}

// Chargement initial
onMounted(() => {
  store.fetchSheet()
})
</script>

<style scoped>
/* ===== Reprendre les styles de base ===== */

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

/* Sections - Blocs visuels normaux */
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

.section-header h1,
.section-header h2 {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.5rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
  font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.section-header h1 {
  font-size: 1.75rem;
}

.section-header h1 i,
.section-header h2 i {
  color: #4338ca;
  font-size: 1.75rem;
}

.child-count {
  font-size: 1rem;
  color: #475569;
  font-weight: 400;
}

/* Date selector */
.date-selector {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.date-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: #374151;
  font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.date-label i {
  color: #4338ca;
  font-size: 1.25rem;
}

.date-input {
  padding: 0.75rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: white;
  transition: all 0.2s ease;
}

.date-input:focus {
  outline: 3px solid #fbbf24;
  outline-offset: 2px;
  border-color: #4338ca;
  box-shadow: 0 0 0 2px rgba(67, 56, 202, 0.1);
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
  font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.info-item p {
  color: #1e293b;
  font-size: 1rem;
  font-weight: 500;
  margin: 0;
}

/* Presence counts */
.presence-count {
  font-size: 1.5rem;
  font-weight: 700;
  padding: 0.5rem;
  border-radius: 0.5rem;
  text-align: center;
  width: fit-content;
  font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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

.presence-count.pending {
  background-color: #fef3c7;
  color: #b45309;
}

/* Loading indicator */
.loading-indicator {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #4338ca;
  font-weight: 500;
  justify-content: center;
  padding: 2rem;
  font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
  font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.empty-state small {
  font-size: 0.875rem;
  color: #94a3b8;
}

/* ===== NOUVEAUX STYLES POUR LES ONGLETS ===== */

/* Container des onglets */
.tabs-container {
  margin-top: 1rem;
}

/* Navigation des onglets */
.tabs-nav {
  display: flex;
  gap: 0.25rem;
  margin-bottom: 0;
  border-bottom: 2px solid #e2e8f0;
  overflow-x: auto;
  scrollbar-width: thin;
}

.tabs-nav::-webkit-scrollbar {
  height: 4px;
}

.tabs-nav::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.tabs-nav::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 2px;
}

/* Boutons d'onglets */
.tab-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  background: transparent;
  border: none;
  border-bottom: 3px solid transparent;
  color: #64748b;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
  font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  position: relative;
  min-height: 60px;
}

.tab-button:hover {
  background-color: #f8fafc;
  color: #374151;
  border-bottom-color: #cbd5e1;
}

.tab-button:focus {
  outline: 3px solid #fbbf24;
  outline-offset: 2px;
  background-color: #f8fafc;
}

.tab-button.active {
  background-color: #ffffff;
  color: #4338ca;
  border-bottom-color: #4338ca;
  font-weight: 600;
}

.tab-button.active:hover {
  background-color: #ffffff;
  color: #4338ca;
  border-bottom-color: #4338ca;
}

.tab-button i {
  font-size: 1.25rem;
  transition: color 0.3s ease;
}

.tab-button.active i {
  color: #4338ca;
}

/* Compteurs dans les onglets */
.tab-count {
  background-color: #e2e8f0;
  color: #475569;
  padding: 0.25rem 0.5rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  min-width: 1.5rem;
  text-align: center;
  transition: all 0.3s ease;
}

.tab-button.active .tab-count {
  background-color: #4338ca;
  color: white;
}

.tab-count.urgent {
  background-color: #fecaca;
  color: #b91c1c;
}

.tab-button.active .tab-count.urgent {
  background-color: #dc2626;
  color: white;
}

/* Contenu des onglets */
.tabs-content {
  background: white;
  border-radius: 0 0 1rem 1rem;
  overflow: hidden;
}

.tab-panel {
  padding: 0;
  animation: fadeIn 0.3s ease-in-out;
}

.empty-tab {
  padding: 2rem;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* En-têtes des panneaux d'onglets */
.tab-panel-header {
  padding: 1.5rem 2rem 1rem 2rem;
  border-bottom: 1px solid #e2e8f0;
  background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
}

.tab-panel-header h3 {
  margin: 0 0 0.75rem 0;
  color: #1e293b;
  font-size: 1.25rem;
  font-weight: 600;
  font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
  font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.info-note.urgent {
  background-color: #fef3c7;
  border-color: #f59e0b;
  color: #92400e;
}

.info-note i {
  color: #4338ca;
  font-size: 1rem;
}

.info-note.urgent i {
  color: #f59e0b;
}

/* Tables personnalisées */
.table-wrapper {
  margin: 0;
  border-radius: 0;
  overflow: hidden;
  border: none;
  box-shadow: none;
}

.custom-table {
  width: 100%;
  border-collapse: collapse;
  font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.custom-table th {
  background-color: #4338ca;
  color: #ffffff;
  font-weight: 900;
  font-family: 'Satoshi Black', 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  padding: 1.25rem 1rem;
  text-align: left;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.075em;
}

.custom-table th:hover {
  background-color: #3730a3;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.custom-table th:focus {
  background-color: #3730a3;
  outline: 3px solid #fbbf24;
  outline-offset: -3px;
}

.custom-table td {
  padding: 1rem;
  vertical-align: middle;
  font-weight: 500;
  color: #374151;
  transition: all 0.2s ease;
  border-bottom: 1px solid #f1f5f9;
}

.custom-table tr:focus-within td {
  outline: 2px solid #4338ca;
  outline-offset: -2px;
}

.custom-table tr:nth-child(even) td {
  background-color: #f8fafc;
}

.custom-table tr:nth-child(even):focus-within td {
  outline: 2px solid #4338ca;
  outline-offset: -2px;
}

/* Action cells */
.action-cell {
  text-align: center;
}

/* Justify button */
.justify-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
  color: white;
  border: none;
  border-radius: 0.75rem;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(22, 163, 74, 0.2);
  font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.justify-btn:hover,
.justify-btn:focus {
  background: linear-gradient(135deg, #15803d 0%, #166534 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(22, 163, 74, 0.3);
  outline: 3px solid #fbbf24;
  outline-offset: 2px;
}

.justify-btn i {
  font-size: 1.125rem;
}

/* File actions */
.file-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  flex-wrap: wrap;
}

.file-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 500;
  font-size: 0.875rem;
  text-decoration: none;
  transition: all 0.2s ease;
  font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.file-btn-view {
  background-color: #3b82f6;
  color: white;
}

.file-btn-view:hover,
.file-btn-view:focus {
  background-color: #2563eb;
  transform: translateY(-1px);
  outline: 2px solid #fbbf24;
  outline-offset: 2px;
}

.file-btn-download {
  background-color: #6b7280;
  color: white;
}

.file-btn-download:hover,
.file-btn-download:focus {
  background-color: #4b5563;
  transform: translateY(-1px);
  outline: 2px solid #fbbf24;
  outline-offset: 2px;
}

.file-btn i {
  font-size: 1rem;
}

.no-file {
  color: #9ca3af;
  font-style: italic;
  font-size: 0.875rem;
}

/* Classe pour lecteurs d'écran uniquement */
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

/* Skip links pour navigation clavier */
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
  font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  transition: top 0.2s ease;
}

.skip-link:focus {
  top: 10px;
  outline: 3px solid #fbbf24;
  outline-offset: 2px;
}

/* Responsive - Tablette et mobile */
@media (max-width: 1024px) {
  .info-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .file-actions {
    flex-direction: column;
    align-items: center;
  }
  
  .tabs-nav {
    padding-bottom: 0.5rem;
  }
  
  .tab-button {
    padding: 0.75rem 1rem;
    font-size: 0.8rem;
    min-height: 50px;
  }
  
  .tab-button span:not(.tab-count) {
    display: none;
  }
  
  .tab-button i {
    font-size: 1.5rem;
  }
}

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
  
  .date-selector {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .tab-panel-header {
    padding: 1rem;
  }
  
  .custom-table th,
  .custom-table td {
    padding: 0.75rem 0.5rem;
    font-size: 0.875rem;
  }
  
  .file-actions {
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .file-btn {
    font-size: 0.75rem;
    padding: 0.375rem 0.75rem;
  }
  
  .tabs-nav {
    gap: 0.125rem;
  }
  
  .tab-button {
    padding: 0.5rem;
    min-width: 60px;
    min-height: 45px;
  }
}

/* Styles spécifiques PC */
@media (min-width: 1025px) {
  .profile-content {
    max-width: 1200px;
    margin: 0 auto;
  }
  
  .info-grid {
    grid-template-columns: repeat(4, 1fr);
  }
  
  .tabs-nav {
    padding-bottom: 1rem;
  }
}
</style>
