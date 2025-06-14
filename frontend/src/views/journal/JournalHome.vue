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

    <!-- 3) Missions annuelles (liste à puces) -->
    <div
      v-if="missions.length && selectedYearId"
      class="journal-home__missions"
    >
      <h2 class="journal-home__subtitle">Missions de l'année :</h2>
      <ul class="journal-home__missions-list">
        <li
          v-for="m in missions"
          :key="m.id"
          class="journal-home__mission-item"
        >
          {{ m.description }}
        </li>
      </ul>
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
}

/**
 * Lorsque l'éducateur change d'année, on va chercher missions + journaux.
 */
async function onYearChange() {
  if (!selectedChildId.value || !selectedYearId.value) return;
  error.value = "";
  journalStore.missions = [];
  journalStore.journals = [];
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
 * Au montage, on charge :
 * 1) la liste des enfants référés
 * 2) les années scolaires
 */
onMounted(async () => {
  try {
    await journalStore.fetchReferentChildren();
    await journalStore.fetchAcademicYears();
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
// Variables de couleurs pour le thème sobre et épuré
$bg-primary: #ffffff;
$bg-secondary: #f8fafc;
$bg-tertiary: #f1f5f9;
$text-primary: #0f172a;
$text-secondary: #475569;
$text-muted: #94a3b8;
$accent-primary: #3b82f6;
$accent-hover: #2563eb;
$success: #10b981;
$warning: #f59e0b;
$error: #ef4444;
$border: #e2e8f0;

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
      rgba($success, 0.05),
      rgba($accent-primary, 0.05)
    );
    padding: 2rem;
    border-radius: 1rem;
    border: 1px solid rgba($success, 0.2);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    position: relative;

    &::before {
      content: "📚";
      position: absolute;
      top: 1rem;
      right: 1rem;
      font-size: 2rem;
      opacity: 0.3;
    }
  }

  &__subtitle {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 1.5rem;
    color: $text-primary;
    display: flex;
    align-items: center;

    &::before {
      content: "";
      width: 6px;
      height: 1.5rem;
      background: linear-gradient(135deg, $success, $accent-primary);
      margin-right: 1rem;
      border-radius: 3px;
    }
  }

  &__missions-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  &__mission-item {
    padding: 1rem 1.5rem;
    color: $text-primary;
    font-size: 1rem;
    line-height: 1.6;
    background-color: rgba(255, 255, 255, 0.7);
    border-radius: 0.5rem;
    border-left: 4px solid $accent-primary;
    position: relative;
    transition: all 0.2s ease;

    &:hover {
      background-color: rgba(255, 255, 255, 0.9);
      transform: translateX(4px);
    }

    &::before {
      content: "✓";
      position: absolute;
      left: -2px;
      top: 50%;
      transform: translateY(-50%);
      width: 1.5rem;
      height: 1.5rem;
      background-color: $accent-primary;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: bold;
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
  }
}
</style>
