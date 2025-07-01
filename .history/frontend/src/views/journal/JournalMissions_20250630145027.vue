<!-- src/views/journal/JournalMissions.vue -->
<template>
  <div class="profile-container">
    <!-- Skip links for accessibility -->
    <a href="#main-content" class="skip-link">Aller au contenu principal</a>

    <!-- Modern Header with Gradient -->
    <div class="missions-hero">
      <div class="hero-content">
        <div class="hero-icon">
          <span class="material-icons">assignment</span>
        </div>
        <div class="hero-text">
          <h1>Gestion des missions</h1>
          <p class="hero-subtitle">{{ childName }} • {{ yearLabel }}</p>
        </div>
      </div>
    </div>

    <div id="main-content" class="profile-content">
      <!-- Loading State -->
      <div v-if="!loaded" class="loading-state">
        <div class="loading-spinner"></div>
        <h3>Chargement des missions</h3>
        <p>Veuillez patienter...</p>
      </div>

      <!-- Main Content -->
      <div v-else class="missions-container">
        <!-- Stats Cards -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">
              <span class="material-icons">assignment_turned_in</span>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ missionsList.length }}</div>
              <div class="stat-label">Missions définies</div>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon success">
              <span class="material-icons">check_circle</span>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ completedMissions }}</div>
              <div class="stat-label">Missions complètes</div>
            </div>
          </div>
        </div>

        <!-- Missions Section -->
        <div class="profile-section missions-section">
          <div class="section-header-modern">
            <div class="header-left">
              <span class="material-icons">task</span>
              <h2>Missions annuelles</h2>
            </div>
            <button
              @click="addMission"
              class="edit-btn edit-btn-primary"
            >
              <span class="material-icons">add</span>
              Nouvelle mission
            </button>
          </div>

          <!-- Mission Items -->
          <div class="missions-list">
            <div 
              v-for="(mission, index) in missionsList"
              :key="mission.id ?? index"
              class="mission-item"
            >
              <div class="mission-number">{{ index + 1 }}</div>
              
              <div class="mission-content">
                <!-- Mission Input -->
                <div class="mission-header">
                  <input
                    v-model="mission.description"
                    :placeholder="`Décrivez la mission ${index + 1}...`"
                    class="mission-input-modern"
                    type="text"
                  />
                  <button
                    @click="removeMission(index)"
                    class="delete-btn"
                    title="Supprimer cette mission"
                  >
                    <span class="material-icons">delete</span>
                  </button>
                </div>

                <!-- AI Helper -->
                <div class="ai-helper-modern">
                  <div class="ai-toggle">
                    <label class="ai-switch">
                      <input
                        type="checkbox"
                        :id="`cb-ai-${index}`"
                        v-model="mission.propose"
                        @change="onPropose(index)"
                        class="switch-input"
                      />
                      <span class="switch-slider"></span>
                    </label>
                    <div class="ai-label">
                      <span class="material-icons">psychology</span>
                      <span>Assistant IA</span>
                    </div>
                  </div>

                  <div v-if="mission.generating" class="ai-loading">
                    <div class="ai-spinner"></div>
                    <span>Génération en cours...</span>
                  </div>
                </div>

                <!-- AI Proposal -->
                <div
                  v-if="mission.proposal && !mission.generating"
                  class="ai-suggestion"
                >
                  <div class="suggestion-header">
                    <span class="material-icons">lightbulb</span>
                    <strong>Suggestion d'amélioration</strong>
                  </div>
                  <div class="suggestion-text">{{ mission.proposal }}</div>
                  
                  <div class="suggestion-actions">
                    <button
                      @click="acceptProposal(index)"
                      class="edit-btn edit-btn-success edit-btn-sm"
                    >
                      <span class="material-icons">check</span>
                      Appliquer
                    </button>
                    <button
                      @click="mission.proposal = null; mission.propose = false"
                      class="edit-btn edit-btn-secondary edit-btn-sm"
                    >
                      <span class="material-icons">close</span>
                      Ignorer
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Empty State -->
            <div v-if="missionsList.length === 0" class="empty-missions">
              <div class="empty-icon">
                <span class="material-icons">assignment_add</span>
              </div>
              <h3>Aucune mission définie</h3>
              <p>Commencez par créer votre première mission pour cette année scolaire.</p>
              <button
                @click="addMission"
                class="edit-btn edit-btn-primary"
              >
                <span class="material-icons">add</span>
                Créer ma première mission
              </button>
            </div>
          </div>
        </div>

        <!-- Action Bar -->
        <div class="action-bar">
          <button @click="onBack" class="edit-btn edit-btn-secondary">
            <span class="material-icons">arrow_back</span>
            Retour au journal
          </button>
          
          <div class="save-section">
            <div v-if="hasChanges" class="changes-indicator">
              <span class="material-icons">edit</span>
              <span>Modifications non sauvegardées</span>
            </div>
            
            <button
              @click="onSave"
              :disabled="saving"
              class="edit-btn edit-btn-success edit-btn-lg"
            >
              <span v-if="saving" class="material-icons spinning">hourglass_empty</span>
              <span v-else class="material-icons">save</span>
              {{ saving ? "Sauvegarde..." : "Sauvegarder les missions" }}
            </button>
          </div>
        </div>

        <!-- Error Display -->
        <div v-if="error" class="error-banner">
          <span class="material-icons">error</span>
          <div class="error-content">
            <strong>Erreur</strong>
            <p>{{ error }}</p>
          </div>
          <button @click="error = ''" class="error-close">
            <span class="material-icons">close</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="modal-overlay">
      <div class="modal modern-modal">
        <div class="modal-header danger">
          <span class="material-icons">warning</span>
          <h3>Supprimer la mission</h3>
        </div>

        <div class="modal-body">
          <p>Êtes-vous sûr de vouloir supprimer cette mission ?</p>
          <div class="mission-preview-card">
            <strong>Mission {{ (missionToDelete?.index ?? 0) + 1 }}:</strong>
            <p>"{{ missionToDelete?.mission.description || 'Mission sans description' }}"</p>
          </div>
          <div class="warning-text">
            <span class="material-icons">info</span>
            Cette action est irréversible
          </div>
        </div>

        <div class="modal-footer">
          <button
            @click="cancelDeleteMission"
            class="edit-btn edit-btn-secondary"
          >
            <span class="material-icons">close</span>
            Annuler
          </button>
          <button
            @click="confirmDeleteMission"
            class="edit-btn edit-btn-danger"
          >
            <span class="material-icons">delete_forever</span>
            Supprimer
          </button>
        </div>
      </div>
    </div>

    <!-- Unsaved Changes Modal -->
    <div v-if="showConfirmModal" class="modal-overlay">
      <div class="modal modern-modal">
        <div class="modal-header warning">
          <span class="material-icons">warning</span>
          <h3>Modifications non sauvegardées</h3>
        </div>

        <div class="modal-body">
          <p>Vous avez des modifications non sauvegardées qui seront perdues si vous quittez maintenant.</p>
          <div class="warning-text">
            <span class="material-icons">info</span>
            Voulez-vous vraiment continuer sans sauvegarder ?
          </div>
        </div>

        <div class="modal-footer">
          <button
            @click="cancelLeave"
            class="edit-btn edit-btn-success"
          >
            <span class="material-icons">save</span>
            Rester et sauvegarder
          </button>
          <button
            @click="confirmLeave"
            class="edit-btn edit-btn-danger"
          >
            <span class="material-icons">exit_to_app</span>
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

const completedMissions = computed(() => {
  return missionsList.filter(m => m.description && m.description.trim() !== "").length;
});

const hasChanges = computed(() => {
  return missionsList.some(m => m.description && m.description.trim() !== "" && !m.id);
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
    const suggestion = await journalStore.proposeMissionImprovement(
      m.description
    );

    // Vérifier si l'IA a compris et peut répondre
    if (!suggestion || suggestion.trim() === '') {
      throw new Error("L'IA n'a pas pu générer de suggestion pour cette mission.");
    }

    // Détecter les réponses indiquant une incompréhension
    const incomprehensionKeywords = [
      "je ne comprends pas",
      "je ne peux pas",
      "impossible de",
      "ne suis pas en mesure",
      "trop vague",
      "pas assez d'informations",
      "précisez",
      "clarifiez",
      "je ne sais pas",
      "désolé, mais",
      "sorry",
      "i don't understand",
      "i cannot",
      "unable to"
    ];

    const suggestionLower = suggestion.toLowerCase();
    const hasIncomprehension = incomprehensionKeywords.some(keyword => 
      suggestionLower.includes(keyword)
    );

    if (hasIncomprehension) {
      throw new Error(
        "L'IA n'a pas pu comprendre votre demande. Essayez de décrire la mission de manière plus détaillée et précise."
      );
    }

    // Si tout va bien, afficher la suggestion
    m.proposal = suggestion;
    toast.success("Proposition d'amélioration générée avec succès !");
    
  } catch (e: any) {
    let errorMessage = "Le service IA n'est pas disponible actuellement. Veuillez réessayer plus tard.";
    
    if (e.message) {
      // Messages d'erreur personnalisés selon le contenu
      if (e.message.includes("n'a pas pu comprendre") || 
          e.message.includes("n'a pas pu générer")) {
        errorMessage = e.message;
      } else if (e.message.includes("quota") || e.message.includes("limit")) {
        errorMessage = "Le service IA a atteint sa limite d'utilisation. Veuillez réessayer plus tard ou contacter l'administrateur.";
      } else if (e.message.includes("authentification") || e.message.includes("authentication")) {
        errorMessage = "Problème d'authentification avec le service IA. Contactez l'administrateur.";
      } else if (e.message.includes("trop de requêtes") || e.message.includes("rate limit") || e.message.includes("429")) {
        errorMessage = "Trop de requêtes simultanées. Attendez quelques instants avant de réessayer.";
      } else if (e.message.includes("temporairement indisponible") || e.message.includes("503")) {
        errorMessage = "Le service IA est temporairement indisponible. Réessayez dans quelques minutes.";
      } else if (e.message.includes("Network") || e.message.includes("fetch") || e.message.includes("Failed to fetch")) {
        errorMessage = "Erreur de connexion. Vérifiez votre connexion internet et réessayez.";
      } else if (e.message.includes("500") || e.message.includes("Internal Server")) {
        errorMessage = "Erreur du serveur. Veuillez réessayer dans quelques instants.";
      } else if (e.message.includes("400") || e.message.includes("Bad Request")) {
        errorMessage = "La demande n'est pas valide. Vérifiez le contenu de votre mission et réessayez.";
      } else if (e.message.includes("demande n'est pas valide")) {
        errorMessage = e.message;
      } else if (e.message.includes("service IA")) {
        // Messages du backend déjà traduits
        errorMessage = e.message;
      } else {
        // Message générique pour les autres erreurs
        errorMessage = "Une erreur inattendue s'est produite. Veuillez réessayer plus tard.";
      }
    }
    
    error.value = errorMessage;
    toast.error(errorMessage, { 
      timeout: 8000, // Plus de temps pour lire les messages d'erreur
      closeOnClick: true,
      pauseOnHover: true
    });
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
/* Specific styles for mission cards */
.mission-card {
  background: var(--card-background);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: var(--card-shadow);
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--card-shadow-hover);
  }

  .mission-input-row {
    display: flex;
    gap: 1rem;
    align-items: center;
    margin-bottom: 1.5rem;

    .mission-input {
      flex: 1;
      padding: 0.75rem 1rem;
      border: 2px solid var(--border-color);
      border-radius: var(--border-radius-sm);
      font-size: 1rem;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;

      &:focus {
        outline: none;
        border-color: var(--primary-color);
        box-shadow: 0 0 0 3px rgba(68, 68, 172, 0.1);
      }

      &::placeholder {
        color: var(--text-muted);
      }
    }
  }

  .ai-helper {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    margin-bottom: 1rem;
    padding: 1rem;
    background: var(--background-light);
    border-radius: var(--border-radius-sm);
    border: 1px solid var(--border-color);

    .ai-checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin: 0;
      color: var(--text-secondary);
      font-weight: 500;
      cursor: pointer;

      .ai-checkbox {
        width: 1.25rem;
        height: 1.25rem;
        accent-color: var(--primary-color);
      }

      .material-icons {
        color: var(--primary-color);
        font-size: 1.25rem;
      }
    }

    .ai-generating {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--primary-color);
      font-style: italic;
      font-size: 0.9rem;

      .material-icons {
        font-size: 1rem;
        animation: spin 1s linear infinite;
      }
    }
  }

  .ai-proposal {
    background: linear-gradient(
      135deg,
      rgba(68, 68, 172, 0.1),
      rgba(118, 75, 162, 0.1)
    );
    border: 1px solid rgba(68, 68, 172, 0.2);
    border-radius: var(--border-radius-sm);
    padding: 1.5rem;
    margin-top: 1rem;

    .proposal-content {
      .proposal-header {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 1rem;

        .material-icons {
          font-size: 1.5rem;
          color: var(--primary-color);
        }

        strong {
          color: var(--text-primary);
          font-weight: 600;
        }
      }

      .proposal-text {
        margin: 0 0 1rem 0;
        color: var(--text-secondary);
        line-height: 1.6;
      }
    }
  }
}

.mission-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 2rem;
  gap: 1rem;
}

.action-buttons {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

/* Loading indicator animation */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.spinning {
  animation: spin 1s linear infinite;
}

/* Modal overlay and content */
.modal-overlay {
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

.modal {
  background: white;
  border-radius: var(--border-radius);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  max-width: 28rem;
  width: 90%;
  overflow: hidden;
  animation: slideIn 0.3s ease;

  .modal-header {
    background: linear-gradient(
      135deg,
      rgba(245, 158, 11, 0.1),
      rgba(239, 68, 68, 0.05)
    );
    padding: 1.5rem;
    border-bottom: 1px solid rgba(245, 158, 11, 0.2);

    .modal-title {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--text-primary);
      display: flex;
      align-items: center;
      gap: 0.75rem;

      .material-icons {
        font-size: 1.5rem;
      }
    }
  }

  .modal-content {
    padding: 1.5rem;

    .modal-text {
      margin: 0 0 1rem 0;
      color: var(--text-muted);
      font-size: 1rem;
      line-height: 1.5;
    }

    .modal-warning {
      margin: 0 0 1rem 0;
      padding: 1rem;
      background: linear-gradient(
        135deg,
        rgba(245, 158, 11, 0.1),
        rgba(239, 68, 68, 0.05)
      );
      border: 1px solid rgba(245, 158, 11, 0.3);
      border-radius: var(--border-radius-sm);
      color: var(--text-primary);
      font-size: 0.875rem;
      line-height: 1.4;

      strong {
        color: #dc2626;
        font-weight: 600;
      }
    }

    .modal-question {
      margin: 0;
      color: var(--text-primary);
      font-size: 1rem;
      font-weight: 500;
      text-align: center;
    }

    .mission-preview {
      margin: 1rem 0;
      padding: 1rem;
      background: linear-gradient(
        135deg,
        rgba(59, 130, 246, 0.1),
        rgba(147, 51, 234, 0.05)
      );
      border: 1px solid rgba(59, 130, 246, 0.3);
      border-radius: var(--border-radius-sm);
      color: var(--text-primary);
      font-size: 0.875rem;
      line-height: 1.4;

      strong {
        color: var(--text-primary);
        font-weight: 600;
      }
    }
  }

  .modal-actions {
    padding: 1.5rem;
    border-top: 1px solid var(--border-color);
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    background-color: var(--background-light);
  }
}

/* Animations for modal */
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

/* Responsive design */
@media (max-width: 768px) {
  .mission-card {
    padding: 1rem;

    .mission-input-row {
      flex-direction: column;
      gap: 0.75rem;
    }

    .ai-helper {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.75rem;
    }
  }

  .action-buttons {
    flex-direction: column;
    align-items: stretch;
  }

  .mission-actions {
    justify-content: stretch;

    .edit-btn {
      flex: 1;
    }
  }
}
</style>
