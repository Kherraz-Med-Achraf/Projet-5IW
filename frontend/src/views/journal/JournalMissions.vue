<!-- src/views/journal/JournalMissions.vue -->
<template>
  <div class="journal-missions">
    <h1 class="journal-missions__title">
      Missions annuelles – {{ childName }} – {{ yearLabel }}
    </h1>

    <div v-if="!loaded" class="journal-missions__loading">Chargement…</div>

    <div v-else class="journal-missions__content">
      <!-- Liste des missions -->
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

    <!-- Modal de confirmation -->
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
  const c = childStore.referentChildren.find((c) => c.id === childId);
  return c ? `${c.firstName} ${c.lastName}` : "";
});
const yearLabel = computed(() => {
  const y = journalStore.academicYears.find((y) => y.id === yearId);
  return y?.label || "";
});

/* chargement initial */
onMounted(async () => {
  try {
    await journalStore.fetchMissions(childId, yearId);
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

    if (missionsList.length > 0) {
      toast.success(
        `${missionsList.length} mission${
          missionsList.length > 1 ? "s" : ""
        } chargée${missionsList.length > 1 ? "s" : ""} avec succès`
      );
    } else {
      toast.info(
        "Aucune mission trouvée. Cliquez sur 'Ajouter une mission' pour commencer."
      );
    }
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
  toast.success("Nouvelle mission ajoutée");
}

function removeMission(index: number) {
  const missionDescription =
    missionsList[index].description || `Mission ${index + 1}`;
  missionsList.splice(index, 1);
  toast.info(`Mission "${missionDescription}" supprimée`);
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

    if (payload.length === 0) {
      toast.warning(
        "Aucune mission à sauvegarder. Veuillez ajouter au moins une mission."
      );
      return;
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

    toast.success(
      `${payload.length} mission${payload.length > 1 ? "s" : ""} sauvegardée${
        payload.length > 1 ? "s" : ""
      } avec succès !`
    );
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

<style lang="scss" scoped>
@use "sass:color";

.journal-missions {
  padding: 2rem;
  max-width: 48rem;
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

  &__loading {
    text-align: center;
    color: $text-muted;
    padding: 2rem;
    font-size: 1.125rem;
    background-color: $bg-primary;
    border-radius: 0.75rem;
    border: 1px solid $border;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  &__content {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  &__mission-item {
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

  &__mission-row {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  &__input {
    flex: 1;
    padding: 0.75rem;
    border: 2px solid $border;
    border-radius: 0.5rem;
    background-color: $bg-secondary;
    color: $text-primary;
    font-size: 1rem;
    font-weight: 500;
    transition: all 0.2s ease;

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

    &::placeholder {
      color: $text-muted;
    }
  }

  &__btn {
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    font-weight: 600;
    transition: all 0.2s ease;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    position: relative;
    overflow: hidden;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    &--primary {
      background: linear-gradient(135deg, $accent-primary, $accent-hover);
      color: white;
      box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);

      &:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 4px 16px rgba(59, 130, 246, 0.4);
      }

      &:focus {
        outline: none;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
      }
    }

    &--success {
      background: linear-gradient(
        135deg,
        $success,
        color.adjust($success, $lightness: -5%)
      );
      color: white;
      box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);

      &:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 4px 16px rgba(16, 185, 129, 0.4);
      }

      &:focus {
        outline: none;
        box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
      }
    }

    &--danger {
      background: linear-gradient(
        135deg,
        $error,
        color.adjust($error, $lightness: -5%)
      );
      color: white;
      box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
      height: 2.25rem;

      &:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 4px 16px rgba(239, 68, 68, 0.4);
      }

      &:focus {
        outline: none;
        box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2);
      }
    }

    &--small {
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
    }
  }

  &__ai-section {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-top: 0.5rem;
  }

  &__checkbox {
    width: 1.25rem;
    height: 1.25rem;
    accent-color: $accent-primary;
    cursor: pointer;
  }

  &__label {
    font-size: 0.875rem;
    color: $text-secondary;
    font-weight: 500;
    cursor: pointer;
  }

  &__generating {
    font-size: 0.75rem;
    color: $text-muted;
    font-style: italic;
  }

  &__proposal {
    margin-top: 1rem;
    background: linear-gradient(
      135deg,
      rgba($success, 0.05),
      rgba($accent-primary, 0.05)
    );
    padding: 1.5rem;
    border-radius: 0.75rem;
    border: 1px solid rgba($success, 0.2);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }

  &__proposal-text {
    margin-bottom: 1rem;
    color: $text-secondary;
    font-size: 0.875rem;
    line-height: 1.6;

    strong {
      color: $text-primary;
      font-weight: 600;
    }
  }

  &__add-btn {
    margin-bottom: 1.5rem;
    padding: 1rem 2rem;
    font-size: 1.125rem;
    align-self: flex-start;
  }

  &__actions {
    display: flex;
    gap: 1rem;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 1.5rem;
    background-color: $bg-primary;
    border-radius: 0.75rem;
    border: 1px solid $border;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  &__save-btn {
    padding: 1rem 2rem;
    font-size: 1.125rem;

    &::before {
      content: "💾";
      margin-right: 0.5rem;
    }
  }

  &__back-btn {
    color: $text-muted;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 500;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    transition: all 0.2s ease;

    &:hover {
      color: $text-primary;
      background-color: $bg-secondary;
      text-decoration: underline;
    }
  }

  &__error {
    color: $error;
    background: linear-gradient(135deg, rgba($error, 0.1), rgba($error, 0.05));
    border: 2px solid rgba($error, 0.3);
    padding: 1.5rem;
    border-radius: 0.75rem;
    margin-top: 1.5rem;
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

  // Modal de confirmation
  &__modal-overlay {
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

  &__modal {
    background: $bg-primary;
    border-radius: 1rem;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
    max-width: 28rem;
    width: 90%;
    overflow: hidden;
    animation: slideIn 0.3s ease;
    border: 1px solid $border;
  }

  &__modal-header {
    background: linear-gradient(
      135deg,
      rgba($warning, 0.1),
      rgba($error, 0.05)
    );
    padding: 1.5rem;
    border-bottom: 1px solid rgba($warning, 0.2);
  }

  &__modal-title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
    color: $text-primary;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  &__modal-icon {
    font-size: 1.5rem;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
  }

  &__modal-content {
    padding: 1.5rem;
  }

  &__modal-text {
    margin: 0 0 1rem 0;
    color: $text-secondary;
    font-size: 1rem;
    line-height: 1.5;
  }

  &__modal-warning {
    margin: 0 0 1rem 0;
    padding: 1rem;
    background: linear-gradient(
      135deg,
      rgba($warning, 0.1),
      rgba($error, 0.05)
    );
    border: 1px solid rgba($warning, 0.3);
    border-radius: 0.5rem;
    color: $text-primary;
    font-size: 0.875rem;
    line-height: 1.4;

    strong {
      color: $error;
      font-weight: 600;
    }
  }

  &__modal-question {
    margin: 0;
    color: $text-primary;
    font-size: 1rem;
    font-weight: 500;
    text-align: center;
  }

  &__modal-actions {
    padding: 1.5rem;
    border-top: 1px solid $border;
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    background-color: $bg-secondary;
  }

  &__modal-btn {
    min-width: 140px;
    justify-content: center;
    height: unset;
  }

  &__btn-icon {
    margin-right: 0.5rem;
    font-size: 1rem;
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

    &__title {
      font-size: 1.5rem;
    }

    &__mission-row {
      flex-direction: column;
      gap: 0.75rem;
    }

    &__actions {
      flex-direction: column;
      align-items: stretch;
    }

    &__back-btn {
      margin-left: 0;
      margin-top: 1rem;
    }
  }
}
</style>
