<!-- src/views/journal/JournalMissions.vue -->
<template>
  <div class="journal-missions">
    <h1 class="journal-missions__title">
      Missions annuelles – {{ childName }} – {{ yearLabel }}
    </h1>

    <div v-if="!loaded" class="journal-missions__loading">Chargement…</div>

    <div v-else class="journal-missions__content">
     
      <div
        v-for="(mission, index) in missionsList"
        :key="mission.id ?? index"
        class="journal-missions__mission-item"
      >
        <div class="journal-missions__mission-row">
          <input
            v-model="mission.description"
            :placeholder="`Mission ${index + 1}`"
            class="journal-missions__input"
            type="text"
          />

          <!-- bouton suppression -->
          <button
            @click="removeMission(index)"
            class="journal-missions__btn journal-missions__btn--danger"
          >
            Supprimer
          </button>
        </div>

        <!-- IA helper -->
        <div class="journal-missions__ai-section">
          <input
            type="checkbox"
            :id="`cb-ai-${index}`"
            v-model="mission.propose"
            @change="onPropose(index)"
            class="journal-missions__checkbox"
          />
          <label :for="`cb-ai-${index}`" class="journal-missions__label">
            Proposer une amélioration via IA
          </label>

          <!-- loader -->
          <span v-if="mission.generating" class="journal-missions__generating">
            (génération…)
          </span>
        </div>

        <!-- proposition affichée quand dispo -->
        <div
          v-if="mission.proposal && !mission.generating"
          class="journal-missions__proposal"
        >
          <p class="journal-missions__proposal-text">
            <strong>Proposition :</strong> {{ mission.proposal }}
          </p>

          <button
            @click="acceptProposal(index)"
            class="journal-missions__btn journal-missions__btn--success journal-missions__btn--small"
          >
            Utiliser cette proposition
          </button>
        </div>
      </div>

      <!-- ajouter mission -->
      <button
        @click="addMission"
        class="journal-missions__btn journal-missions__btn--primary journal-missions__add-btn"
      >
        + Ajouter une mission
      </button>

      <!-- actions principales -->
      <div class="journal-missions__actions">
        <button @click="onBack" class="journal-missions__back-btn">
          ← Retour
        </button>
        <button
          @click="onSave"
          :disabled="saving"
          class="journal-missions__btn journal-missions__btn--success journal-missions__save-btn"
        >
          {{ saving ? "Enregistrement…" : "Enregistrer les missions" }}
        </button>
      </div>

      <div v-if="error" class="journal-missions__error">{{ error }}</div>
    </div>

    <!-- Modal de confirmation de suppression -->
    <div v-if="showDeleteModal" class="journal-missions__modal-overlay">
      <div class="journal-missions__modal">
        <div class="journal-missions__modal-header">
          <h3 class="journal-missions__modal-title">
            <span class="journal-missions__modal-icon">🗑️</span>
            Confirmer la suppression
          </h3>
        </div>

        <div class="journal-missions__modal-content">
          <p class="journal-missions__modal-text">
            Êtes-vous sûr de vouloir supprimer cette mission ?
          </p>
          <div class="journal-missions__modal-mission-preview">
            <strong>Mission à supprimer :</strong><br>
            "{{ missionToDelete?.mission.description || `Mission ${(missionToDelete?.index ?? 0) + 1}` }}"
          </div>
          <p class="journal-missions__modal-warning">
            <strong>Cette action est irréversible.</strong>
          </p>
        </div>

        <div class="journal-missions__modal-actions">
          <button
            @click="cancelDeleteMission"
            class="journal-missions__btn journal-missions__btn--primary journal-missions__modal-btn"
          >
            <span class="journal-missions__btn-icon">↩️</span>
            Annuler
          </button>
          <button
            @click="confirmDeleteMission"
            class="journal-missions__btn journal-missions__btn--danger journal-missions__modal-btn"
          >
            🗑️ Supprimer définitivement
          </button>
        </div>
      </div>
    </div>

    <!-- Modal de confirmation de navigation -->
    <div v-if="showConfirmModal" class="journal-missions__modal-overlay">
      <div class="journal-missions__modal">
        <div class="journal-missions__modal-header">
          <h3 class="journal-missions__modal-title">
            <span class="journal-missions__modal-icon">⚠️</span>
            Modifications non sauvegardées
          </h3>
        </div>

        <div class="journal-missions__modal-content">
          <p class="journal-missions__modal-text">
            Vous avez des missions en cours d'édition qui ne sont pas encore
            sauvegardées.
          </p>
          <p class="journal-missions__modal-warning">
            <strong
              >Si vous quittez maintenant, ces modifications seront
              perdues.</strong
            >
          </p>
          <p class="journal-missions__modal-question">
            Êtes-vous sûr de vouloir quitter sans sauvegarder ?
          </p>
        </div>

        <div class="journal-missions__modal-actions">
          <button
            @click="cancelLeave"
            class="journal-missions__btn journal-missions__btn--primary journal-missions__modal-btn"
          >
            <span class="journal-missions__btn-icon">✏️</span>
            Continuer l'édition
          </button>
          <button
            @click="confirmLeave"
            class="journal-missions__btn journal-missions__btn--danger journal-missions__modal-btn"
          >
            Quitter sans sauvegarder
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useJournalStore } from "@/stores/journalStore";
import { useChildStore } from "@/stores/childStore";
import { useToast } from "vue-toastification";

const journalStore = useJournalStore();
const childStore = useChildStore();
const toast = useToast();

const route = useRoute();
const router = useRouter();

const childId = Number(route.params.childId);
const yearId = Number(route.params.yearId);

const loaded = ref(false);
const saving = ref(false);
const error = ref<string>("");
const showConfirmModal = ref(false);
const showDeleteModal = ref(false);
const missionToDelete = ref<{ index: number; mission: MissionVM } | null>(null);

interface MissionVM {
  id?: number;
  description: string;
  propose?: boolean; // checkbox state
  generating?: boolean; // loading flag
  proposal?: string | null; // IA suggestion
}

/* liste éditable */
const missionsList = reactive<MissionVM[]>([]);

/* libellés */
const childName = computed(() => {
  // Essayer d'abord avec childStore.referentChildren
  let c = childStore.referentChildren.find((c) => c.id === childId);
  // Si pas trouvé, essayer avec journalStore.childrenRefered
  if (!c) {
    c = journalStore.childrenRefered.find((c) => c.id === childId);
  }
  return c ? `${c.firstName} ${c.lastName}` : "";
});
const yearLabel = computed(() => {
  const y = journalStore.academicYears.find((y) => y.id === yearId);
  return y?.label || "";
});

/* chargement initial */
onMounted(async () => {
  try {
    // Charger les données nécessaires pour l'affichage du titre
    await Promise.all([
      childStore.fetchReferentChildren(),
      journalStore.fetchReferentChildren(), // Charger aussi les enfants du journalStore
      journalStore.fetchAcademicYears(),
      journalStore.fetchMissions(childId, yearId)
    ]);

    missionsList.splice(
      0,
      missionsList.length,
      ...journalStore.missions.map((m) => ({
        id: m.id,
        description: m.description,
        propose: false,
        generating: false,
        proposal: null,
      }))
    );

  } catch (e: any) {
    error.value = e.message;
    toast.error("Erreur lors du chargement des missions");
  } finally {
    loaded.value = true;
  }
});

/* ajout / suppression */
function addMission() {
  missionsList.push({
    description: "",
    propose: false,
    generating: false,
    proposal: null,
  });
}

function removeMission(index: number) {
  const mission = missionsList[index];
  missionToDelete.value = { index, mission };
  showDeleteModal.value = true;
}

async function confirmDeleteMission() {
  if (!missionToDelete.value) return;
  
  const { index, mission } = missionToDelete.value;
  const missionDescription = mission.description || `Mission ${index + 1}`;
  
  try {
    // Si la mission a un ID, la supprimer en base
    if (mission.id) {
      await fetch(`http://localhost:3000/mission/${mission.id}`, {
        method: 'DELETE',
        headers: {
          ...journalStore.getAuthHeaders(),
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Supprimer de la liste locale
    missionsList.splice(index, 1);
    toast.success(`Mission "${missionDescription}" supprimée avec succès`);
    
  } catch (e: any) {
    toast.error(`Erreur lors de la suppression : ${e.message}`);
  }
  
  // Fermer la modal
  showDeleteModal.value = false;
  missionToDelete.value = null;
}

function cancelDeleteMission() {
  showDeleteModal.value = false;
  missionToDelete.value = null;
}

/* IA : génération de proposition */
async function onPropose(index: number) {
  const m = missionsList[index];
  if (!m.propose) {
    /* case décochée : on efface la suggestion */
    m.proposal = null;
    m.generating = false;
    return;
  }
  if (!m.description.trim()) {
    toast.warning(
      "Veuillez d'abord décrire la mission avant de demander une amélioration."
    );
    m.propose = false;
    return;
  }

  m.generating = true;
  m.proposal = null;

  toast.info("Génération d'une proposition d'amélioration en cours...");

  try {
    /* appel au store — ajoutera la logique OpenAI dans un second temps */
    const suggestion = await journalStore.proposeMissionImprovement(
      m.description
    );
    m.proposal = suggestion;
    toast.success("Proposition d'amélioration générée avec succès !");
  } catch (e: any) {
    const errorMessage = e.message || "Erreur de génération de la proposition.";
    error.value = errorMessage;
    toast.error(errorMessage);
    m.propose = false;
  } finally {
    m.generating = false;
  }
}

/* accepte la suggestion → remplace le texte d'origine */
function acceptProposal(index: number) {
  const m = missionsList[index];
  if (m.proposal) {
    m.description = m.proposal;
    /* on décoche la case et on retire la proposition */
    m.propose = false;
    m.proposal = null;
    toast.success("Proposition d'amélioration appliquée à la mission");
  }
}

/* enregistrement */
async function onSave() {
  error.value = "";
  saving.value = true;

  try {
    /* enlever les lignes vides avant d'envoyer */
    const payload = missionsList
      .map((m) => ({ id: m.id, description: m.description.trim() }))
      .filter((m) => m.description !== "");

    // Permettre la sauvegarde même avec 0 missions (pour supprimer toutes les missions existantes)
    if (payload.length === 0) {
      toast.info("Suppression de toutes les missions...");
    }

    await journalStore.saveMissions(childId, yearId, payload);
    await journalStore.fetchMissions(childId, yearId);

    missionsList.splice(
      0,
      missionsList.length,
      ...journalStore.missions.map((m) => ({
        id: m.id,
        description: m.description,
      }))
    );

    if (payload.length === 0) {
      toast.success("Toutes les missions ont été supprimées avec succès !");
    } else {
      toast.success(
        `${payload.length} mission${payload.length > 1 ? "s" : ""} sauvegardée${
          payload.length > 1 ? "s" : ""
        } avec succès !`
      );
    }
  } catch (e: any) {
    error.value = e.message;
    toast.error("Erreur lors de la sauvegarde des missions");
  } finally {
    saving.value = false;
  }
}

/* navigation */
function onBack() {
  // Vérifier s'il y a des modifications non sauvegardées
  const hasUnsavedChanges = missionsList.some(
    (m) => m.description.trim() !== "" && !m.id
  );

  if (hasUnsavedChanges) {
    showConfirmModal.value = true;
    return;
  }

  router.back();
}

function confirmLeave() {
  showConfirmModal.value = false;
  toast.info("Retour à la page précédente");
  router.back();
}

function cancelLeave() {
  showConfirmModal.value = false;
  toast.info("Vous pouvez continuer à éditer vos missions");
}
</script>

<style scoped lang="scss">
.journal-missions {
  max-width: 64rem;
  margin: 0 auto;
  padding: 2rem;

  .journal-missions__title {
    text-align: center;
    margin-bottom: 3rem;
    padding: 2rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 12px;
    color: white;
    font-size: 2rem;
    font-weight: 600;
    line-height: 1.2;
  }

  .journal-missions__loading {
    text-align: center;
    padding: 4rem;
    color: #6b7280;
    font-size: 1.1rem;
  }

  .journal-missions__content {
    .journal-missions__mission-item {
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

      .journal-missions__mission-row {
        display: flex;
        gap: 1rem;
        align-items: center;
        margin-bottom: 1.5rem;

        .journal-missions__input {
          flex: 1;
          padding: 0.75rem 1rem;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 1rem;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;

          &:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
          }

          &::placeholder {
            color: #9ca3af;
          }
        }

        .journal-missions__btn--danger {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;

          &:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
          }

          &:active {
            transform: translateY(0);
          }
        }
      }

      .journal-missions__ai-section {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 1rem;
        padding: 1rem;
        background: #f8fafc;
        border-radius: 8px;
        border: 1px solid #e2e8f0;

        .journal-missions__checkbox {
          width: 1.25rem;
          height: 1.25rem;
          accent-color: #667eea;
        }

        .journal-missions__label {
          color: #374151;
          font-weight: 500;
          margin: 0;
        }

        .journal-missions__generating {
          color: #667eea;
          font-style: italic;
          font-size: 0.9rem;
        }
      }

      .journal-missions__proposal {
        background: linear-gradient(
          135deg,
          rgba(102, 126, 234, 0.1),
          rgba(118, 75, 162, 0.1)
        );
        border: 1px solid rgba(102, 126, 234, 0.2);
        border-radius: 8px;
        padding: 1.5rem;
        margin-top: 1rem;

        .journal-missions__proposal-text {
          margin: 0 0 1rem 0;
          color: #374151;
          line-height: 1.6;

          strong {
            color: #111827;
          }
        }

        .journal-missions__btn--success {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.9rem;

          &:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
          }
        }

        .journal-missions__btn--small {
          font-size: 0.875rem;
          padding: 0.5rem 1rem;
        }
      }
    }

    .journal-missions__add-btn {
      display: block;
      margin: 2rem auto;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 1rem 2rem;
      border-radius: 12px;
      font-size: 1.1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px -5px rgba(102, 126, 234, 0.4);
      }

      &:active {
        transform: translateY(0);
      }
    }

    .journal-missions__actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 3rem;
      padding: 2rem;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);

      .journal-missions__back-btn {
        color: #6b7280;
        background: none;
        border: none;
        cursor: pointer;
        font-size: 1rem;
        font-weight: 500;
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        transition: all 0.2s ease;

        &:hover {
          color: #374151;
          background-color: #f3f4f6;
        }
      }

      .journal-missions__save-btn {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        border: none;
        padding: 1rem 2rem;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
      }
    }

    .journal-missions__error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #dc2626;
      padding: 1rem;
      border-radius: 12px;
      margin-top: 1rem;
      font-weight: 500;
    }
  }

  // Modal de confirmation
  .journal-missions__modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(4px);
    animation: fadeIn 0.3s ease;
  }

  .journal-missions__modal {
    background: white;
    border-radius: 12px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
    max-width: 28rem;
    width: 90%;
    overflow: hidden;
    animation: slideIn 0.3s ease;

    .journal-missions__modal-header {
      background:t(
        135deg,
        rgba(245, 158, 11, 0.1)
      );
      padding: 1.5rem;
      border-bottom: 1px solid rgba(245, 158, 11, 0.2);

      .journal-missions__modal-title {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
        color: #111827;
        display: flex;
        align-items: center;
        gap: 0.75rem;

        .journal-missions__modal-icon {
          font-size: 1.5rem;
        }
      }
    }

    .journal-missions__modal-content {
      padding: 1.5rem;

      .journal-missions__modal-text {
        margin: 0 0 1rem 0;
        color: #6b7280;
        font-size: 1rem;
        line-height: 1.5;
      }

      .journal-missions__modal-warning {
        margin: 0 0 1rem 0;
        padding: 1rem;
        background: linear-gradient(
          135deg,
          rgba(245, 158, 11, 0.1),
          rgba(239, 68, 68, 0.05)
        );
        border: 1px solid rgba(245, 158, 11, 0.3);
        border-radius: 8px;
        color: #111827;
        font-size: 0.875rem;
        line-height: 1.4;

        strong {
          color: #dc2626;
          font-weight: 600;
        }
      }

      .journal-missions__modal-question {
        margin: 0;
        color: #111827;
        font-size: 1rem;
        font-weight: 500;
        text-align: center;
      }

      .journal-missions__modal-mission-preview {
        margin: 1rem 0;
        padding: 1rem;
        background: linear-gradient(
          135deg,
          rgba(59, 130, 246, 0.1),
          rgba(147, 51, 234, 0.05)
        );
        border: 1px solid rgba(59, 130, 246, 0.3);
        border-radius: 8px;
        color: #111827;
        font-size: 0.875rem;
        line-height: 1.4;

        strong {
          color: #1f2937;
          font-weight: 600;
        }
      }
    }

    .journal-missions__modal-actions {
      padding: 1.5rem;
      border-top: 1px solid #e5e7eb;
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
      background-color: #f9fafb;

      .journal-missions__modal-btn {
        min-width: 140px;
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        border: none;

        &.journal-missions__btn--primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;

          &:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
          }

          .journal-missions__btn-icon {
            margin-right: 0.5rem;
          }
        }

        &.journal-missions__btn--danger {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;

          &:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
          }
        }
      }
    }
  }
}

// Animations pour la modal
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

// Responsive design
@media (max-width: 768px) {
  .journal-missions {
    padding: 1rem;

    .journal-missions__title {
      font-size: 1.5rem;
      padding: 1.5rem;
    }

    .journal-missions__content {
      .journal-missions__mission-item {
        padding: 1.5rem;

        .journal-missions__mission-row {
          flex-direction: column;
          gap: 0.75rem;
        }
      }

      .journal-missions__actions {
        flex-direction: column;
        gap: 1rem;
        align-items: stretch;

        .journal-missions__back-btn {
          order: 2;
        }

        .journal-missions__save-btn {
          order: 1;
        }
      }
    }
  }
}
</style>
