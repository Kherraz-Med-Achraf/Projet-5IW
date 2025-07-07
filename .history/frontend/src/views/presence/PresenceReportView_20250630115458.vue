<template>
  <div class="report-wrapper">
    <main class="profile-container" role="main" lang="fr" id="main-content">
      <div class="profile-content">
        <div class="content-grid">
          
          <!-- En-tête moderne du rapport -->
          <div class="report-header">
            <div class="header-content">
              <div class="title-section">
                <div class="report-icon">
                  <i class="material-icons">assessment</i>
                </div>
                <div class="title-info">
                  <h1>Rapport de présence</h1>
                  <p class="subtitle" v-if="sheet">{{ totalCount }} enfant{{ totalCount > 1 ? 's' : '' }} inscrit{{ totalCount > 1 ? 's' : '' }}</p>
                </div>
              </div>
              
              <!-- Statut de validation -->
              <div v-if="sheet && shouldShowStatus" class="status-indicator" :class="statusClass">
                <i class="material-icons">{{ statusIcon }}</i>
                <span>{{ statusText }}</span>
              </div>
            </div>
          </div>

          <!-- Panneau de contrôle -->
          <div class="control-panel">
            <!-- Configuration et Export -->
            <div class="control-card config-export-card">
              <div class="card-header">
                <i class="material-icons">settings</i>
                <h3>Configuration et Export</h3>
              </div>
              <div class="card-content">
                <div class="config-export-content">
                  <!-- Sélection de date -->
                  <div class="date-section">
                    <label for="date-picker" class="input-label">
                      <i class="material-icons">event</i>
                      Date du rapport
                    </label>
                    <input
                      id="date-picker"
                      type="date"
                      v-model="date"
                      @change="onDateChange"
                      class="modern-date-input"
                    />
                  </div>

                  <!-- Actions d'export -->
                  <div class="export-section">
                    <span class="input-label">
                      <i class="material-icons">file_download</i>
                      Exporter les données
                    </span>
                    <div class="export-buttons">
                      <button
                        @click="exportCSV"
                        class="export-btn csv-btn"
                        :disabled="!sheet"
                      >
                        <i class="material-icons">table_chart</i>
                        <span>CSV</span>
                      </button>
                      <button
                        @click="exportPDF"
                        class="export-btn pdf-btn"
                        :disabled="!sheet"
                      >
                        <i class="material-icons">picture_as_pdf</i>
                        <span>PDF</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Informations de validation -->
            <div class="control-card validation-card" v-if="sheet">
              <div class="card-header">
                <i class="material-icons">verified</i>
                <h3>Validation</h3>
              </div>
              <div class="card-content">
                <div class="validation-info">
                  <div v-if="sheet.validatedAtStaff && sheet.staff" class="validation-item validated">
                    <div class="validation-details">
                      <p class="validator-name">{{ sheet.staff.staffProfile.firstName }} {{ sheet.staff.staffProfile.lastName }}</p>
                      <p class="validation-date">{{ formatDateTime(sheet.validatedAtStaff) }}</p>
                    </div>
                    <i class="material-icons status-icon">check_circle</i>
                  </div>
                  
                  <div v-else-if="sheet.status === 'PENDING_STAFF'" class="validation-item pending">
                    <div class="validation-details">
                      <p class="status-text">En attente de validation</p>
                    </div>
                    <i class="material-icons status-icon">pending</i>
                  </div>
                  
                  <div v-else class="validation-item draft">
                    <div class="validation-details">
                      <p class="status-text">Brouillon non validé</p>
                    </div>
                    <i class="material-icons status-icon">edit_note</i>
                  </div>
                </div>
                
                <div v-if="lastModificationDate" class="last-update">
                  <small>
                    <i class="material-icons">update</i>
                    Modifié le {{ formatDate(lastModificationDate.toISOString()) }} à {{ formatTime(lastModificationDate.toISOString()) }}
                  </small>
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
  const isPageVisible = !document.hidden;
  
  if (isPageVisible) {
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

/* ===== EN-TÊTE MODERNE ===== */
.report-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 1.5rem;
  padding: 2.5rem 2rem;
  color: white;
  box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
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

.report-icon {
  width: 4rem;
  height: 4rem;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.report-icon i {
  font-size: 2rem;
  color: white;
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
  font-weight: 600;
  font-size: 0.9rem;
}

.status-indicator.status-pending-staff {
  background: rgba(251, 191, 36, 0.9);
  color: #92400e;
}

.status-indicator.status-validated {
  background: rgba(52, 211, 153, 0.9);
  color: #047857;
}

.status-indicator.status-draft {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

/* ===== PANNEAU DE CONTRÔLE ===== */
.control-panel {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

.control-card {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 1rem;
  padding: 0;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
  overflow: hidden;
}

.control-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1), 0 3px 6px rgba(0, 0, 0, 0.08);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1rem 0.75rem 1rem;
  border-bottom: 1px solid #f1f5f9;
}

.card-header i {
  color: #4338ca;
  font-size: 1.5rem;
}

.card-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #1e293b;
  font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.card-content {
  padding: 0.75rem 1rem 1rem 1rem;
}

/* ===== CARTE CONFIG-EXPORT ===== */
.config-export-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  align-items: stretch;
}

.date-section {
  flex: 1;
}

.export-section {
  flex: 1;
}

.input-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.75rem;
  font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.input-label i {
  color: #6b7280;
  font-size: 1.125rem;
}

.modern-date-input {
  width: 100%;
  padding: 0.875rem 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 0.75rem;
  font-size: 1rem;
  font-weight: 500;
  color: #1e293b;
  background: white;
  transition: all 0.2s ease;
  font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.modern-date-input:focus {
  outline: none;
  border-color: #4338ca;
  box-shadow: 0 0 0 3px rgba(67, 56, 202, 0.1);
}

.export-buttons {
  display: flex;
  gap: 0.75rem;
}

.export-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 0.5rem;
  border: none;
  border-radius: 0.75rem;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.csv-btn {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);
}

.csv-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(16, 185, 129, 0.4);
}

.pdf-btn {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
}

.pdf-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(59, 130, 246, 0.4);
}

.export-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.export-btn i {
  font-size: 1.25rem;
}

/* ===== CARTE VALIDATION ===== */
.validation-info {
  margin-bottom: 1rem;
}

.validation-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-radius: 0.75rem;
  border: 1px solid #e2e8f0;
}

.validation-item.validated {
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
  border-color: #10b981;
}

.validation-item.pending {
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
  border-color: #f59e0b;
}

.validation-item.draft {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-color: #cbd5e1;
}

.validation-details {
  flex: 1;
}

.validator-name {
  margin: 0;
  font-weight: 600;
  color: #1e293b;
  font-size: 0.9rem;
}

.validation-date,
.status-text {
  margin: 0.25rem 0 0 0;
  font-size: 0.8rem;
  color: #6b7280;
}

.status-text {
  font-weight: 500;
  color: #1e293b;
}

.status-icon {
  font-size: 1.5rem;
}

.validation-item.validated .status-icon {
  color: #10b981;
}

.validation-item.pending .status-icon {
  color: #f59e0b;
}

.validation-item.draft .status-icon {
  color: #6b7280;
}

.last-update {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #f1f5f9;
}

.last-update small {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #6b7280;
  font-size: 0.75rem;
}

.last-update i {
  font-size: 1rem;
}

/* ===== KPI DASHBOARD ===== */
.profile-section {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
}

.profile-section:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1), 0 3px 6px rgba(0, 0, 0, 0.08);
}

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

.modern-table tbody tr:focus {
  outline: 3px solid #0ea5e9;
  outline-offset: -2px;
  background-color: #f0f9ff;
  transform: scale(1.002);
  box-shadow: 0 2px 8px rgba(14, 165, 233, 0.2);
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
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border: 1px solid #e2e8f0;
}

.validation-info i {
  color: #4338ca;
}

.validation-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.validation-label {
  font-weight: 600;
  color: #334155;
  font-size: 0.875rem;
}

.validation-staff {
  font-weight: 700;
  color: #1e293b;
  font-size: 0.9rem;
}

.validation-date {
  font-size: 0.8rem;
  color: #1e293b;
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
  color: #78350f;
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
  color: #334155;
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
  color: #334155;
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
  color: #6b7280;
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

/* ===== AIDE NAVIGATION CLAVIER ===== */
.keyboard-help {
  margin-bottom: 1rem;
}

.keyboard-help-details {
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
}

.keyboard-help-summary {
  padding: 0.75rem 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  color: #374151;
  list-style: none;
  transition: all 0.2s ease;
}

.keyboard-help-summary::-webkit-details-marker {
  display: none;
}

.keyboard-help-summary::marker {
  display: none;
}

.keyboard-help-summary:hover {
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
}

.keyboard-help-summary i {
  color: #4338ca;
  font-size: 1.125rem;
}

.keyboard-help-content {
  padding: 1rem;
  border-top: 1px solid #e2e8f0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
}

.keyboard-shortcut {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #374151;
}

kbd {
  background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
  border: 1px solid #d1d5db;
  border-radius: 0.25rem;
  padding: 0.125rem 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #374151;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  font-family: 'Courier New', monospace;
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
  color: #64748b;
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
  
  /* En-tête responsive */
  .report-header {
    padding: 2rem 1.5rem;
  }
  
  .header-content {
    flex-direction: column;
    text-align: center;
  }
  
  .title-info h1 {
    font-size: 2rem;
  }
  
  .report-icon {
    width: 3rem;
    height: 3rem;
  }
  
  .report-icon i {
    font-size: 1.5rem;
  }
  
  /* Panneau de contrôle responsive */
  .control-panel {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .card-header {
    padding: 1rem 1rem 0.75rem 1rem;
  }
  
  .card-content {
    padding: 0.75rem 1rem 1rem 1rem;
  }
  
  /* Statistiques responsive */
  .quick-stats {
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .stat-item {
    padding: 0.75rem 0.5rem;
  }
  
  .stat-value {
    font-size: 1.25rem;
  }
  
  /* Export responsive */
  .export-buttons {
    gap: 0.75rem;
  }
  
  .export-btn {
    padding: 0.875rem 0.5rem;
  }
  
  .kpi-grid {
    grid-template-columns: 1fr;
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
