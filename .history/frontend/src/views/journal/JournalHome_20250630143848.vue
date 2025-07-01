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
        <div class="profile-section" id="child-selection">
          <div class="section-header">
            <h1>
              <i class="material-icons" aria-hidden="true">book</i>
              Journal de bord éducatif
            </h1>
            <div class="info-note">
              <i class="material-icons" aria-hidden="true">info</i>
              <span>Suivi mensuel et missions annuelles des enfants dont vous êtes référent</span>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-item">
              <label for="child-select">Enfant référé</label>
              <select
                id="child-select"
                v-model="selectedChildId"
                @change="onChildChange"
                class="form-select"
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
            </div>

            <div v-if="selectedChildId" class="info-item">
              <label for="year-select">Année scolaire</label>
              <select
                id="year-select"
                v-model="selectedYearId"
                @change="onYearChange"
                class="form-select"
              >
                <option value="" disabled>-- Sélectionner une année --</option>
                <option v-for="year in academicYears" :key="year.id" :value="year.id">
                  {{ year.label }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <!-- Gestion des missions annuelles -->
        <div v-if="selectedChildId && selectedYearId" class="profile-section">
          <div class="section-header">
            <h2>
              <i class="material-icons" aria-hidden="true">assignment</i>
              Gestion des missions annuelles
            </h2>
            <button
              @click="onManageMissions"
              class="edit-btn"
              type="button"
              aria-label="Gérer les missions annuelles de l'enfant"
            >
              <i class="material-icons" aria-hidden="true">edit</i>
              Gérer les missions
            </button>
          </div>

          <!-- Affichage des missions -->
          <div v-if="missions.length" class="missions-display" id="missions-section">
            <div class="mission-header">
              <h3>
                <i class="material-icons" aria-hidden="true">flag</i>
                Objectifs annuels de l'enfant
              </h3>
              <span class="mission-count">{{ missions.length }} objectif{{ missions.length > 1 ? "s" : "" }}</span>
            </div>

            <div class="missions-grid">
              <div
                v-for="(mission, index) in missions"
                :key="mission.id"
                class="mission-card"
                :style="{ '--delay': `${index * 0.1}s` }"
              >
                <div class="mission-content">
                  <div class="mission-icon">
                    <i class="material-icons">assignment_ind</i>
                  </div>
                  <p class="mission-text">{{ mission.description }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- État vide si pas de missions -->
          <div v-else class="empty-state">
            <i class="material-icons">assignment_late</i>
            <p>Aucune mission définie</p>
            <small>Cliquez sur "Gérer les missions" pour en créer</small>
          </div>
        </div>

        <!-- Calendrier mensuel -->
        <div v-if="selectedYearId" class="profile-section">
          <div class="section-header">
            <h2>
              <i class="material-icons" aria-hidden="true">calendar_month</i>
              Calendrier mensuel
            </h2>
            <div class="info-note">
              <i class="material-icons" aria-hidden="true">info</i>
              <span>Cliquez sur un mois pour rédiger ou consulter le journal</span>
            </div>
          </div>

          <div class="months-container" id="months-grid">
            <div class="months-grid">
              <div
                v-for="(label, index) in monthLabels"
                :key="index"
                tabindex="0"
                :class="['month-card', monthClass(index + 1)]"
                @click="onMonthClick(index + 1)"
                @keydown.enter="onMonthClick(index + 1)"
                @keydown.space.prevent="onMonthClick(index + 1)"
                role="button"
                :aria-label="`${label} - ${getMonthStatusLabel(index + 1)}`"
              >
                <div class="month-content">
                  <span class="month-label">{{ label }}</span>
                  <div class="month-status">
                    <!-- ✔ pour mois soumis -->
                    <i v-if="isMonthConsultable(index + 1)" class="material-icons month-icon submitted">
                      check_circle
                    </i>
                    <!-- 📋 pour mois ayant déjà un brouillon (non soumis) -->
                    <i v-else-if="hasDraft(index + 1)" class="material-icons month-icon draft">
                      edit_note
                    </i>
                    <!-- ✎ pour tous les autres mois passés/en cours sans brouillon -->
                    <i v-else-if="isMonthEditable(index + 1)" class="material-icons month-icon editable">
                      edit
                    </i>
                    <!-- ✎ grisé pour mois futurs -->
                    <i v-else class="material-icons month-icon future">
                      edit_off
                    </i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Message d'erreur -->
        <div v-if="error" class="profile-section">
          <div class="error-state">
            <i class="material-icons">error</i>
            <p>{{ error }}</p>
          </div>
        </div>

        <!-- État de chargement -->
        <div v-if="loading" class="loading-indicator">
          <i class="material-icons spinning">hourglass_empty</i>
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

const monthLabels = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

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

<style scoped lang="scss">
// Variables et mixins
:root {
  --primary-color: #667eea;
  --primary-light: #764ba2;
  --success-color: #10b981;
  --warning-color: #f59e0b;
  --danger-color: #ef4444;
  --info-color: #3b82f6;
  --text-primary: #111827;
  --text-secondary: #6b7280;
  --background-light: #f8fafc;
  --border-color: #e5e7eb;
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

// Styles des missions
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
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    font-size: 0.875rem;
    font-weight: 500;
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
  transition: all 0.3s ease;
  animation: slideInUp 0.6s ease forwards;
  animation-delay: var(--delay, 0s);
  opacity: 0;
  transform: translateY(20px);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
  }
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
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-light) 100%);
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

// Styles du calendrier mensuel
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
  transition: all 0.3s ease;
  cursor: pointer;
  border: 2px solid transparent;
  position: relative;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
    border-color: var(--primary-color);
  }
  
  &:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }
  
  &--submitted {
    background: linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%);
    border-color: var(--success-color);
    
    .month-icon.submitted {
      color: var(--success-color);
    }
  }
  
  &--draft {
    background: linear-gradient(135deg, #fef3c7 0%, #fef7cd 100%);
    border-color: var(--warning-color);
    
    .month-icon.draft {
      color: var(--warning-color);
    }
  }
  
  &--editable {
    background: linear-gradient(135deg, #dbeafe 0%, #e0f2fe 100%);
    border-color: var(--info-color);
    
    .month-icon.editable {
      color: var(--info-color);
    }
  }
  
  &--future {
    background: #f9fafb;
    color: var(--text-secondary);
    cursor: not-allowed;
    
    .month-icon.future {
      color: var(--text-secondary);
    }
    
    &:hover {
      transform: none;
      box-shadow: var(--shadow-sm);
      border-color: transparent;
    }
  }
  
  &--disabled,
  &--no-missions {
    background: #f3f4f6;
    color: var(--text-secondary);
    cursor: not-allowed;
    
    &:hover {
      transform: none;
      box-shadow: var(--shadow-sm);
      border-color: transparent;
    }
  }
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
}

// Styles des formulaires
.form-select {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  background: white;
  font-size: 1rem;
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }
}

// États d'erreur et de chargement
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  text-align: center;
  color: var(--danger-color);
  
  .material-icons {
    font-size: 48px;
    margin-bottom: 1rem;
  }
  
  p {
    margin: 0;
    font-size: 1.125rem;
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
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

// Responsive
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
}
</style>
