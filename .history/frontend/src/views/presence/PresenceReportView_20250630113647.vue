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
              
              <!-- Indicateur de synchronisation -->
              <div class="sync-indicator" v-if="isPageVisible" title="Mise à jour automatique toutes les 30 secondes">
                <i class="material-icons sync-icon">sync</i>
                <span class="sync-text">Synchronisation automatique</span>
              </div>
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
                  
                  <div v-if="lastModificationDate" class="summary-item" role="listitem" :aria-label="`Dernière modification le ${formatDate(lastModificationDate.toISOString())} à ${formatTime(lastModificationDate.toISOString())}`">
                    <i class="material-icons" aria-hidden="true">update</i>
                    <div class="modification-details">
                      <span class="modification-label">Dernière modification :</span>
                      <span class="modification-date">{{ formatDate(lastModificationDate.toISOString()) }}</span>
                      <span class="modification-time">{{ formatTime(lastModificationDate.toISOString()) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Alertes additionnelles -->
            <div v-if="sheet && unjustAbsenceRate > 10" class="additional-alerts" role="alert" aria-live="assertive" aria-atomic="true">
              <div class="alert-card warning" tabindex="0" :aria-label="`Alerte: Absences non justifiées élevées à ${unjustAbsenceRate} pourcent, dépassant le seuil de 10 pourcent`">
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
                  <div class="kpi-detail">{{ presentCount }}/{{ totalCount }} présents (retards inclus)</div>
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

            <!-- Aide navigation clavier -->
            <div class="keyboard-help" role="region" aria-labelledby="keyboard-help-title">
              <details class="keyboard-help-details">
                <summary id="keyboard-help-title" class="keyboard-help-summary">
                  <i class="material-icons" aria-hidden="true">keyboard</i>
                  Navigation clavier
                </summary>
                <div class="keyboard-help-content">
                  <div class="keyboard-shortcut">
                    <kbd>↑</kbd><kbd>↓</kbd> Naviguer entre les enfants
                  </div>
                  <div class="keyboard-shortcut">
                    <kbd>Home</kbd> Premier enfant
                  </div>
                  <div class="keyboard-shortcut">
                    <kbd>End</kbd> Dernier enfant
                  </div>
                  <div class="keyboard-shortcut">
                    <kbd>Tab</kbd> Naviguer entre les sections
                  </div>
                </div>
              </details>
            </div>

            <div class="table-container">
              <table class="modern-table" role="table" aria-label="Détail de présence par enfant" @keydown="handleTableNavigation">
                <thead>
                  <tr role="row">
                    <th scope="col" class="sortable" tabindex="0" role="columnheader" aria-sort="none" aria-label="Nom - Cliquer pour trier">
                      <div class="th-content">
                        <i class="material-icons" aria-hidden="true">person</i>
                        Nom
                      </div>
                    </th>
                    <th scope="col" class="sortable" tabindex="0" role="columnheader" aria-sort="none" aria-label="Prénom - Cliquer pour trier">
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
                    tabindex="0"
                    :aria-label="`${record.child.firstName} ${record.child.lastName} - ${record.present ? 'Présent' : 'Absent'}${record.justification ? ` - ${record.justification.type === 'ABSENCE' ? 'Absence' : 'Retard'}: ${record.justification.motif}` : ''}`"
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
            <div v-else class="no-data-content" role="status" aria-live="polite">
              <div class="no-data-icon" aria-hidden="true">
                <i class="material-icons">event_busy</i>
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
import { ref, computed, onMounted, onUnmounted } from 'vue';
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

// Présents = vraiment présents + retards justifiés (un retard = présent en retard)
const presentCount = computed(() => {
  if (!sheet.value) return 0;
  
  const actuallyPresent = sheet.value.records.filter(r => r.present).length;
  const lateButPresent = sheet.value.records.filter(r => r.justification?.type === 'LATENESS').length;
  
  return actuallyPresent + lateButPresent;
});

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

// Calcul de la vraie dernière modification
const lastModificationDate = computed(() => {
  if (!sheet.value) return null;
  
  // Collecter toutes les dates de modification possibles
  const dates = [];
  
  // Date de validation par l'éducateur
  if (sheet.value.validatedAtStaff) {
    dates.push(new Date(sheet.value.validatedAtStaff));
  }
  
  // Date de validation par la secrétaire  
  if (sheet.value.validatedAtSecretary) {
    dates.push(new Date(sheet.value.validatedAtSecretary));
  }
  
  // Dates de création des justifications
  sheet.value.records.forEach(record => {
    if (record.justification?.createdAt) {
      dates.push(new Date(record.justification.createdAt));
    }
  });
  
  // Si pas de dates de modification, utiliser la date de création de la feuille
  if (dates.length === 0) {
    return new Date(sheet.value.date);
  }
  
  // Retourner la date la plus récente
  return new Date(Math.max(...dates.map(d => d.getTime())));
});

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

// Navigation clavier dans le tableau
function handleTableNavigation(event: KeyboardEvent) {
  const target = event.target as HTMLElement;
  const tableRow = target.closest('tr[tabindex="0"]') as HTMLTableRowElement;
  
  if (!tableRow) return;
  
  const allRows = Array.from(tableRow.parentElement?.querySelectorAll('tr[tabindex="0"]') || []);
  const currentIndex = allRows.indexOf(tableRow);
  
  let nextRow: HTMLElement | null = null;
  
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      nextRow = allRows[currentIndex + 1] as HTMLElement;
      break;
    case 'ArrowUp':
      event.preventDefault();
      nextRow = allRows[currentIndex - 1] as HTMLElement;
      break;
    case 'Home':
      event.preventDefault();
      nextRow = allRows[0] as HTMLElement;
      break;
    case 'End':
      event.preventDefault();
      nextRow = allRows[allRows.length - 1] as HTMLElement;
      break;
  }
  
  if (nextRow) {
    nextRow.focus();
  }
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

// Système de rafraîchissement automatique
let refreshInterval: ReturnType<typeof setInterval> | null = null;
const isPageVisible = ref(true);

// Fonction de rafraîchissement silencieux (sans loader)
async function refreshData() {
  try {
    const currentLoading = store.loading;
    await store.fetchSheet();
    console.log('📊 Données du rapport rafraîchies automatiquement');
  } catch (error) {
    console.error('❌ Erreur lors du rafraîchissement automatique:', error);
  }
}

// Gestion de la visibilité de la page
function handleVisibilityChange() {
  isPageVisible.value = !document.hidden;
  
  if (isPageVisible.value) {
    // Page visible : relancer le rafraîchissement et mettre à jour immédiatement
    startAutoRefresh();
    refreshData();
  } else {
    // Page cachée : arrêter le rafraîchissement
    stopAutoRefresh();
  }
}

function startAutoRefresh() {
  stopAutoRefresh(); // S'assurer qu'il n'y a pas déjà un interval
  refreshInterval = setInterval(refreshData, 30000); // 30 secondes
  console.log('🔄 Rafraîchissement automatique activé (30s)');
}

function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
    console.log('⏹️ Rafraîchissement automatique arrêté');
  }
}

onMounted(() => {
  store.fetchSheet();
  startAutoRefresh();
  
  // Écouter les changements de visibilité de la page
  document.addEventListener('visibilitychange', handleVisibilityChange);
});

onUnmounted(() => {
  stopAutoRefresh();
  
  // Nettoyer les événements
  document.removeEventListener('visibilitychange', handleVisibilityChange);
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
