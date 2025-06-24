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

<style scoped lang="scss">
.journal-home {
  max-width: 64rem;
  margin: 0 auto;
  padding: 0 2rem;
  .journal-home__title {
    text-align: center;
    margin-bottom: 3rem;
    padding: 2rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 12px;
    color: white;
    font-size: 2.5rem;
    font-weight: 600;
    width: 100%;
    max-width: 700px;
    margin: 50px auto 0 auto;
  }

  .journal-home__section {
    background: white;
    border-radius: 12px;
    padding: 2rem;
    margin-bottom: 2rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    transition: transform 0.2s ease, box-shadow 0.2s ease;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px -5px rgba(0, 0, 0, 0.2);
    }

    .journal-home__label {
      display: block;
      margin-bottom: 0.75rem;
      font-weight: 600;
      color: #111827;
      font-size: 1.1rem;
    }

    .journal-home__select {
      width: 100%;
      padding: 0.75rem 1rem;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      font-size: 1rem;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
      background: white;

      &:focus {
        outline: none;
        border-color: #667eea;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
      }
    }
  }

  .journal-home__actions {
    text-align: center;
    margin: 2rem 0;

    .journal-home__btn {
      padding: 1rem 2rem;
      border: none;
      border-radius: 12px;
      font-size: 1.1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;

      &--primary {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px -5px rgba(102, 126, 234, 0.4);
        }

        &:active {
          transform: translateY(0);
        }
      }
    }
  }

  .journal-home__missions {
    background: white;
    border-radius: 12px;
    padding: 2rem;
    margin-bottom: 2rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);

    .journal-home__missions-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;

      .journal-home__subtitle {
        margin: 0;
        color: #111827;
        font-size: 1.5rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 0.5rem;

        .journal-home__subtitle-icon {
          font-size: 1.8rem;
        }
      }

      .journal-home__missions-count {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 20px;
        font-size: 0.9rem;
        font-weight: 600;
        margin: 0;
      }
    }

    .journal-home__missions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;

      .journal-home__mission-card {
        background: #f8fafc;
        border: 2px solid #e2e8f0;
        border-radius: 12px;
        padding: 1.5rem;
        transition: all 0.3s ease;
        animation: fadeInUp 0.6s ease forwards;
        animation-delay: var(--delay);
        opacity: 0;
        transform: translateY(20px);

        &:hover {
          border-color: #667eea;
          transform: translateY(-2px);
          box-shadow: 0 8px 25px -5px rgba(102, 126, 234, 0.2);
        }

        .journal-home__mission-content {
          display: flex;
          align-items: flex-start;
          gap: 1rem;

          .journal-home__mission-icon {
            font-size: 1.5rem;
            flex-shrink: 0;
          }

          .journal-home__mission-text {
            margin: 0;
            color: #374151;
            line-height: 1.6;
            font-size: 1rem;
          }
        }
      }
    }
  }

  .journal-home__months {
    background: white;
    border-radius: 12px;
    padding: 2rem;
    margin-bottom: 2rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);

    .journal-home__subtitle {
      margin: 0 0 1.5rem 0;
      color: #111827;
      font-size: 1.5rem;
      font-weight: 600;
    }

    .journal-home__months-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;

      .journal-home__month-cell {
        background: white;
        border: 2px solid #e2e8f0;
        border-radius: 12px;
        padding: 1.5rem;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s ease;
        position: relative;

        &:hover:not(.journal-home__month-cell--disabled):not(
            .journal-home__month-cell--future
          ) {
          transform: translateY(-4px);
          box-shadow: 0 8px 25px -5px rgba(0, 0, 0, 0.2);
          border-color: #667eea;
        }

        &:active:not(.journal-home__month-cell--disabled):not(
            .journal-home__month-cell--future
          ) {
          transform: translateY(-2px);
        }

        &--submitted {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border-color: #10b981;

          .journal-home__month-icon--submitted {
            background-color: white;
            width: 25px;
            height: 25px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
          }
        }

        &--future {
          opacity: 0.5;
          cursor: not-allowed;
          background: #f9fafb;
          color: #9ca3af;

          &:hover {
            transform: none;
            box-shadow: none;
            border-color: #e2e8f0;
          }
        }

        &--disabled {
          opacity: 0.5;
          cursor: not-allowed;
          background: #f9fafb;
          color: #9ca3af;

          &:hover {
            transform: none;
            box-shadow: none;
            border-color: #e2e8f0;
          }
        }

        &--editable {
          &:hover {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;

            .journal-home__month-icon {
              background-color: white;
              width: 25px;
              height: 25px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
            }
          }
        }

        .journal-home__month-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          font-size: 1.1rem;

          .journal-home__month-icon {
            font-size: 1.2rem;
            opacity: 0.8;

            &--submitted {
              color: #10b981;
            }

            &--draft {
              color: #f59e0b;
            }

            &--editable {
              color: #667eea;
            }

            &--future {
              color: #9ca3af;
            }
          }
        }
      }
    }
  }

  .journal-home__error {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #dc2626;
    padding: 1rem;
    border-radius: 12px;
    margin-top: 1rem;
    font-weight: 500;
  }
}

@keyframes fadeInUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
