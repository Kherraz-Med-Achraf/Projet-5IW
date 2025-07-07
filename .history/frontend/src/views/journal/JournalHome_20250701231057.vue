<!-- src/views/journal/JournalHome.vue -->
<template>
  <main class="profile-container" role="main" lang="fr">
    <!-- Skip links pour navigation rapide -->
    <div class="skip-links">
      <a href="#main-content" class="skip-link">Aller au contenu principal</a>
      <a href="#child-selection" class="skip-link">Aller à la sélection d'enfant</a>
      <a href="#missions-section" class="skip-link">Aller aux missions</a>
      <a href="#months-grid" class="skip-link">Aller au calendrier mensuel</a>
    </div>

    <!-- Content -->
    <div class="profile-content" id="main-content">
      <div class="content-grid">
        <!-- Sélection enfant et année -->
        <section class="profile-section" id="child-selection" aria-labelledby="selection-title">
          <header class="section-header">
            <h1 id="selection-title">
              <span class="material-icons" aria-hidden="true">book</span>
              Journal de bord éducatif
            </h1>
            <div class="info-note" role="note">
              <span class="material-icons" aria-hidden="true">info</span>
              <span>Suivi mensuel et missions annuelles des enfants dont vous êtes référent</span>
            </div>
          </header>

          <div class="info-grid">
            <div class="info-item">
              <label for="child-select" class="form-label">
                Enfant référé
                <span class="sr-only">Sélectionnez un enfant dans la liste</span>
              </label>
              <select
                id="child-select"
                v-model="selectedChildId"
                @change="onChildChange"
                class="form-select"
                :aria-describedby="referentChildren.length === 0 ? 'child-empty-message' : undefined"
                :disabled="referentChildren.length === 0"
              >
                <option value="" disabled>-- Sélectionner un enfant --</option>
                <option
                  v-for="child in referentChildren"
                  :key="child.id"
                  :value="child.id"
                >
                  {{ child.firstName }} {{ child.lastName }}
                </option>
              </select>
              <div v-if="referentChildren.length === 0" id="child-empty-message" class="help-text" role="status">
                Aucun enfant référé disponible
              </div>
            </div>

            <div v-if="selectedChildId" class="info-item">
              <label for="year-select" class="form-label">
                Année scolaire
                <span class="sr-only">Sélectionnez une année scolaire</span>
              </label>
              <select
                id="year-select"
                v-model="selectedYearId"
                @change="onYearChange"
                class="form-select"
                :aria-describedby="academicYears.length === 0 ? 'year-empty-message' : undefined"
                :disabled="academicYears.length === 0"
              >
                <option value="" disabled>-- Sélectionner une année --</option>
                <option v-for="year in academicYears" :key="year.id" :value="year.id">
                  {{ year.label }}
                </option>
              </select>
              <div v-if="academicYears.length === 0" id="year-empty-message" class="help-text" role="status">
                Aucune année scolaire disponible
              </div>
            </div>
          </div>
        </section>

        <!-- Gestion des missions annuelles -->
        <section v-if="selectedChildId && selectedYearId" class="profile-section" aria-labelledby="missions-title">
          <header class="section-header">
            <h2 id="missions-title">
              <span class="material-icons" aria-hidden="true">assignment</span>
              Gestion des missions annuelles
            </h2>
            <button
              @click="onManageMissions"
              class="edit-btn edit-btn-custom"
              type="button"
              :aria-describedby="missions.length > 0 ? 'missions-count' : 'no-missions-help'"
            >
              <span class="material-icons" aria-hidden="true">edit</span>
              Gérer les missions
              <span class="sr-only">de l'enfant sélectionné</span>
            </button>
          </header>

          <!-- Affichage des missions -->
          <div v-if="missions.length" class="missions-display" id="missions-section" role="region" aria-labelledby="missions-list-title">
            <header class="mission-header">
              <h3 id="missions-list-title">
                <span class="material-icons" aria-hidden="true">flag</span>
                Objectifs annuels de l'enfant
              </h3>
              <span class="mission-count" id="missions-count" role="status" :aria-label="`${missions.length} objectif${missions.length > 1 ? 's' : ''} défini${missions.length > 1 ? 's' : ''}`">
                {{ missions.length }} objectif{{ missions.length > 1 ? "s" : "" }}
              </span>
            </header>

            <div class="missions-grid" role="list" aria-label="Liste des objectifs annuels">
              <article
                v-for="(mission, index) in missions"
                :key="mission.id"
                class="mission-card"
                :style="{ '--delay': `${index * 0.1}s` }"
                role="listitem"
                :aria-label="`Objectif ${index + 1}`"
              >
                <div class="mission-content">
                  <div class="mission-icon" aria-hidden="true">
                    <span class="material-icons">assignment_ind</span>
                  </div>
                  <p class="mission-text">{{ mission.description }}</p>
                </div>
              </article>
            </div>
          </div>

          <!-- État vide si pas de missions -->
          <div v-else class="empty-state" role="status" aria-live="polite">
            <span class="material-icons" aria-hidden="true">assignment_late</span>
            <p>Aucune mission définie</p>
            <div class="empty-instructions" id="no-missions-help">
              <p>Cliquez sur "Gérer les missions" pour en créer.</p>
              <p>Pour voir le calendrier mensuel, il faut que l'enfant ait au moins une mission définie.</p>
            </div>
          </div>
        </section>

        <!-- Calendrier mensuel -->
        <section v-if="selectedYearId && missions.length > 0" class="profile-section" aria-labelledby="calendar-title">
          <header class="section-header">
            <h2 id="calendar-title">
              <span class="material-icons" aria-hidden="true">calendar_month</span>
              Calendrier mensuel
            </h2>
            <div class="info-note" role="note">
              <span class="material-icons" aria-hidden="true">info</span>
              <span>Cliquez sur un mois pour rédiger ou consulter le journal</span>
            </div>
          </header>

          <div class="months-container" id="months-grid">
            <div class="months-grid" role="grid" aria-label="Grille des rapports mensuels par mois">
              <button
                v-for="(label, index) in monthLabels"
                :key="index"
                :class="['month-card', monthClass(monthNumbers[index])]"
                @click="onMonthClick(monthNumbers[index])"
                type="button"
                role="gridcell"
                :aria-label="`${label} - ${getMonthStatusLabel(monthNumbers[index])}`"
                :aria-describedby="`month-${monthNumbers[index]}-status`"
                :disabled="!isMonthEditable(monthNumbers[index]) && !isMonthConsultable(monthNumbers[index]) && !hasDraft(monthNumbers[index])"
              >
                <div class="month-content">
                  <span class="month-label">{{ label }}</span>
                  <div class="month-status" :id="`month-${monthNumbers[index]}-status`">
                    <!-- ✔ pour mois soumis -->
                    <span v-if="isMonthConsultable(index + 1)" class="month-icon submitted" aria-label="Journal soumis">
                      <span class="material-icons" aria-hidden="true">check_circle</span>
                    </span>
                    <!-- 📋 pour mois ayant déjà un brouillon (non soumis) -->
                    <span v-else-if="hasDraft(index + 1)" class="month-icon draft" aria-label="Brouillon en cours">
                      <span class="material-icons" aria-hidden="true">edit_note</span>
                    </span>
                    <!-- ✎ pour tous les autres mois passés/en cours sans brouillon -->
                    <span v-else-if="isMonthEditable(index + 1)" class="month-icon editable" aria-label="Disponible pour rédaction">
                      <span class="material-icons" aria-hidden="true">edit</span>
                    </span>
                    <!-- ✎ grisé pour mois futurs -->
                    <span v-else class="month-icon future" aria-label="Mois futur non disponible">
                      <span class="material-icons" aria-hidden="true">edit_off</span>
                    </span>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </section>

        <!-- Message d'erreur -->
        <div v-if="error" class="profile-section">
          <div class="error-state" role="alert" aria-live="assertive">
            <span class="material-icons" aria-hidden="true">error</span>
            <p>{{ error }}</p>
          </div>
        </div>

        <!-- État de chargement -->
        <div v-if="loading" class="loading-indicator" role="status" aria-live="polite">
          <span class="material-icons spinning" aria-hidden="true">hourglass_empty</span>
          <span>Chargement des données...</span>
        </div>
      </div>
    </div>
  </main>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useJournalStore } from "@/stores/journalStore";

const journalStore = useJournalStore();
const router = useRouter();

const selectedChildId = ref<number | null>(null);
const selectedYearId = ref<number | null>(null);
const error = ref<string>("");
const loading = ref(false);

// Clés pour le localStorage
const STORAGE_KEYS = {
  SELECTED_CHILD_ID: "journal_selected_child_id",
  SELECTED_YEAR_ID: "journal_selected_year_id",
};

// Mois dans l'ordre de l'année scolaire (septembre à août)
const monthLabels = [
  "Septembre", "Octobre", "Novembre", "Décembre", 
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin", 
  "Juillet", "Août"
];

// Mapping pour convertir l'index d'affichage vers le numéro de mois réel
const monthNumbers = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8];

// Lecture des données depuis le store
const referentChildren = computed(() => journalStore.childrenRefered);
const academicYears = computed(() => journalStore.academicYears);
const missions = computed(() => journalStore.missions);

/**
 * Vérifie si un brouillon (non soumis) existe pour ce mois.
 */
function hasDraft(month: number): boolean {
  return journalStore.journals.some(
    (j) => j.month === month && j.isDraft && !j.isSubmitted
  );
}

/**
 * Vérifie si un mois est consultable (journal soumis)
 */
function isMonthConsultable(month: number): boolean {
  return journalStore.journals.some(
    (j) => j.month === month && j.isSubmitted
  );
}

/**
 * Vérifie si un mois est éditable
 */
function isMonthEditable(month: number): boolean {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  
  // Pour simplifier, on considère qu'on peut éditer les mois passés et le mois courant
  // mais pas les mois futurs
  return month <= currentMonth;
}

/**
 * Retourne le label de statut pour l'accessibilité
 */
function getMonthStatusLabel(month: number): string {
  if (!selectedYearId.value || !selectedChildId.value) {
    return "Non disponible";
  }
  
  if (missions.value.length === 0) {
    return "Missions non définies";
  }
  
  if (isMonthConsultable(month)) {
    return "Journal soumis";
  } else if (hasDraft(month)) {
    return "Brouillon en cours";
  } else if (isMonthEditable(month)) {
    return "Disponible pour rédaction";
  } else {
    return "Mois futur";
  }
}

/**
 * Classe CSS à appliquer à chaque mois
 */
function monthClass(month: number) {
  if (!selectedYearId.value || !selectedChildId.value) {
    return "month-card--disabled";
  }

  if (missions.value.length === 0) {
    return "month-card--no-missions";
  }

  if (isMonthConsultable(month)) {
    return "month-card--submitted";
  } else if (hasDraft(month)) {
    return "month-card--draft";
  } else if (isMonthEditable(month)) {
    return "month-card--editable";
  } else {
    return "month-card--future";
  }
}

/**
 * Gestionnaire de changement d'enfant
 */
async function onChildChange() {
  if (selectedChildId.value) {
    localStorage.setItem(STORAGE_KEYS.SELECTED_CHILD_ID, selectedChildId.value.toString());
    // Ne pas reset l'année scolaire, elle reste sélectionnée
    
    loading.value = true;
    try {
      await journalStore.fetchAcademicYears();
      // Si une année était déjà sélectionnée, recharger les données pour le nouvel enfant
      if (selectedYearId.value) {
        await Promise.all([
          journalStore.fetchMissions(selectedChildId.value, selectedYearId.value),
          journalStore.fetchJournals(selectedChildId.value, selectedYearId.value)
        ]);
      }
    } catch (err) {
      error.value = "Erreur lors du chargement des années scolaires";
    } finally {
      loading.value = false;
    }
  }
}

/**
 * Gestionnaire de changement d'année
 */
async function onYearChange() {
  if (selectedYearId.value && selectedChildId.value) {
    localStorage.setItem(STORAGE_KEYS.SELECTED_YEAR_ID, selectedYearId.value.toString());
    
    loading.value = true;
    try {
      await Promise.all([
        journalStore.fetchMissions(selectedChildId.value, selectedYearId.value),
        journalStore.fetchJournals(selectedChildId.value, selectedYearId.value)
      ]);
    } catch (err) {
      error.value = "Erreur lors du chargement des données";
    } finally {
      loading.value = false;
    }
  }
}

/**
 * Navigation vers la gestion des missions
 */
function onManageMissions() {
  if (selectedChildId.value && selectedYearId.value) {
    router.push({
      name: "JournalMissions",
      params: {
        childId: selectedChildId.value,
        yearId: selectedYearId.value
      }
    });
  }
}

/**
 * Navigation vers un mois spécifique
 */
function onMonthClick(month: number) {
  if (!selectedChildId.value || !selectedYearId.value) return;
  
  if (missions.value.length === 0) {
    error.value = "Veuillez d'abord définir les missions annuelles";
    return;
  }
  
  if (!isMonthEditable(month) && !isMonthConsultable(month) && !hasDraft(month)) {
    return; // Mois futur non cliquable
  }
  
  router.push({
    name: "JournalMonth",
    params: {
      childId: selectedChildId.value,
      yearId: selectedYearId.value,
      month: month
    }
  });
}

/**
 * Initialisation
 */
onMounted(async () => {
  loading.value = true;
  
  try {
    // Restaurer les sélections depuis le localStorage
    const savedChildId = localStorage.getItem(STORAGE_KEYS.SELECTED_CHILD_ID);
    const savedYearId = localStorage.getItem(STORAGE_KEYS.SELECTED_YEAR_ID);
    
    await journalStore.fetchReferentChildren();
    
    if (savedChildId && journalStore.childrenRefered.some(c => c.id === parseInt(savedChildId))) {
      selectedChildId.value = parseInt(savedChildId);
      await journalStore.fetchAcademicYears();
      
      if (savedYearId && journalStore.academicYears.some(y => y.id === parseInt(savedYearId))) {
        selectedYearId.value = parseInt(savedYearId);
        await Promise.all([
          journalStore.fetchMissions(selectedChildId.value, selectedYearId.value),
          journalStore.fetchJournals(selectedChildId.value, selectedYearId.value)
        ]);
      }
    }
  } catch (err) {
    error.value = "Erreur lors de l'initialisation";
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
/* Variables d'accessibilité WCAG AA */
:root {
  --primary-color: #4444ac;
  --primary-hover: #3333a0;
  --primary-focus: #2222a5;
  --success-color: #166534; /* Vert foncé pour contraste */
  --warning-color: #92400e; /* Orange foncé pour contraste */
  --danger-color: #991b1b; /* Rouge foncé pour contraste */
  --info-color: #1e40af; /* Bleu foncé pour contraste */
  --text-primary: #111827;
  --text-secondary: #374151; /* Plus foncé pour meilleur contraste */
  --text-muted: #6b7280;
  --background-light: #f8fafc;
  --background-success: #dcfce7; /* Fond vert très clair */
  --background-warning: #fef3c7; /* Fond jaune très clair */
  --background-danger: #fef2f2; /* Fond rouge très clair */
  --background-info: #dbeafe; /* Fond bleu très clair */
  --border-color: #e5e7eb;
  --border-focus: #4444ac;
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  
  /* Focus et accessibilité */
  --focus-outline: 2px solid var(--primary-focus);
  --focus-outline-offset: 2px;
  --min-touch-target: 44px;
}

/* Classes d'accessibilité */
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
  top: -60px;
  left: 20px;
  z-index: 1000;
}

.skip-link {
  position: absolute;
  top: 0;
  left: 0;
  background: var(--primary-color);
  color: white;
  padding: 0.5rem 1rem;
  text-decoration: none;
  border-radius: 4px;
  font-weight: 500;
  transition: top 0.2s ease;
}

.skip-link:focus {
  top: 60px;
  outline: var(--focus-outline);
  outline-offset: var(--focus-outline-offset);
}

/* Focus amélioré pour tous les éléments interactifs */
*:focus {
  outline: var(--focus-outline);
  outline-offset: var(--focus-outline-offset);
  border-radius: 4px;
}

*:focus:not(:focus-visible) {
  outline: none;
}

*:focus-visible {
  outline: var(--focus-outline);
  outline-offset: var(--focus-outline-offset);
}

/* Styles de base */
.profile-container {
  font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  color: var(--text-primary);
  line-height: 1.6;
}

/* Styles des formulaires avec accessibilité */
.form-label {
  display: block;
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
  font-size: 0.9rem;
}

.form-select {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  background: white;
  font-size: 1rem;
  color: var(--text-primary);
  transition: all 0.2s ease;
  cursor: pointer;
  min-height: var(--min-touch-target);
}

.form-select:hover:not(:disabled) {
  border-color: var(--primary-color);
}

.form-select:focus {
  border-color: var(--border-focus);
  box-shadow: 0 0 0 3px rgba(68, 68, 172, 0.1);
}

.form-select:disabled {
  background-color: var(--background-light);
  cursor: not-allowed;
  opacity: 0.6;
  color: var(--text-muted);
}

.help-text {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-top: 0.5rem;
  padding: 0.5rem;
  background-color: var(--background-light);
  border-radius: 4px;
  border-left: 3px solid var(--primary-color);
}

/* Styles des missions avec accessibilité */
.missions-display {
  margin-top: 1.5rem;
}

.mission-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  
  h3 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary);
    
    .material-icons {
      color: var(--primary-color);
    }
  }
  
  .mission-count {
    background: var(--primary-color);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    min-height: var(--min-touch-target);
    display: flex;
    align-items: center;
  }
}

.missions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}

.mission-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: var(--shadow-md);
  border: 2px solid transparent;
  transition: all 0.3s ease;
  animation: slideInUp 0.6s ease forwards;
  animation-delay: var(--delay, 0s);
  opacity: 0;
  transform: translateY(20px);
}

.mission-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
  border-color: var(--primary-color);
}

@keyframes slideInUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.mission-content {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.mission-icon {
  width: 48px;
  height: 48px;
  background: var(--primary-color); /* Couleur solide au lieu de gradient */
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  
  .material-icons {
    font-size: 24px;
    color: white;
  }
}

.mission-text {
  margin: 0;
  color: var(--text-primary);
  line-height: 1.6;
  font-size: 1rem;
}

/* Styles du calendrier mensuel avec accessibilité */
.months-container {
  margin-top: 1rem;
}

.months-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.month-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
  transition: all 0.2s ease;
  border: 2px solid transparent;
  position: relative;
  min-height: var(--min-touch-target);
  font-family: inherit;
  font-size: inherit;
  cursor: pointer;
}

.month-card:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: var(--primary-color);
}

.month-card:focus {
  border-color: var(--border-focus);
  box-shadow: 0 0 0 3px rgba(68, 68, 172, 0.1);
}

/* États des mois avec couleurs accessibles WCAG AA */
.month-card--submitted {
  background: var(--background-success);
  border-color: var(--success-color);
  
  .month-icon.submitted {
    color: var(--success-color);
  }
}

.month-card--draft {
  background: var(--background-warning);
  border-color: var(--warning-color);
  
  .month-icon.draft {
    color: var(--warning-color);
  }
}

.month-card--editable {
  background: var(--background-info);
  border-color: var(--info-color);
  
  .month-icon.editable {
    color: var(--info-color);
  }
}

.month-card--future,
.month-card--disabled,
.month-card--no-missions {
  background: var(--background-danger);
  color: var(--danger-color);
  cursor: not-allowed;
  border-color: var(--danger-color);
  opacity: 0.8;
  
  .month-icon.future {
    color: var(--danger-color);
  }
}

.month-card:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.month-card:disabled:hover {
  transform: none;
  box-shadow: var(--shadow-sm);
}

.month-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.month-label {
  font-weight: 600;
  font-size: 1.1rem;
}

.month-status {
  display: flex;
  align-items: center;
}

.month-icon {
  font-size: 20px;
  display: flex;
  align-items: center;
  
  .material-icons {
    font-size: inherit;
  }
}

/* États d'erreur et de chargement accessibles */
.error-state {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: var(--background-danger);
  color: var(--danger-color);
  border: 1px solid var(--danger-color);
  border-radius: 8px;
  margin: 1rem 0;
  box-shadow: var(--shadow-md);
  
  .material-icons {
    font-size: 1.5rem;
    flex-shrink: 0;
  }
  
  p {
    margin: 0;
    font-weight: 500;
  }
}

.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 2rem;
  color: var(--text-secondary);
  
  .material-icons {
    font-size: 24px;
    
    &.spinning {
      animation: spin 1s linear infinite;
    }
  }
  
  span {
    font-weight: 500;
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* État vide accessible */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  text-align: center;
  background: var(--background-light);
  border-radius: 12px;
  border: 1px solid var(--border-color);
  
  .material-icons {
    font-size: 48px;
    color: var(--text-muted);
    margin-bottom: 1rem;
  }
  
  p {
    margin: 0 0 1rem 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);
  }
}

.empty-instructions {
  color: var(--text-secondary);
  
  p {
    margin: 0.5rem 0;
    font-size: 0.9rem;
    font-weight: 400;
  }
}

/* Responsive design */
@media (max-width: 768px) {
  .months-grid {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  }
  
  .missions-grid {
    grid-template-columns: 1fr;
  }
  
  .mission-card {
    padding: 1rem;
  }
  
  .month-card {
    padding: 1rem;
  }
  
  .mission-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .month-card,
  .mission-card,
  .form-select {
    border-width: 3px;
  }
  
  .month-card--submitted,
  .month-card--draft,
  .month-card--editable,
  .month-card--future {
    border-width: 3px;
    font-weight: 600;
  }
  
  .mission-count {
    border: 2px solid white;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .month-card,
  .mission-card {
    transition: none;
    animation: none;
  }
  
  .loading-indicator .material-icons.spinning {
    animation: none;
  }
  
  .month-card:hover,
  .mission-card:hover {
    transform: none;
  }
  
  @keyframes slideInUp {
    to {
      opacity: 1;
      transform: none;
    }
  }
}

/* Print styles */
@media print {
  .skip-links,
  .loading-indicator {
    display: none;
  }
  
  .month-card,
  .mission-card {
    break-inside: avoid;
    box-shadow: none;
    border: 1px solid var(--border-color);
  }
}
</style>
