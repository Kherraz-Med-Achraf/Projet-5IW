<!-- src/views/journal/JournalHomeParent.vue -->
<template>
  <div class="journal-parent">
    <h1 class="journal-parent__title">Journal de bord des enfants</h1>

    <!-- Sélection de l'enfant -->
    <div class="journal-parent__section">
      <label for="child-select" class="journal-parent__label">
        Sélectionnez un enfant :
      </label>
      <select
        id="child-select"
        v-model="selectedChildId"
        @change="onChildChange"
        class="journal-parent__select"
      >
        <option disabled value="">-- Choisir un enfant --</option>
        <option v-for="child in children" :key="child.id" :value="child.id">
          {{ child.firstName }} {{ child.lastName }}
        </option>
      </select>
    </div>

    <!-- Sélection de l'année scolaire -->
    <div v-if="selectedChildId" class="journal-parent__section">
      <label for="year-select" class="journal-parent__label">
        Sélectionnez une année scolaire :
      </label>
      <select
        id="year-select"
        v-model="selectedYearId"
        @change="onYearChange"
        class="journal-parent__select"
      >
        <option disabled value="">-- Choisir une année --</option>
        <option v-for="year in academicYears" :key="year.id" :value="year.id">
          {{ year.label }}
        </option>
      </select>
    </div>

    <!-- Bouton pour exporter le journal de l'année en PDF -->
    <div
      v-if="selectedChildId && selectedYearId && hasAnySubmittedJournal"
      class="journal-parent__actions"
    >
      <button
        @click="exportYearReport"
        class="journal-parent__btn journal-parent__btn--primary"
      >
        📄 Exporter le journal complet de l'année en PDF
      </button>
    </div>

    <!-- Grille des mois -->
    <div
      v-if="selectedChildId && selectedYearId"
      class="journal-parent__months"
    >
      <h2 class="journal-parent__subtitle">Rapports mensuels disponibles</h2>
      <div class="journal-parent__months-grid">
        <div
          v-for="monthNum in 12"
          :key="monthNum"
          class="journal-parent__month-cell"
          :class="{
            'journal-parent__month-cell--available': journalExists(monthNum),
          }"
        >
          <div class="journal-parent__month-content">
            <span class="journal-parent__month-name">{{
              monthNames[monthNum - 1]
            }}</span>
            <div class="journal-parent__month-actions">
              <template v-if="journalExists(monthNum)">
                <button
                  @click="viewReport(monthNum)"
                  class="journal-parent__btn journal-parent__btn--success journal-parent__btn--small"
                >
                  📋 Consulter
                </button>
              </template>
              <template v-else>
                <span class="journal-parent__unavailable">Non disponible</span>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Message si aucun enfant ou année non sélectionnée -->
    <div
      v-if="!selectedChildId || !selectedYearId"
      class="journal-parent__empty"
    >
      <div class="journal-parent__empty-icon">📚</div>
      <p class="journal-parent__empty-text">
        Veuillez sélectionner un enfant et une année scolaire pour afficher les
        rapports.
      </p>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from "vue";
import { useChildStore } from "@/stores/childStore";
import { useJournalStore } from "@/stores/journalStore";
import { useAuthStore } from "@/stores/auth";
import { useRouter } from "vue-router";
import { jsPDF } from "jspdf"; // Assurez-vous d'avoir installé jspdf

const childStore = useChildStore();
const journalStore = useJournalStore();
const authStore = useAuthStore();
const router = useRouter();

// Listes et sélections réactives
const children = ref<
  Array<{ id: number; firstName: string; lastName: string }>
>([]);
const academicYears = ref<Array<{ id: number; label: string }>>([]);
const selectedChildId = ref<number | "">("");
const selectedYearId = ref<number | "">("");

// Journaux récupérés pour l'enfant + année
const journals = computed(() => journalStore.journals);

// Tableau des noms de mois
const monthNames = [
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

// Au montage, charger la liste des enfants du parent et des années
onMounted(async () => {
  // Récupération des enfants du parent connecté
  if (!childStore.referentChildren.length) {
    await childStore.fetchReferentChildren();
  }
  children.value = childStore.referentChildren.map((c) => ({
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
  }));

  // Récupération des années scolaires
  if (!journalStore.academicYears.length) {
    await journalStore.fetchAcademicYears();
  }
  academicYears.value = journalStore.academicYears.map((y) => ({
    id: y.id,
    label: y.label,
  }));
});

// Quand l'enfant change, on efface l'année sélectionnée et la grille
function onChildChange() {
  selectedYearId.value = "";
  // Réinitialiser la liste des journaux dans le store
  journalStore.journals = [];
}

// Quand l'année change, on va chercher les journaux correspondants
async function onYearChange() {
  if (selectedChildId.value && selectedYearId.value) {
    await journalStore.fetchJournals(
      selectedChildId.value,
      selectedYearId.value
    );
  }
}

// Vérifie si un journal existe ET est soumis pour un mois donné
function journalExists(month: number): boolean {
  return journals.value.some((j) => j.month === month && j.isSubmitted);
}

// Indique s'il y a au moins un journal soumis dans l'année
const hasAnySubmittedJournal = computed(() => {
  return journals.value.some((j) => j.isSubmitted);
});

// Redirection vers la page de consultation du journal de bord
function viewReport(month: number) {
  router.push({
    name: "JournalMonth",
    params: {
      childId: selectedChildId.value,
      yearId: selectedYearId.value,
      month,
    },
  });
}

// Génération du PDF complet de l'année
async function exportYearReport() {
  // Créer le document PDF
  const doc = new jsPDF();
  let y = 20;

  // Titre principal (avec espace et "de")
  doc.setFontSize(16);
  doc.text(`Journal annuel de ${childDisplayName.value}`, 20, 15);

  // Pour chaque mois soumis, afficher le mois et le contenu
  doc.setFontSize(12);
  journals.value
    .filter((j) => j.isSubmitted)
    .sort((a, b) => a.month - b.month)
    .forEach((j, idx) => {
      const monthLabel = monthNames[j.month - 1];
      doc.text(`${monthLabel}`, 20, y);
      y += 8;

      const observations = j.contenu || "";
      const splitText = doc.splitTextToSize(observations, 170);
      doc.text(splitText, 25, y);
      y += splitText.length * 7 + 5;

      // Si on approche de la fin d'une page, ajouter une nouvelle page
      if (y > 270 && idx < journals.value.length - 1) {
        doc.addPage();
        y = 20;
      }
    });

  // Sauvegarder le PDF (nom de fichier avec underscore pour éviter espaces)
  doc.save(`JournalAnnuel_de_${childFileLabel.value}_${yearLabel.value}.pdf`);
}

// Computed pour libeller l'enfant et l'année dans le PDF
const childDisplayName = computed(() => {
  const c = children.value.find((c) => c.id === selectedChildId.value);
  return c ? `${c.firstName} ${c.lastName}` : "";
});
// Pour le nom de fichier, on utilise un label sans espaces
const childFileLabel = computed(() => {
  const c = children.value.find((c) => c.id === selectedChildId.value);
  return c ? `${c.firstName}_${c.lastName}` : "";
});
const yearLabel = computed(() => {
  const y = academicYears.value.find((y) => y.id === selectedYearId.value);
  return y ? y.label.replace(/\s+/g, "_") : "";
});
</script>

<style scoped lang="scss">
.journal-parent {
  max-width: 64rem;
  margin: 0 auto;
  padding: 2rem;

  .journal-parent__title {
    text-align: center;
    margin-bottom: 3rem;
    padding: 2rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 12px;
    color: white;
    font-size: 2.5rem;
    font-weight: 600;
  }

  .journal-parent__section {
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

    .journal-parent__label {
      display: block;
      margin-bottom: 0.75rem;
      font-weight: 600;
      color: #111827;
      font-size: 1.1rem;
    }

    .journal-parent__select {
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

  .journal-parent__actions {
    text-align: center;
    margin: 2rem 0;

    .journal-parent__btn {
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

      &--success {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;

        &:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        &:active {
          transform: translateY(0);
        }
      }

      &--small {
        padding: 0.5rem 1rem;
        font-size: 0.9rem;
        border-radius: 8px;
      }
    }
  }

  .journal-parent__months {
    background: white;
    border-radius: 12px;
    padding: 2rem;
    margin-bottom: 2rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);

    .journal-parent__subtitle {
      margin: 0 0 1.5rem 0;
      color: #111827;
      font-size: 1.5rem;
      font-weight: 600;
      text-align: center;
    }

    .journal-parent__months-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;

      .journal-parent__month-cell {
        background: #f9fafb;
        border: 2px solid #e2e8f0;
        border-radius: 12px;
        padding: 1.5rem;
        transition: all 0.2s ease;

        &--available {
          background: linear-gradient(
            135deg,
            rgba(16, 185, 129, 0.1),
            rgba(5, 150, 105, 0.05)
          );
          border-color: rgba(16, 185, 129, 0.3);

          &:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px -5px rgba(16, 185, 129, 0.2);
            border-color: #10b981;
          }
        }

        .journal-parent__month-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;

          .journal-parent__month-name {
            font-weight: 600;
            font-size: 1.1rem;
            color: #111827;
          }

          .journal-parent__month-actions {
            .journal-parent__unavailable {
              color: #9ca3af;
              font-size: 0.9rem;
              font-style: italic;
            }
          }
        }
      }
    }
  }

  .journal-parent__empty {
    background: white;
    border-radius: 12px;
    padding: 4rem 2rem;
    text-align: center;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);

    .journal-parent__empty-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
      opacity: 0.7;
    }

    .journal-parent__empty-text {
      color: #6b7280;
      font-size: 1.1rem;
      margin: 0;
      line-height: 1.6;
    }
  }
}

// Responsive design
@media (max-width: 768px) {
  .journal-parent {
    padding: 1rem;

    .journal-parent__title {
      font-size: 2rem;
      padding: 1.5rem;
    }

    .journal-parent__months {
      .journal-parent__months-grid {
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;

        .journal-parent__month-cell {
          padding: 1rem;
        }
      }
    }

    .journal-parent__empty {
      padding: 3rem 1.5rem;

      .journal-parent__empty-icon {
        font-size: 3rem;
      }
    }
  }
}
</style>
