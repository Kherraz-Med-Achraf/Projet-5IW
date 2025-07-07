<template>
  <div class="report-wrapper">
    <!-- Skip links pour navigation rapide -->
    <div class="skip-links">
      <a href="#main-content" class="skip-link">Aller au contenu principal</a>
      <a href="#date-selector" class="skip-link">Aller au sélecteur de date</a>
      <a href="#kpi-section" class="skip-link">Aller aux indicateurs</a>
      <a href="#data-table" class="skip-link">Aller au tableau</a>
    </div>

    <main class="profile-container" role="main" lang="fr" id="main-content">
      <div class="profile-content">
        <div class="content-grid">
          
          <!-- Rapport de présence -->
          <div class="profile-section" id="date-selector">
            <div class="section-header">
              <h1 id="page-title">
                <i class="material-icons" aria-hidden="true">assessment</i>
                Rapport de présence
                <span class="child-count" v-if="sheet">
                  {{ totalCount }} enfant{{ totalCount > 1 ? 's' : '' }}
                </span>
              </h1>
            </div>

            <!-- Statut de la feuille -->
            <div v-if="sheet && shouldShowStatus" class="status-badge" :class="statusClass" role="status" :aria-label="`Statut: ${statusText}`">
              <i class="material-icons" aria-hidden="true">{{ statusIcon }}</i>
              {{ statusText }}
            </div>

            <!-- Configuration et actions -->
            <div class="config-grid">
              <!-- Configuration date et export -->
              <div class="config-block">
                <div class="date-selector">
                  <label for="date-picker" class="date-label">
                    <i class="material-icons" aria-hidden="true">event</i>
                    Date du rapport
                  </label>
                  <input
                    id="date-picker"
                    type="date"
                    v-model="date"
                    @change="onDateChange"
                    class="date-input"
                    :aria-describedby="sheet ? 'date-help' : undefined"
                  />
                  <div id="date-help" class="sr-only" v-if="sheet">
                    Rapport généré pour {{ totalCount }} enfants
                  </div>
                </div>

                <!-- Total enfants -->
                <div v-if="sheet" class="total-children" role="region" aria-labelledby="total-children-label">
                  <i class="material-icons" aria-hidden="true">groups</i>
                  <span id="total-children-label" class="total-label">Total enfants :</span>
                  <span class="total-value" :aria-label="`${totalCount} enfant${totalCount > 1 ? 's' : ''} au total`">{{ totalCount }}</span>
                </div>

                <div class="export-actions">
                  <button
                    @click="exportCSV"
                    class="export-btn export-csv"
                    :disabled="!sheet"
                    aria-label="Exporter les données au format CSV"
                  >
                    <i class="material-icons" aria-hidden="true">file_download</i>
                    CSV
                  </button>
                  <button
                    @click="exportPDF"
                    class="export-btn export-pdf"
                    :disabled="!sheet"
                    aria-label="Exporter les données au format PDF"
                  >
                    <i class="material-icons" aria-hidden="true">picture_as_pdf</i>
                    PDF
                  </button>
                </div>
              </div>

              <!-- Informations de validation -->
              <div class="config-block" v-if="sheet" role="region" aria-labelledby="validation-title">
                <h3 id="validation-title" class="config-title">
                  <i class="material-icons" aria-hidden="true">verified</i>
                  Validation et suivi
                </h3>
                
                <div class="summary-display" role="list">
                  <div v-if="sheet.validatedAtStaff && sheet.staff" class="summary-item validation-info" role="listitem" :aria-label="`Validé par ${sheet.staff.staffProfile.firstName} ${sheet.staff.staffProfile.lastName} le ${formatDateTime(sheet.validatedAtStaff)}`">
                    <i class="material-icons" aria-hidden="true">person_check</i>
                    <div class="validation-details">
                      <span class="validation-label">Validé par :</span>
                      <span class="validation-staff">{{ sheet.staff.staffProfile.firstName }} {{ sheet.staff.staffProfile.lastName }}</span>
                      <span class="validation-date">{{ formatDateTime(sheet.validatedAtStaff) }}</span>
                    </div>
                  </div>
                  
                  <div v-else-if="sheet.status === 'PENDING_STAFF'" class="summary-item pending-validation" role="listitem" aria-label="En attente de validation par le personnel">
                    <i class="material-icons" aria-hidden="true">pending</i>
                    <span class="summary-label">En attente de validation staff</span>
                  </div>
                  
                  <div v-else class="summary-item draft-status" role="listitem" aria-label="Statut brouillon, non validé">
                    <i class="material-icons" aria-hidden="true">edit_note</i>
                    <span class="summary-label">Brouillon - Non validé</span>
                  </div>
                  
                  <div class="summary-item" role="listitem" :aria-label="`Dernière modification le ${formatDate(sheet.date)} à ${formatTime(sheet.date)}`">
                    <i class="material-icons" aria-hidden="true">update</i>
                    <div class="modification-details">
                      <span class="modification-label">Dernière modification :</span>
                      <span class="modification-date">{{ formatDate(sheet.date) }}</span>
                      <span class="modification-time">{{ formatTime(sheet.date) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Alertes additionnelles -->
            <div v-if="sheet && unjustAbsenceRate > 10" class="additional-alerts" role="alert" aria-live="polite">
              <div class="alert-card warning">
                <i class="material-icons" aria-hidden="true">report_problem</i>
                <div class="alert-content">
                  <h3>Absences non justifiées élevées</h3>
                  <p>{{ unjustAbsenceRate }}% (seuil: 10%)</p>
                </div>
              </div>
            </div>
          </div>

          <!-- KPI Dashboard -->
          <div v-if="sheet" class="profile-section" id="kpi-section">
            <div class="section-header">
              <h2>
                <i class="material-icons" aria-hidden="true">analytics</i>
                Indicateurs de performance
              </h2>
            </div>

            <div class="kpi-grid" role="group" aria-labelledby="kpi-section">
              <div class="kpi-card attendance" :class="{ 'kpi-critical': attendanceRate < 75 }" tabindex="0" role="article" :aria-label="`Taux de présence: ${attendanceRate} pourcent. ${presentCount} enfants présents sur ${totalCount}`">
                <div class="kpi-icon">
                  <i class="material-icons" aria-hidden="true">people</i>
                </div>
                <div class="kpi-content">
                  <h3>Taux de présence</h3>
                  <div class="kpi-value" aria-hidden="true">
                    {{ attendanceRate }}<span class="kpi-unit">%</span>
                  </div>
                  <div class="kpi-detail">{{ presentCount }}/{{ totalCount }} présents</div>
                </div>
              </div>

              <div class="kpi-card lateness" tabindex="0" role="article" :aria-label="`Taux de retard: ${latenessRate} pourcent. ${latenessCount} retard${latenessCount > 1 ? 's' : ''}`">
                <div class="kpi-icon">
                  <i class="material-icons" aria-hidden="true">schedule</i>
                </div>
                <div class="kpi-content">
                  <h3>Taux de retard</h3>
                  <div class="kpi-value" aria-hidden="true">
                    {{ latenessRate }}<span class="kpi-unit">%</span>
                  </div>
                  <div class="kpi-detail">{{ latenessCount }} retard{{ latenessCount > 1 ? 's' : '' }}</div>
                </div>
              </div>

              <div class="kpi-card unjustified-absences" :class="{ 'kpi-warning': unjustAbsenceRate > 10 }" tabindex="0" role="article" :aria-label="`Absences injustifiées: ${unjustAbsenceRate} pourcent. ${unjustAbsCount} enfant${unjustAbsCount > 1 ? 's' : ''}`">
                <div class="kpi-icon">
                  <i class="material-icons" aria-hidden="true">person_off</i>
                </div>
                <div class="kpi-content">
                  <h3>Absences injustifiées</h3>
                  <div class="kpi-value" aria-hidden="true">
                    {{ unjustAbsenceRate }}<span class="kpi-unit">%</span>
                  </div>
                  <div class="kpi-detail">{{ unjustAbsCount }} enfant{{ unjustAbsCount > 1 ? 's' : '' }}</div>
                </div>
              </div>

              <div class="kpi-card justified-absences" tabindex="0" role="article" :aria-label="`Absences justifiées: ${justifiedAbsenceRate} pourcent. ${justifiedAbsCount} enfant${justifiedAbsCount > 1 ? 's' : ''}`">
                <div class="kpi-icon">
                  <i class="material-icons" aria-hidden="true">event_busy</i>
                </div>
                <div class="kpi-content">
                  <h3>Absences justifiées</h3>
                  <div class="kpi-value" aria-hidden="true">
                    {{ justifiedAbsenceRate }}<span class="kpi-unit">%</span>
                  </div>
                  <div class="kpi-detail">{{ justifiedAbsCount }} enfant{{ justifiedAbsCount > 1 ? 's' : '' }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Tableau des données -->
          <div v-if="sheet" class="profile-section" id="data-table">
            <div class="section-header">
              <h2>
                <i class="material-icons" aria-hidden="true">table_chart</i>
                Détail par enfant
              </h2>
            </div>

            <!-- Barre de recherche -->
            <div class="search-container">
              <div class="search-input-wrapper">
                <i class="material-icons search-icon" aria-hidden="true">search</i>
                <input
                  type="text"
                  v-model="searchQuery"
                  placeholder="Rechercher un enfant par nom ou prénom..."
                  class="search-input"
                  aria-label="Rechercher un enfant"
                />
                <button
                  v-if="searchQuery"
                  @click="clearSearch"
                  class="clear-search-btn"
                  aria-label="Effacer la recherche"
                >
                  <i class="material-icons" aria-hidden="true">clear</i>
                </button>
              </div>
              <div v-if="searchQuery && filteredRecords.length !== sheet.records.length" class="search-results" role="status" aria-live="polite">
                {{ filteredRecords.length }} résultat{{ filteredRecords.length > 1 ? 's' : '' }} trouvé{{ filteredRecords.length > 1 ? 's' : '' }}
              </div>
            </div>

            <div class="table-container">
              <table class="modern-table" role="table" aria-label="Détail de présence par enfant">
                <thead>
                  <tr role="row">
                    <th scope="col" class="sortable" tabindex="0" role="columnheader" aria-sort="none">
                      <div class="th-content">
                        <i class="material-icons" aria-hidden="true">person</i>
                        Nom
                      </div>
                    </th>
                    <th scope="col" class="sortable" tabindex="0" role="columnheader" aria-sort="none">
                      <div class="th-content">
                        <i class="material-icons" aria-hidden="true">badge</i>
                        Prénom
                      </div>
                    </th>
                    <th scope="col" class="text-center" role="columnheader">
                      <div class="th-content">
                        <i class="material-icons" aria-hidden="true">check_circle</i>
                        Présence
                      </div>
                    </th>
                    <th scope="col" role="columnheader">
                      <div class="th-content">
                        <i class="material-icons" aria-hidden="true">description</i>
                        Justification
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="record in filteredRecords"
                    :key="record.id"
                    class="table-row"
                    :class="{ 'absent-row': !record.present, 'unjustified-row': !record.present && !record.justification }"
                    role="row"
                  >
                    <td class="name-cell" role="gridcell">
                      <div class="cell-content">
                        {{ record.child.lastName }}
                      </div>
                    </td>
                    <td class="name-cell" role="gridcell">
                      <div class="cell-content">
                        {{ record.child.firstName }}
                      </div>
                    </td>
                    <td class="presence-cell text-center" role="gridcell">
                      <div class="presence-indicator" :class="{ 'present': record.present, 'absent': !record.present }">
                        <i class="material-icons" aria-hidden="true">
                          {{ record.present ? 'check_circle' : 'cancel' }}
                        </i>
                        <span class="sr-only">{{ record.present ? 'Présent' : 'Absent' }}</span>
                      </div>
                    </td>
                    <td class="justification-cell" role="gridcell">
                      <div v-if="record.justification" class="justification-content">
                        <div class="justification-type" :class="record.justification.type.toLowerCase()">
                          <i class="material-icons" aria-hidden="true">
                            {{ record.justification.type === 'ABSENCE' ? 'event_busy' : 'schedule' }}
                          </i>
                          {{ record.justification.type === 'ABSENCE' ? 'Absence' : 'Retard' }}
                        </div>
                        <div class="justification-motif">{{ record.justification.motif }}</div>
                        <div class="justification-date">
                          <i class="material-icons" aria-hidden="true">date_range</i>
                          {{ formatDate(record.justification.justificationDate) }}
                        </div>
                      </div>
                      <div v-else class="no-justification">
                        <i class="material-icons" aria-hidden="true">remove</i>
                        <span class="sr-only">Aucune justification</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- État de chargement ou absence de données -->
          <div v-else class="profile-section loading-section">
            <div v-if="store.loading" class="loading-content">
              <div class="loading-spinner" aria-hidden="true"></div>
              <h2>Chargement du rapport...</h2>
              <p>Récupération des données de présence</p>
            </div>
            <div v-else class="no-data-content">
              <div class="no-data-icon">
                <i class="material-icons" aria-hidden="true">event_busy</i>
              </div>
              <h2>Aucune feuille de présence</h2>
              <p>Aucune feuille de présence n'a été créée pour le {{ formatDate(date) }}.</p>
              <p class="no-data-hint">Il faut attendre qu'un éducateur valide la feuille de présence pour pouvoir consulter les données.</p>
            </div>
          </div>

        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { usePresenceStore } from '@/stores/presenceStore';
import { useNotificationStore } from '@/stores/notificationStore';

const store = usePresenceStore();
const notify = useNotificationStore();

const date = ref(store.date);
const sheet = computed(() => store.sheet);

// Recherche
const searchQuery = ref('');

// Enregistrements filtrés
const filteredRecords = computed(() => {
  if (!sheet.value || !searchQuery.value.trim()) {
    return sheet.value?.records || [];
  }
  
  const query = searchQuery.value.toLowerCase().trim();
  return sheet.value.records.filter(record => 
    record.child.firstName.toLowerCase().includes(query) ||
    record.child.lastName.toLowerCase().includes(query)
  );
});

// Statut de la feuille
const statusText = computed(() => {
  if (!sheet.value) return '';
  switch (sheet.value.status) {
    case 'PENDING_STAFF':
      return "En cours de validation par l'éducateur";
    case 'VALIDATED':
      return "Feuille entièrement validée";
    default:
      return 'Brouillon';
  }
});

const statusClass = computed(() => {
  if (!sheet.value) return '';
  switch (sheet.value.status) {
    case 'PENDING_STAFF':
      return 'status-pending-staff';
    case 'VALIDATED':
      return 'status-validated';
    default:
      return 'status-draft';
  }
});

const statusIcon = computed(() => {
  if (!sheet.value) return '';
  switch (sheet.value.status) {
    case 'PENDING_STAFF':
      return 'pending';
    case 'VALIDATED':
      return 'verified';
    default:
      return 'edit_note';
  }
});

// Détermine si on doit afficher le badge de statut (pas pour les brouillons)
const shouldShowStatus = computed(() => {
  if (!sheet.value) return false;
  return sheet.value.status === 'PENDING_STAFF' || sheet.value.status === 'VALIDATED';
});

// Filtrages et comptes
const totalCount = computed(() => sheet.value?.records.length || 0);
const presentCount = computed(() =>
  sheet.value?.records.filter(r => r.present).length || 0
);
const unjustAbsCount = computed(() =>
  sheet.value?.records.filter(r => !r.present && !r.justification).length ||
  0
);
const latenessCount = computed(() =>
  sheet.value?.records.filter(r => r.justification?.type === 'LATENESS').length ||
  0
);
const justifiedAbsCount = computed(() =>
  sheet.value?.records.filter(r => r.justification?.type === 'ABSENCE').length ||
  0
);

// KPIs
const attendanceRate = computed(() =>
  totalCount.value
    ? Number(((presentCount.value / totalCount.value) * 100).toFixed(0))
    : 0
);
const unjustAbsenceRate = computed(() =>
  totalCount.value
    ? Number(((unjustAbsCount.value / totalCount.value) * 100).toFixed(0))
    : 0
);
const latenessRate = computed(() =>
  totalCount.value
    ? Number(((latenessCount.value / totalCount.value) * 100).toFixed(0))
    : 0
);
const justifiedAbsenceRate = computed(() =>
  totalCount.value
    ? Number(((justifiedAbsCount.value / totalCount.value) * 100).toFixed(0))
    : 0
);

// Note: Les alertes sont maintenant gérées individuellement dans le template

// Utilitaires
function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });
}

function formatDateTime(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatTime(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleTimeString('fr-FR', { 
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Handlers
function onDateChange() {
  store.setDate(date.value);
  store.fetchSheet();
}

function clearSearch() {
  searchQuery.value = '';
}

async function exportCSV() {
  try {
    if (!sheet.value) throw new Error('Aucune donnée à exporter');
    
    // Générer le CSV manuellement avec les colonnes simplifiées
    const headers = ['Nom', 'Prénom', 'Présence', 'Justification'];
    const csvData = [headers];
    
    sheet.value.records.forEach(record => {
      let presence = 'Présent';
      let justification = '';
      
      if (!record.present) {
        if (record.justification?.type === 'LATENESS') {
          presence = 'Retard';
          justification = record.justification.motif || '';
        } else {
          presence = 'Absent';
          justification = record.justification?.motif || '';
        }
      }
      
      csvData.push([
        record.child.lastName,
        record.child.firstName,
        presence,
        justification
      ]);
    });
    
    // Convertir en CSV
    const csvContent = csvData.map(row => 
      row.map(field => `"${field.toString().replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    // Créer et télécharger le fichier
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport-presence-${date.value}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    notify.showNotification('Export CSV réussi', 'success');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    notify.showNotification(`Erreur export CSV: ${errorMessage}`, 'error');
  }
}

async function exportPDF() {
  try {
    if (!sheet.value) throw new Error('Aucune donnée à exporter');
    
    // Générer le contenu HTML pour le PDF
    const htmlContent = generatePDFContent();
    
    // Créer une nouvelle fenêtre pour l'impression
    const printWindow = window.open('', '_blank');
    if (!printWindow) throw new Error('Impossible d\'ouvrir la fenêtre d\'impression');
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Attendre que le contenu soit chargé puis imprimer
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
    
    notify.showNotification('Export PDF réussi', 'success');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    notify.showNotification(`Erreur export PDF: ${errorMessage}`, 'error');
  }
}

function generatePDFContent() {
  if (!sheet.value) return '';
  
  const formattedDate = new Date(date.value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric'
  });
  
  let tableRows = '';
  sheet.value.records.forEach(record => {
    let presence = 'Présent';
    let justification = '';
    
    if (!record.present) {
      if (record.justification?.type === 'LATENESS') {
        presence = 'Retard';
        justification = record.justification.motif || '';
      } else {
        presence = 'Absent';
        justification = record.justification?.motif || '';
      }
    }
    
    tableRows += `
      <tr>
        <td>${record.child.lastName}</td>
        <td>${record.child.firstName}</td>
        <td>${presence}</td>
        <td>${justification}</td>
      </tr>
    `;
  });
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Rapport de présence - ${formattedDate}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; text-align: center; margin-bottom: 30px; }
        .info { margin-bottom: 20px; text-align: center; color: #666; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .stats { margin-top: 20px; text-align: center; }
      </style>
    </head>
    <body>
      <h1>Rapport de présence</h1>
      <div class="info">
        <p>Date : ${formattedDate}</p>
        <p>Nombre total d'enfants : ${totalCount.value}</p>
        <p>Taux de présence : ${attendanceRate.value}%</p>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Nom</th>
            <th>Prénom</th>
            <th>Présence</th>
            <th>Justification</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
      
      <div class="stats">
        <p>Présents : ${presentCount.value} | Absents : ${totalCount.value - presentCount.value} | Retards : ${latenessCount.value}</p>
      </div>
    </body>
    </html>
  `;
}

onMounted(() => {
  store.fetchSheet();
});
</script>

<style scoped>
/* ===== BASE STYLES (REPRENDRE LE DESIGN MODERNE) ===== */

/* Wrapper pour éviter les erreurs de transition Vue */
.report-wrapper {
  width: 100%;
  min-height: 100vh;
}

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

/* ===== STATUT DE LA FEUILLE ===== */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 0.75rem;
  font-weight: 600;
  font-size: 0.875rem;
  font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.status-pending-staff {
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  color: #92400e;
  border: 1px solid #f59e0b;
}

.status-draft {
  background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
  color: #475569;
  border: 1px solid #cbd5e1;
}

.status-validated {
  background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
  color: #047857;
  border: 1px solid #10b981;
}

/* ===== CONFIGURATION ET ALERTES ===== */
.config-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
}

@media (min-width: 768px) {
  .config-grid {
    grid-template-columns: 1fr 300px;
  }
}

.config-block {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 0.75rem;
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
}

.config-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 1rem 0;
  font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.config-title i {
  color: #4338ca;
  font-size: 1.25rem;
}

.attendance-display {
  text-align: center;
  padding: 1.5rem;
  border-radius: 0.75rem;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border: 2px solid #e2e8f0;
  transition: all 0.3s ease;
}

.attendance-display.critical {
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
  border-color: #ef4444;
  box-shadow: 0 4px 6px rgba(239, 68, 68, 0.1);
}

.attendance-value {
  font-size: 3rem;
  font-weight: 700;
  color: #1e293b;
  line-height: 1;
  margin-bottom: 0.5rem;
  font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.attendance-display.critical .attendance-value {
  color: #dc2626;
}

.attendance-value .unit {
  font-size: 1.5rem;
  color: #6b7280;
  font-weight: 500;
}

.attendance-detail {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
  margin-bottom: 0.75rem;
}

.critical-warning {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #dc2626;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.critical-warning i {
  font-size: 1rem;
}

.additional-alerts {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e2e8f0;
}

.date-selector {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
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
  transition: all 0.2s ease;
  font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: white;
}

.date-input:focus {
  outline: 3px solid #0ea5e9;
  outline-offset: 2px;
  border-color: #0ea5e9;
  box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.2);
}

.total-children {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  margin-top: 1.5rem;
  margin-bottom: 1.5rem;
}

.total-children i {
  color: #4338ca;
  font-size: 1.5rem;
}

.total-label {
  font-weight: 500;
  color: #334155;
  font-size: 0.875rem;
}

.total-value {
  font-weight: 700;
  color: #1e293b;
  font-size: 1.25rem;
  margin-left: auto;
}

.export-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
}

.export-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 0.875rem;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.export-csv {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);
}

.export-csv:hover:not(:disabled) {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(16, 185, 129, 0.4);
}

.export-pdf {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
}

.export-pdf:hover:not(:disabled) {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(59, 130, 246, 0.4);
}

.export-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.export-btn:focus {
  outline: 3px solid #0ea5e9;
  outline-offset: 2px;
}

/* ===== ALERTES ===== */
.alert-section {
  background: linear-gradient(135deg, #fef2f2 0%, #fecaca 100%);
  border: 1px solid #fecaca;
}

.alerts-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 768px) {
  .alerts-grid {
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  }
}

.alert-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-radius: 0.75rem;
  font-weight: 600;
  color: white;
}

.alert-card.critical {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  box-shadow: 0 4px 6px rgba(239, 68, 68, 0.3);
}

.alert-card.warning {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  box-shadow: 0 4px 6px rgba(245, 158, 11, 0.3);
}

.alert-card i {
  font-size: 2rem;
}

.alert-content h3 {
  margin: 0 0 0.25rem 0;
  font-size: 1rem;
}

.alert-content p {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
}

/* ===== KPI DASHBOARD ===== */
.kpi-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
}

@media (min-width: 640px) {
  .kpi-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .kpi-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.kpi-card {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 1rem;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
}

.kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.kpi-card.kpi-critical {
  border-color: #ef4444;
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
}

.kpi-card.kpi-warning {
  border-color: #f59e0b;
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
}

.kpi-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border-radius: 0.75rem;
  background: linear-gradient(135deg, #4338ca 0%, #3730a3 100%);
  color: white;
  flex-shrink: 0;
}

.kpi-icon i {
  font-size: 1.5rem;
}

.kpi-content {
  flex: 1;
}

.kpi-content h3 {
  margin: 0 0 0.5rem 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.kpi-value {
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
  line-height: 1;
  margin-bottom: 0.25rem;
  font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.kpi-unit {
  font-size: 1.25rem;
  color: #6b7280;
  font-weight: 500;
}

.kpi-detail {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
}

/* ===== TABLEAU MODERNE ===== */
.table-container {
  overflow-x: auto;
  border-radius: 0.75rem;
  border: 1px solid #e2e8f0;
  background: white;
}

.modern-table {
  width: 100%;
  border-collapse: collapse;
  font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.modern-table thead {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
}

.modern-table th {
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 2px solid #e2e8f0;
  position: relative;
}

.modern-table th.text-center {
  text-align: center;
}

.th-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.th-content i {
  color: #4338ca;
  font-size: 1.125rem;
}

.modern-table th.sortable {
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.modern-table th.sortable:hover {
  background-color: #e2e8f0;
}

.modern-table th.sortable:focus {
  outline: 3px solid #0ea5e9;
  outline-offset: 2px;
}

.modern-table tbody tr {
  transition: all 0.2s ease;
}

.modern-table tbody tr:hover {
  background-color: #f8fafc;
}

.modern-table tbody tr.absent-row {
  background-color: #fef2f2;
}

.modern-table tbody tr.unjustified-row {
  background-color: #fef2f2;
  border-left: 4px solid #ef4444;
}

.modern-table td {
  padding: 1rem;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: top;
}

.cell-content {
  font-weight: 500;
  color: #1e293b;
}

.name-cell {
  font-weight: 600;
}

.presence-cell {
  text-align: center;
}

.presence-indicator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  font-weight: 600;
}

.presence-indicator.present {
  background-color: #dcfce7;
  color: #16a34a;
}

.presence-indicator.absent {
  background-color: #fee2e2;
  color: #dc2626;
}

.justification-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.justification-type {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.justification-type.absence {
  background-color: #fef3c7;
  color: #92400e;
}

.justification-type.lateness {
  background-color: #dbeafe;
  color: #1d4ed8;
}

.justification-motif {
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;
}

.justification-date {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: #6b7280;
}

.justification-date i {
  font-size: 0.875rem;
}

.no-justification {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
}

/* ===== RÉSUMÉ DU RAPPORT ===== */
.summary-display {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 0.5rem;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}

.summary-item:hover {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  transform: translateX(2px);
}

.summary-item i {
  color: #4338ca;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.summary-label {
  font-weight: 500;
  color: #475569;
  flex-shrink: 0;
}

.summary-value {
  font-weight: 600;
  color: #1e293b;
  margin-left: auto;
}

/* Styles spécifiques pour la validation */
.validation-info {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  border: 1px solid #16a34a;
}

.validation-info i {
  color: #16a34a;
}

.validation-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.validation-label {
  font-weight: 600;
  color: #14532d;
  font-size: 0.875rem;
}

.validation-staff {
  font-weight: 700;
  color: #1e293b;
  font-size: 0.9rem;
}

.validation-date {
  font-size: 0.8rem;
  color: #059669;
  font-weight: 500;
}

.pending-validation {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border: 1px solid #f59e0b;
}

.pending-validation i {
  color: #f59e0b;
}

.pending-validation .summary-label {
  color: #92400e;
  font-weight: 600;
}

.draft-status {
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  border: 1px solid #94a3b8;
}

.draft-status i {
  color: #64748b;
}

.draft-status .summary-label {
  color: #475569;
  font-weight: 600;
}

/* Styles pour la dernière modification */
.modification-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.modification-label {
  font-weight: 600;
  color: #475569;
  font-size: 0.875rem;
}

.modification-date {
  font-weight: 700;
  color: #1e293b;
  font-size: 0.9rem;
}

.modification-time {
  font-size: 0.8rem;
  color: #1e293b;
  font-weight: 500;
}

/* ===== BARRE DE RECHERCHE ===== */
.search-container {
  margin-bottom: 1.5rem;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  max-width: 400px;
}

.search-icon {
  position: absolute;
  left: 1rem;
  color: #6b7280;
  font-size: 1.25rem;
  z-index: 1;
}

.search-input {
  width: 100%;
  padding: 0.875rem 1rem 0.875rem 3rem;
  border: 2px solid #e2e8f0;
  border-radius: 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #1e293b;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  transition: all 0.3s ease;
  font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.search-input:focus {
  border-color: #4338ca;
  box-shadow: 
    0 0 0 3px rgba(67, 56, 202, 0.1),
    0 4px 6px rgba(0, 0, 0, 0.05);
  background: #ffffff;
  outline: none;
}

.search-input::placeholder {
  color: #9ca3af;
  font-weight: 400;
}

.clear-search-btn {
  position: absolute;
  right: 0.5rem;
  background: none;
  border: none;
  padding: 0.5rem;
  border-radius: 0.375rem;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.clear-search-btn:hover {
  background-color: #f3f4f6;
  color: #374151;
}

.clear-search-btn:active {
  transform: scale(0.95);
}

.search-results {
  margin-top: 0.75rem;
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  border: 1px solid #93c5fd;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #1e40af;
  max-width: 400px;
}

/* ===== CHARGEMENT ET ABSENCE DE DONNÉES ===== */
.loading-section {
  text-align: center;
  padding: 4rem 2rem;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.no-data-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  padding: 2rem;
}

.no-data-icon {
  width: 4rem;
  height: 4rem;
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  border: 2px solid #cbd5e1;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.no-data-icon i {
  font-size: 2rem;
  color: #64748b;
}

.no-data-content h2 {
  margin: 0;
  color: #1e293b;
  font-size: 1.5rem;
  font-weight: 600;
  font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.no-data-content p {
  margin: 0;
  color: #64748b;
  text-align: center;
  max-width: 400px;
}

.no-data-hint {
  font-size: 0.875rem;
  color: #94a3b8;
  font-style: italic;
}

.loading-spinner {
  width: 3rem;
  height: 3rem;
  border: 3px solid #e2e8f0;
  border-top: 3px solid #4338ca;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-content h2 {
  margin: 0;
  color: #1e293b;
  font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.loading-content p {
  margin: 0;
  color: #6b7280;
}

/* ===== AMÉLIORATIONS D'ACCESSIBILITÉ ===== */

/* Skip links pour navigation rapide */
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
  background: #1e293b;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.875rem;
  transition: top 0.2s ease;
}

.skip-link:focus {
  top: 10px;
  outline: 3px solid #0ea5e9;
  outline-offset: 2px;
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

/* Focus indicators améliorés pour accessibilité */
*:focus {
  outline: 3px solid #0ea5e9;
  outline-offset: 2px;
}

/* Focus spécifique pour les éléments interactifs */
.kpi-card:focus {
  outline: 3px solid #0ea5e9;
  outline-offset: 2px;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.total-children:focus-within {
  outline: 2px solid #0ea5e9;
  outline-offset: 2px;
}

.summary-item:focus-within {
  outline: 2px solid #0ea5e9;
  outline-offset: 2px;
}

/* Responsive */
@media (max-width: 768px) {
  .profile-content {
    padding: 0 0.5rem;
  }
  
  .profile-section {
    padding: 1.5rem;
  }
  
  .section-header h1,
  .section-header h2 {
    font-size: 1.25rem;
  }
  
  .config-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  
  .config-block {
    padding: 1rem;
  }
  
  .attendance-value {
    font-size: 2.5rem;
  }
  
  .kpi-grid {
    grid-template-columns: 1fr;
  }
  
  .export-actions {
    flex-direction: column;
  }
  
  .modern-table {
    font-size: 0.875rem;
  }
  
  .modern-table th,
  .modern-table td {
    padding: 0.75rem 0.5rem;
  }
}
</style>
