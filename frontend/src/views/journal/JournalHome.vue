<!-- src/views/JournalHome.vue -->
<template>
  <div class="journal-home">
    <h1 class="journal-home__title">Journal de bord</h1>

    <!-- 1) Choix de l'enfant référé -->
    <div class="journal-home__section">
      <label for="child-select" class="journal-home__label">
        Choisissez un enfant :
      </label>
      <select
        id="child-select"
        v-model="selectedChildId"
        @change="onChildChange"
        class="journal-home__select"
      >
        <option value="" disabled>-- Sélectionner --</option>
        <option
          v-for="child in referentChildren"
          :key="child.id"
          :value="child.id"
        >
          {{ child.firstName }} {{ child.lastName }}
        </option>
      </select>
    </div>

    <!-- 2) Choix de l'année scolaire -->
    <div v-if="selectedChildId" class="journal-home__section">
      <label for="year-select" class="journal-home__label">
        Année scolaire :
      </label>
      <select
        id="year-select"
        v-model="selectedYearId"
        @change="onYearChange"
        class="journal-home__select"
      >
        <option value="" disabled>-- Sélectionner --</option>
        <option v-for="year in academicYears" :key="year.id" :value="year.id">
          {{ year.label }}
        </option>
      </select>
    </div>

    <!-- Bouton pour gérer les missions annuelles -->
    <div v-if="selectedChildId && selectedYearId" class="journal-home__actions">
      <button
        @click="onManageMissions"
        class="journal-home__btn journal-home__btn--primary"
      >
        Gérer les missions annuelles
      </button>
    </div>

    <!-- 3) Missions annuelles (objectifs de l'enfant) -->
    <div
      v-if="missions.length && selectedYearId"
      class="journal-home__missions"
    >
      <div class="journal-home__missions-header">
        <h2 class="journal-home__subtitle">
          <span class="journal-home__subtitle-icon">🎯</span>
          Objectifs annuels de l'enfant
        </h2>
        <h2 class="journal-home__missions-count">
          {{ missions.length }} objectif{{ missions.length > 1 ? "s" : "" }}
        </h2>
      </div>

      <div class="journal-home__missions-grid">
        <div
          v-for="(mission, index) in missions"
          :key="mission.id"
          class="journal-home__mission-card"
          :style="{ '--delay': `${index * 0.1}s` }"
        >
          <div class="journal-home__mission-content">
            <div class="journal-home__mission-icon">📋</div>
            <p class="journal-home__mission-text">
              {{ mission.description }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- 4) Affichage de la grille des mois -->
    <div v-if="selectedYearId" class="journal-home__months">
      <h2 class="journal-home__subtitle">Mois de l'année :</h2>
      <div class="journal-home__months-grid">
        <div
          v-for="(label, index) in monthLabels"
          :key="index"
          tabindex="-1"
          :class="['journal-home__month-cell', monthClass(index + 1)]"
          @click="onMonthClick(index + 1)"
        >
          <span class="journal-home__month-content">
            {{ label }}
            <!-- ✔ pour mois soumis -->
            <span
              v-if="isMonthConsultable(index + 1)"
              class="journal-home__month-icon journal-home__month-icon--submitted"
              >✔</span
            >
            <!-- 📋 pour mois ayant déjà un brouillon (non soumis) -->
            <span
              v-else-if="hasDraft(index + 1)"
              class="journal-home__month-icon journal-home__month-icon--draft"
              >📋</span
            >
            <!-- ✎ pour tous les autres mois passés/en cours sans brouillon -->
            <span
              v-else-if="isMonthEditable(index + 1)"
              class="journal-home__month-icon journal-home__month-icon--editable"
              >✎</span
            >
            <!-- ✎ grisé pour mois futurs -->
            <span
              v-else
              class="journal-home__month-icon journal-home__month-icon--future"
              >✎</span
            >
          </span>
        </div>
      </div>
    </div>

    <!-- 5) Affichage d'une erreur éventuelle -->
    <div v-if="error" class="journal-home__error">{{ error }}</div>
  </div>
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

// Clés pour le localStorage
const STORAGE_KEYS = {
  SELECTED_CHILD_ID: "journal_selected_child_id",
  SELECTED_YEAR_ID: "journal_selected_year_id",
};

const monthLabels = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
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
 * Classe CSS à appliquer à chaque mois :
 * - mois déjà soumis → case "normale" (plus d'arrière-plan gris)
 * - mois futurs       → opacity-50 cursor-not-allowed (grisé, non cliquable)
 * - autres mois (passés/en cours, non soumis) → case normale (aucune couleur)
 */
function monthClass(month: number) {
  if (!selectedYearId.value || !selectedChildId.value) {
    // Si l'année ou l'enfant n'est pas sélectionné, on grise toute la case
    return "journal-home__month-cell--disabled";
  }

  const journals = journalStore.journals;
  const found = journals.find((j) => j.month === month);
  const now = Date.now();
  const yearObj = academicYears.value.find(
    (y) => y.id === selectedYearId.value
  )!;
  // Timestamp du premier jour du mois dans l'année scolaire
  const thisMonthStart = new Date(
    new Date(yearObj.startDate).getFullYear(),
    month - 1,
    1
  ).getTime();

  if (found?.isSubmitted) {
    // Mois déjà soumis → on enlève le bg-gray-100 (seulement cursor-pointer)
    return "journal-home__month-cell--submitted";
  }
  // Si mois futur → grisé et non cliquable
  if (thisMonthStart > now) {
    return "journal-home__month-cell--future";
  }
  // Sinon (passé/en cours, non soumis) → case normale
  return "journal-home__month-cell--editable";
}

/**
 * Indique si le mois est consultable (déjà soumis).
 */
function isMonthConsultable(month: number): boolean {
  return journalStore.journals.some((j) => j.month === month && j.isSubmitted);
}

/**
 * Indique si le mois est éditable :
 * - mois futurs → faux
 * - sinon, on peut toujours éditer (brouillon à créer ou modifier)
 */
function isMonthEditable(month: number): boolean {
  const now = Date.now();
  const yearObj = academicYears.value.find(
    (y) => y.id === selectedYearId.value
  )!;
  const thisMonthStart = new Date(
    new Date(yearObj.startDate).getFullYear(),
    month - 1,
    1
  ).getTime();

  // Les mois futurs ne sont pas éditables
  if (thisMonthStart > now) return false;

  // Sinon, on retourne vrai pour tous les mois passés/en cours
  return true;
}

/**
 * Lorsque l'éducateur change d'enfant, on réinitialise l'année et les données.
 */
async function onChildChange() {
  error.value = "";
  selectedYearId.value = null;
  journalStore.journals = [];
  journalStore.missions = [];

  // Sauvegarder dans le localStorage
  if (selectedChildId.value) {
    localStorage.setItem(
      STORAGE_KEYS.SELECTED_CHILD_ID,
      selectedChildId.value.toString()
    );
  }
  localStorage.removeItem(STORAGE_KEYS.SELECTED_YEAR_ID);
}

/**
 * Lorsque l'éducateur change d'année, on va chercher missions + journaux.
 */
async function onYearChange() {
  if (!selectedChildId.value || !selectedYearId.value) return;
  error.value = "";
  journalStore.missions = [];
  journalStore.journals = [];

  // Sauvegarder dans le localStorage
  localStorage.setItem(
    STORAGE_KEYS.SELECTED_YEAR_ID,
    selectedYearId.value.toString()
  );

  try {
    await journalStore.fetchMissions(
      selectedChildId.value,
      selectedYearId.value
    );
    await journalStore.fetchJournals(
      selectedChildId.value,
      selectedYearId.value
    );
  } catch (e: any) {
    error.value = e.message;
  }
}

/**
 * Restaure les valeurs sauvegardées depuis le localStorage
 */
function restoreFromLocalStorage() {
  const savedChildId = localStorage.getItem(STORAGE_KEYS.SELECTED_CHILD_ID);
  const savedYearId = localStorage.getItem(STORAGE_KEYS.SELECTED_YEAR_ID);

  if (savedChildId) {
    const childId = parseInt(savedChildId);
    // Vérifier que l'enfant existe toujours dans la liste des enfants référés
    if (referentChildren.value.some((child) => child.id === childId)) {
      selectedChildId.value = childId;
    } else {
      // Nettoyer le localStorage si l'enfant n'existe plus
      localStorage.removeItem(STORAGE_KEYS.SELECTED_CHILD_ID);
    }
  }

  if (savedYearId) {
    const yearId = parseInt(savedYearId);
    // Vérifier que l'année existe toujours dans la liste des années scolaires
    if (academicYears.value.some((year) => year.id === yearId)) {
      selectedYearId.value = yearId;
    } else {
      // Nettoyer le localStorage si l'année n'existe plus
      localStorage.removeItem(STORAGE_KEYS.SELECTED_YEAR_ID);
    }
  }
}

/**
 * Nettoie le localStorage (utile lors de la déconnexion)
 */
function clearLocalStorage() {
  localStorage.removeItem(STORAGE_KEYS.SELECTED_CHILD_ID);
  localStorage.removeItem(STORAGE_KEYS.SELECTED_YEAR_ID);
}

/**
 * Charge automatiquement les données si un enfant et une année sont sélectionnés
 */
async function loadDataIfSelected() {
  if (selectedChildId.value && selectedYearId.value) {
    try {
      await journalStore.fetchMissions(
        selectedChildId.value,
        selectedYearId.value
      );
      await journalStore.fetchJournals(
        selectedChildId.value,
        selectedYearId.value
      );
    } catch (e: any) {
      error.value = e.message;
    }
  }
}

/**
 * Au montage, on charge :
 * 1) la liste des enfants référés
 * 2) les années scolaires
 * 3) on restaure les sélections depuis le localStorage
 * 4) on charge les données si une sélection complète existe
 */
onMounted(async () => {
  try {
    await journalStore.fetchReferentChildren();
    await journalStore.fetchAcademicYears();

    // Restaurer les sélections sauvegardées
    restoreFromLocalStorage();

    // Charger les données si une sélection complète existe
    await loadDataIfSelected();
  } catch (e: any) {
    error.value = e.message;
  }
});

/**
 * Lorsqu'on clique sur un mois, on navigue vers la page de détail.
 */
function onMonthClick(month: number) {
  if (!selectedChildId.value || !selectedYearId.value) return;
  router.push({
    name: "JournalMonth",
    params: {
      childId: selectedChildId.value,
      yearId: selectedYearId.value,
      month,
    },
  });
}

/**
 * Navigation vers la page de gestion des missions annuelles
 */
function onManageMissions() {
  if (!selectedChildId.value || !selectedYearId.value) return;
  router.push({
    name: "JournalMissions",
    params: {
      childId: selectedChildId.value,
      yearId: selectedYearId.value,
    },
  });
}
</script>

<style lang="scss" scoped>
.journal-home {
  padding: 2rem;
  max-width: 64rem;
  margin: 0 auto;
  background-color: $bg-secondary;
  color: $text-primary;
  min-height: 100vh;

  &__title {
    font-size: 2.25rem;
    font-weight: 700;
    margin-bottom: 2rem;
    color: $text-primary;
    text-align: center;
    background: linear-gradient(135deg, $accent-primary, $accent-hover);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    position: relative;

    &::after {
      content: "";
      position: absolute;
      bottom: -0.5rem;
      left: 50%;
      transform: translateX(-50%);
      width: 4rem;
      height: 3px;
      background: linear-gradient(135deg, $accent-primary, $accent-hover);
      border-radius: 2px;
    }
  }

  &__section {
    margin-bottom: 1.5rem;
    background-color: $bg-primary;
    padding: 1.5rem;
    border-radius: 0.75rem;
    border: 1px solid $border;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    transition: all 0.2s ease;

    &:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      border-color: $accent-primary;
    }
  }

  &__label {
    display: flex;
    align-items: center;
    font-weight: 600;
    margin-bottom: 1rem;
    color: $text-primary;
    font-size: 1rem;

    &::before {
      content: "";
      width: 4px;
      height: 1.25rem;
      background: linear-gradient(135deg, $accent-primary, $accent-hover);
      margin-right: 0.75rem;
      border-radius: 2px;
    }
  }

  &__select {
    width: 100%;
    padding: 1rem;
    border: 2px solid $border;
    border-radius: 0.5rem;
    background-color: $bg-secondary;
    color: $text-primary;
    font-size: 1rem;
    font-weight: 500;
    transition: all 0.2s ease;
    appearance: none;
    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
    background-position: right 0.75rem center;
    background-repeat: no-repeat;
    background-size: 1.25rem;

    &:focus {
      outline: none;
      border-color: $accent-primary;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      background-color: $bg-primary;
    }

    &:hover {
      border-color: $accent-primary;
      background-color: $bg-primary;
    }

    option {
      background-color: $bg-primary;
      color: $text-primary;
      padding: 0.75rem;
    }
  }

  &__actions {
    margin-bottom: 2rem;
    display: flex;
    justify-content: center;
    padding: 1.5rem;
    background-color: $bg-primary;
    border-radius: 0.75rem;
    border: 1px solid $border;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  &__btn {
    padding: 0.75rem 2rem;
    border-radius: 0.5rem;
    font-weight: 600;
    transition: all 0.2s ease;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    position: relative;
    overflow: hidden;

    &--primary {
      background: linear-gradient(135deg, $accent-primary, $accent-hover);
      color: white;
      box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);

      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 16px rgba(59, 130, 246, 0.4);
      }

      &:focus {
        outline: none;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
      }

      &::before {
        content: "⚙️";
        margin-right: 0.5rem;
      }
    }
  }

  &__missions {
    margin-bottom: 2rem;
    background: linear-gradient(
      135deg,
      rgba($success, 0.08),
      rgba($accent-primary, 0.08)
    );
    padding: 2rem;
    border-radius: 1rem;
    border: 1px solid rgba($success, 0.2);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    position: relative;
    overflow: hidden;

    &::before {
      content: "";
      position: absolute;
      top: -50%;
      right: -50%;
      width: 200px;
      height: 200px;
      background: radial-gradient(
        circle,
        rgba($success, 0.1) 0%,
        transparent 70%
      );
      border-radius: 50%;
      pointer-events: none;
    }
  }

  &__missions-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    flex-wrap: wrap;
    gap: 1rem;
  }

  &__subtitle {
    font-size: 1.5rem;
    font-weight: 700;
    color: $text-primary;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin: 0;

    &-icon {
      font-size: 1.75rem;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
    }

    &::before {
      content: "";
      width: 6px;
      height: 1.5rem;
      background: linear-gradient(135deg, $success, $accent-primary);
      border-radius: 3px;
    }
  }

  &__missions-count {
    background: linear-gradient(135deg, $accent-primary, $accent-hover);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 2rem;
    font-size: 0.875rem;
    font-weight: 600;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
    white-space: nowrap;
  }

  &__missions-grid {
    display: grid;
    gap: 1.5rem;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  }

  &__mission-card {
    background: rgba(255, 255, 255, 0.9);
    border-radius: 0.75rem;
    padding: 1.5rem;
    border: 1px solid rgba($accent-primary, 0.2);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    position: relative;
    transition: all 0.3s ease;
    overflow: hidden;
    animation: slideInUp 0.6s ease var(--delay, 0s) both;

    &:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(59, 130, 246, 0.2);
      border-color: $accent-primary;

      .journal-home__mission-number {
        background: linear-gradient(135deg, $success, $accent-primary);
        transform: scale(1.1);
      }

      .journal-home__mission-icon {
        transform: scale(1.2) rotate(5deg);
      }
    }

    &::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 4px;
      background: linear-gradient(90deg, $accent-primary, $success);
    }
  }

  &__mission-content {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  &__mission-icon {
    font-size: 1.5rem;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
    transition: all 0.3s ease;
    flex-shrink: 0;
  }

  &__mission-text {
    color: $text-primary;
    font-size: 1rem;
    line-height: 1.6;
    margin: 0;
    font-weight: 500;
    flex: 1;
  }

  &__mission-progress {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid rgba($border, 0.5);
  }

  &__mission-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;

    &-icon {
      font-size: 1rem;
      filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
    }

    &-text {
      color: $text-secondary;
      font-size: 0.875rem;
      font-weight: 500;
    }
  }

  &__months {
    background-color: $bg-primary;
    padding: 2rem;
    margin-top: 2rem;
    border-radius: 1rem;
    border: 1px solid $border;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    position: relative;

    &::before {
      content: "📅";
      position: absolute;
      top: 1.5rem;
      right: 1.5rem;
      font-size: 2rem;
      opacity: 0.3;
    }
  }

  &__months-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    margin-top: 1.5rem;
  }

  &__month-cell {
    border-radius: 0.75rem;
    transition: all 0.2s ease;
    position: relative;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

    &:focus {
      outline: none;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    &--editable {
      background: linear-gradient(135deg, $bg-primary, $bg-secondary);
      border: 2px solid $border;
      cursor: pointer;

      &:hover {
        border-color: $accent-primary;
        transform: translateY(-4px);
        box-shadow: 0 8px 24px rgba(59, 130, 246, 0.2);

        .journal-home__month-content {
          background-color: rgba($accent-primary, 0.05);
        }
      }
    }

    &--submitted {
      background: linear-gradient(
        135deg,
        rgba($success, 0.1),
        rgba($success, 0.05)
      );
      border: 2px solid rgba($success, 0.3);
      cursor: pointer;

      &:hover {
        background: linear-gradient(
          135deg,
          rgba($success, 0.15),
          rgba($success, 0.1)
        );
        border-color: $success;
        transform: translateY(-4px);
        box-shadow: 0 8px 24px rgba(16, 185, 129, 0.2);
      }
    }

    &--future {
      background: linear-gradient(135deg, $bg-tertiary, rgba($text-muted, 0.1));
      border: 2px solid rgba($text-muted, 0.2);
      cursor: not-allowed;
      opacity: 0.6;
    }

    &--disabled {
      background: linear-gradient(135deg, $bg-tertiary, rgba($text-muted, 0.1));
      border: 2px solid rgba($text-muted, 0.2);
      cursor: not-allowed;
      opacity: 0.6;
    }
  }

  &__month-content {
    display: block;
    text-align: center;
    padding: 1.5rem 0.75rem;
    font-weight: 600;
    color: $text-primary;
    position: relative;
    font-size: 1rem;
    transition: all 0.2s ease;
    border-radius: 0.75rem;
  }

  &__month-icon {
    display: block;
    margin-top: 0.5rem;
    font-size: 1.5rem;
    transition: all 0.2s ease;

    &--submitted {
      color: $success;
      filter: drop-shadow(0 2px 4px rgba(16, 185, 129, 0.3));
    }

    &--draft {
      color: $warning;
      filter: drop-shadow(0 2px 4px rgba(245, 158, 11, 0.3));
    }

    &--editable {
      color: $accent-primary;
      filter: drop-shadow(0 2px 4px rgba(59, 130, 246, 0.3));
    }

    &--future {
      color: $text-muted;
    }
  }

  &__error {
    color: $error;
    background: linear-gradient(135deg, rgba($error, 0.1), rgba($error, 0.05));
    border: 2px solid rgba($error, 0.3);
    padding: 1.5rem;
    border-radius: 0.75rem;
    margin-top: 2rem;
    font-weight: 600;
    font-size: 1rem;
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.1);
    position: relative;

    &::before {
      content: "⚠️";
      margin-right: 0.75rem;
      font-size: 1.25rem;
    }
  }
}

// Animations
@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// Responsive design
@media (max-width: 768px) {
  .journal-home {
    padding: 1rem;

    &__months-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 0.5rem;
    }

    &__month-content {
      padding: 0.75rem 0.25rem;
      font-size: 0.8rem;
    }

    &__title {
      font-size: 1.5rem;
    }

    &__subtitle {
      font-size: 1.125rem;
    }

    &__missions-grid {
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    &__missions-header {
      flex-direction: column;
      align-items: flex-start;
    }

    &__mission-card {
      padding: 1rem;
    }

    &__mission-number {
      top: -6px;
      right: 0.75rem;
      width: 1.5rem;
      height: 1.5rem;
      font-size: 0.75rem;
    }
  }
}

@media (max-width: 480px) {
  .journal-home {
    &__months-grid {
      grid-template-columns: 1fr;
    }

    &__month-content {
      padding: 1rem 0.5rem;
    }

    &__missions {
      padding: 1rem;
    }

    &__mission-content {
      flex-direction: column;
      gap: 0.5rem;
    }

    &__mission-icon {
      align-self: flex-start;
    }
  }
}
</style>
