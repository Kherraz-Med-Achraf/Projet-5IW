<!-- src/views/journal/JournalMissions.vue -->
<template>
  <main class="profile-container" role="main" lang="fr">
    <!-- Skip links for accessibility -->
    <div class="skip-links">
      <a href="#main-content" class="skip-link">Aller au contenu principal</a>
      <a href="#missions-list" class="skip-link">Aller à la liste des missions</a>
      <a href="#actions" class="skip-link">Aller aux actions</a>
    </div>

    <div id="main-content" class="profile-content">
      <!-- Loading State -->
      <div v-if="!loaded" class="loading-state" role="status" aria-live="polite">
        <div class="loading-spinner" aria-hidden="true"></div>
        <h3>Chargement des missions</h3>
        <p>Veuillez patienter...</p>
      </div>

      <!-- Main Content -->
      <div v-else class="missions-container">
        <!-- PageHeader -->
        <PageHeader 
          title="Missions annuelles" 
          :subtitle="`${childName} - ${yearLabel}`"
          icon="assignment"
          :statusText="`${completedMissions} / ${missionsList.length} mission${missionsList.length > 1 ? 's' : ''}`"
          statusIcon="assignment_ind"
          statusClass="status-info"
        />

        <!-- Missions Section -->
        <section v-if="missionsList.length > 0" class="profile-section missions-section" aria-labelledby="missions-title">
          <!-- Section Header -->
          <div class="section-header">
            <h2 id="missions-title">
              <span class="material-icons">edit</span>
              Gestion des missions
            </h2>
          </div>

          <div class="info-note" role="note">
            <span class="material-icons" aria-hidden="true">info</span>
            <span>Ajoutez jusqu'à 10 missions pour cette année scolaire</span>
          </div>

          <!-- Mission Items -->
          <div id="missions-list" class="missions-list" role="list" aria-label="Liste des missions annuelles">
            <article 
              v-for="(mission, index) in missionsList"
              :key="mission.id ?? index"
              class="mission-item-unified"
              role="listitem"
              :aria-labelledby="`mission-${index}-title`"
            >
              <header class="mission-header">
                <div class="mission-number" :aria-label="`Mission ${index + 1}`">{{ index + 1 }}</div>
                <h3 :id="`mission-${index}-title`" class="sr-only">Mission {{ index + 1 }}</h3>
              </header>
              
              <div class="mission-content">
                <!-- Mission Textarea -->
                <div class="mission-input-container">
                  <div class="mission-header-section">
                    <label :for="`mission-textarea-${index}`" class="mission-label">
                      Description de la mission {{ index + 1 }}
                    </label>
                    <button
                      @click="removeMission(index)"
                      class="delete-btn"
                      type="button"
                      :aria-label="`Supprimer la mission ${index + 1}`"
                      :aria-describedby="`delete-${index}-warning`"
                    >
                      <span class="material-icons" aria-hidden="true">delete</span>
                      <span class="sr-only">Supprimer</span>
                    </button>
                    <div :id="`delete-${index}-warning`" class="sr-only">
                      Action irréversible - supprime définitivement la mission
                    </div>
                  </div>
                  <div :id="`mission-${index}-help`" class="info-note" role="note">
                    <span class="material-icons" aria-hidden="true">info</span>
                    <span>Définissez un objectif SMART (Spécifique, Mesurable, Atteignable, Réaliste, Temporellement défini) pour cette mission annuelle</span>
                  </div>
                  <textarea
                    :id="`mission-textarea-${index}`"
                    v-model="mission.description"
                    :placeholder="`Décrivez la mission ${index + 1}...`"
                    class="mission-textarea"
                    rows="4"
                    :aria-describedby="`mission-${index}-help`"
                  ></textarea>
                </div>

                <!-- AI Helper -->
                <div class="ai-helper-modern" role="region" :aria-labelledby="`ai-${index}-title`">
                  <div class="ai-toggle">
                    <h4 :id="`ai-${index}-title`" class="sr-only">Assistant IA pour la mission {{ index + 1 }}</h4>
                    <label class="ai-switch" :for="`cb-ai-${index}`">
                      <input
                        type="checkbox"
                        :id="`cb-ai-${index}`"
                        v-model="mission.propose"
                        @change="onPropose(index)"
                        class="switch-input"
                        :aria-describedby="mission.generating ? `ai-${index}-generating` : `ai-${index}-description`"
                        :disabled="mission.generating"
                      />
                      <span class="switch-slider" aria-hidden="true"></span>
                      <span class="sr-only">Activer l'assistant IA pour améliorer cette mission</span>
                    </label>
                    <div class="ai-label">
                      <span class="material-icons" aria-hidden="true">psychology</span>
                      <span>Assistant IA</span>
                    </div>
                  </div>
                  <div :id="`ai-${index}-description`" class="ai-help-text">
                    L'IA peut vous proposer des améliorations pour rendre cette mission plus précise et mesurable
                  </div>

                  <div v-if="mission.generating" class="ai-loading" role="status" aria-live="polite">
                    <div class="ai-spinner" aria-hidden="true"></div>
                    <span :id="`ai-${index}-generating`">Génération en cours...</span>
                  </div>
                </div>

                <!-- AI Proposal - Now positioned below the toggle -->
                <div
                  v-if="mission.proposal && !mission.generating"
                  class="ai-suggestion"
                  role="region"
                  :aria-labelledby="`ai-suggestion-${index}-title`"
                >
                  <header class="suggestion-header">
                    <span class="material-icons" aria-hidden="true">lightbulb</span>
                    <h4 :id="`ai-suggestion-${index}-title`">Suggestion d'amélioration</h4>
                  </header>
                  <div class="suggestion-text" role="article">{{ mission.proposal }}</div>
                  
                  <div class="suggestion-actions" role="group" :aria-label="`Actions pour la suggestion de la mission ${index + 1}`">
                    <button
                      @click="acceptProposal(index)"
                      class="edit-btn edit-btn-success edit-btn-sm"
                      type="button"
                      :aria-describedby="`accept-${index}-help`"
                    >
                      <span class="material-icons" aria-hidden="true">check</span>
                      Appliquer
                    </button>
                    <div :id="`accept-${index}-help`" class="sr-only">
                      Remplace la description actuelle par la suggestion IA
                    </div>
                    <button
                      @click="mission.proposal = null; mission.propose = false"
                      class="edit-btn edit-btn-custom edit-btn-sm"
                      type="button"
                    >
                      <span class="material-icons" aria-hidden="true">close</span>
                      Ignorer
                      <span class="sr-only">la suggestion</span>
                    </button>
                  </div>
                </div>
              </div>
            </article>

            <!-- Add Mission Button -->
            <div class="add-mission-section">
              <button
                @click="addMission"
                class="edit-btn edit-btn-success"
                type="button"
                :aria-describedby="missionsList.length >= 10 ? 'mission-limit-warning' : undefined"
                :disabled="missionsList.length >= 10"
              >
                <span class="material-icons" aria-hidden="true">add</span>
                Ajouter une mission
              </button>

              <div v-if="missionsList.length >= 10" id="mission-limit-warning" class="help-text warning">
                Limite de 10 missions atteinte
              </div>
            </div>
          </div>
        </section>

        <!-- Empty State -->
        <section v-if="missionsList.length === 0" class="empty-missions" aria-labelledby="empty-title">
          <div class="section-header">
            <h2 id="empty-title">
              <span class="material-icons">assignment_add</span>
              Créer vos premières missions
            </h2>
          </div>
          <div class="empty-content" role="status">
            <div class="empty-icon" aria-hidden="true">
              <span class="material-icons">assignment_add</span>
            </div>
            <h3>Aucune mission définie</h3>
            <p>Commencez par créer votre première mission pour cette année scolaire.</p>
            <p class="empty-help">
              Les missions définissent les objectifs pédagogiques et thérapeutiques spécifiques pour l'enfant.
            </p>
            <button
              @click="addMission"
              class="edit-btn edit-btn-success"
              type="button"
            >
              <span class="material-icons" aria-hidden="true">add</span>
              Créer ma première mission
            </button>
          </div>
        </section>

        <!-- Action Bar -->
        <nav id="actions" class="action-bar" role="navigation" aria-label="Actions principales">
          <button @click="onBack" class="edit-btn edit-btn-custom" type="button">
            <span class="material-icons" aria-hidden="true">arrow_back</span>
            Retour au journal
          </button>
          
          <div class="save-section">
            <div v-if="hasChanges" class="changes-indicator" role="status" aria-live="polite">
              <span class="material-icons" aria-hidden="true">edit</span>
              <span>Modifications non sauvegardées</span>
            </div>
            
            <button
              @click="onSave"
              :disabled="saving"
              class="edit-btn edit-btn-green"
              type="button"
              :aria-describedby="saving ? 'save-loading' : 'save-help'"
            >
              <span v-if="saving" class="material-icons spinning" aria-hidden="true">hourglass_empty</span>
              <span v-else class="material-icons" aria-hidden="true">save</span>
              {{ saving ? "Sauvegarde..." : "Sauvegarder les missions" }}
            </button>
            <div v-if="saving" id="save-loading" class="sr-only">
              Sauvegarde en cours, veuillez patienter
            </div>
            <div v-else id="save-help" class="sr-only">
              Sauvegarde toutes les missions définies pour cette année
            </div>
          </div>
        </nav>

        <!-- Error Display -->
        <div v-if="error" class="error-banner" role="alert" aria-live="assertive">
          <span class="material-icons" aria-hidden="true">error</span>
          <div class="error-content">
            <strong>Erreur</strong>
            <p>{{ error }}</p>
          </div>
          <button @click="error = ''" class="error-close" type="button" aria-label="Fermer le message d'erreur">
            <span class="material-icons" aria-hidden="true">close</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div 
      v-if="showDeleteModal" 
      class="modal-overlay" 
      @click="cancelDeleteMission"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      aria-describedby="delete-modal-description"
    >
      <div class="modal-content" @click.stop>
        <header class="modal-header">
          <h3 id="delete-modal-title">
            <span class="material-icons" aria-hidden="true">warning</span>
            Supprimer la mission
          </h3>
          <button 
            class="close-btn" 
            @click="cancelDeleteMission"
            type="button"
            aria-label="Fermer le modal de confirmation"
          >
            <span class="material-icons" aria-hidden="true">close</span>
          </button>
        </header>
        
        <div class="modal-body" id="delete-modal-description">
          <div class="delete-confirmation">
            <div class="warning-icon" aria-hidden="true">
              <span class="material-icons">warning</span>
            </div>
            <div class="delete-content">
              <p class="delete-message">
                Supprimer définitivement cette mission ?
              </p>
              <div class="mission-preview">
                <strong>Mission {{ (missionToDelete?.index ?? 0) + 1 }} :</strong>
                <p class="mission-text">"{{ missionToDelete?.mission.description || 'Mission sans description' }}"</p>
              </div>
              <p class="delete-warning">
                <span class="material-icons" aria-hidden="true">info</span>
                Action irréversible
              </p>
            </div>
          </div>
        </div>

        <div class="modal-actions" role="group" aria-label="Actions de confirmation">
          <button 
            type="button" 
            class="btn-secondary" 
            @click="cancelDeleteMission"
          >
            <span class="material-icons" aria-hidden="true">close</span>
            Annuler
          </button>
          <button 
            type="button" 
            class="btn-danger" 
            @click="confirmDeleteMission"
          >
            <span class="material-icons" aria-hidden="true">delete_forever</span>
            Supprimer définitivement
          </button>
        </div>
      </div>
    </div>

    <!-- Unsaved Changes Modal -->
    <div 
      v-if="showConfirmModal" 
      class="modal-overlay"
      @click="cancelLeave"
      role="dialog"
      aria-modal="true"
      aria-labelledby="unsaved-modal-title"
      aria-describedby="unsaved-modal-description"
    >
      <div class="modal-content" @click.stop>
        <header class="modal-header">
          <h3 id="unsaved-modal-title">
            <span class="material-icons" aria-hidden="true">warning</span>
            Modifications non sauvegardées
          </h3>
          <button 
            class="close-btn" 
            @click="cancelLeave"
            type="button"
            aria-label="Fermer le modal de confirmation"
          >
            <span class="material-icons" aria-hidden="true">close</span>
          </button>
        </header>

        <div class="modal-body" id="unsaved-modal-description">
          <div class="warning-content">
            <div class="warning-icon" aria-hidden="true">
              <span class="material-icons">edit</span>
            </div>
            <div class="warning-text">
              <p class="warning-message">
                Vous avez des modifications non sauvegardées qui seront perdues si vous quittez maintenant.
              </p>
              <p class="warning-question">
                <span class="material-icons" aria-hidden="true">help_outline</span>
                Voulez-vous vraiment continuer sans sauvegarder ?
              </p>
            </div>
          </div>
        </div>

        <div class="modal-actions" role="group" aria-label="Actions de confirmation">
          <button
            type="button"
            class="btn-primary"
            @click="cancelLeave"
          >
            <span class="material-icons" aria-hidden="true">save</span>
            Rester et sauvegarder
          </button>
          <button
            type="button"
            class="btn-danger"
            @click="confirmLeave"
          >
            <span class="material-icons" aria-hidden="true">exit_to_app</span>
            Quitter sans sauvegarder
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

<script lang="ts" setup>
import { ref, reactive, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useJournalStore } from "@/stores/journalStore";
import { useChildStore } from "@/stores/childStore";
import { useToast } from "vue-toastification";
import { secureApiCall, API_BASE_URL } from "@/utils/api";
import PageHeader from "@/components/PageHeader.vue";

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
      await secureApiCall(`${API_BASE_URL}/mission/${mission.id}`, {
        method: 'DELETE',
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
      m.description,
      'mission'
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

  goBackToJournal();
}

function cancelLeave() {
  showConfirmModal.value = false;
}

function confirmLeave() {
  showConfirmModal.value = false;
  goBackToJournal();
}

function goBackToJournal() {
  // Sauvegarder les sélections dans le localStorage pour que JournalHome les restaure
  localStorage.setItem("journal_selected_child_id", childId.toString());
  localStorage.setItem("journal_selected_year_id", yearId.toString());
  
  // Rediriger vers la page journal principale
  router.push("/journal");
}


</script>

<style scoped lang="scss">
/* Layout principal */
.profile-container {
  font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  color: var(--text-primary);
  line-height: 1.6;
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  padding: 1rem 0;
}

.profile-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.missions-container {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* Sections principales */
.profile-section {
  background: white;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  border: 1px solid var(--border-color);
}

/* Note d'information */
.info-note {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border: 1px solid #bfdbfe;
  border-radius: 0.75rem;
  color: #1e40af;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 1rem;
  
  .material-icons {
    color: #3b82f6;
    font-size: 1.1rem;
    flex-shrink: 0;
  }
}

/* === ACCESSIBILITÉ === */
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
  background: #4444ac;
  color: white;
  padding: 0.5rem 1rem;
  text-decoration: none;
  border-radius: 4px;
  font-weight: 500;
  transition: top 0.2s ease;
}

.skip-link:focus {
  top: 60px;
  outline: 2px solid #2222a5;
  outline-offset: 2px;
}

/* Focus amélioré pour accessibilité */
*:focus {
  outline: 2px solid #2222a5;
  outline-offset: 2px;
  border-radius: 4px;
}

*:focus:not(:focus-visible) {
  outline: none;
}

*:focus-visible {
  outline: 2px solid #2222a5;
  outline-offset: 2px;
}

/* Texte d'aide accessible */
.help-text {
  font-size: 0.875rem;
  color: #374151;
  margin-top: 0.5rem;
  padding: 0.5rem;
  background-color: #f8fafc;
  border-radius: 4px;
  border-left: 3px solid #4444ac;

  &.warning {
    color: #92400e;
    background-color: #fef3c7;
    border-left-color: #92400e;
  }
}

.ai-help-text {
  font-size: 0.875rem;
  color: #374151;
  margin-top: 0.5rem;
}

/* Header amélioré avec stats */
.missions-header {
  background: #4444ac;
  padding: 1.5rem;
  border-radius: 12px;
  margin-bottom: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 2rem;
  flex-wrap: wrap;
  
  h1 {
    margin: 0;
    color: white;
    font-size: 1.75rem;
    font-weight: 700;
    font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  }
  
  .child-info {
    display: flex;
    flex-direction: column;
    
    h2 {
      margin: 0 0 0.25rem 0;
      color: white;
      font-size: 1.5rem;
      font-weight: 600;
      font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    }
    
    .year-label {
      margin: 0;
      color: rgba(255, 255, 255, 0.9);
      font-size: 1rem;
      font-weight: 500;
    }
  }
}

.missions-stats {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-weight: 500;
  min-height: 44px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  
  .completed-count {
    font-size: 1.25rem;
    font-weight: 700;
  }
  
  .total-count {
    font-size: 1rem;
    opacity: 0.9;
  }
  
  .stats-label {
    font-size: 0.875rem;
    opacity: 0.9;
  }
}

/* Empty state amélioré */
.empty-help {
  color: #6b7280;
  font-style: italic;
  margin: 0.5rem 0 1.5rem 0;
}

/* Formulaires accessibles */
.mission-textarea {
  &:disabled {
    background-color: #f9fafb;
    cursor: not-allowed;
    opacity: 0.7;
    color: #6b7280;
  }

  &:hover:not(:disabled) {
    border-color: #4444ac;
  }

  &:focus {
    border-color: #2222a5;
    box-shadow: 0 0 0 3px rgba(68, 68, 172, 0.1);
  }
}

/* Switch IA accessible */
.ai-switch {
  .switch-input:disabled + .switch-slider {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .switch-input:focus + .switch-slider {
    box-shadow: 0 0 0 3px rgba(68, 68, 172, 0.2);
  }
}

/* Boutons accessibles */
.edit-btn,
.btn-primary,
.btn-secondary,
.btn-danger {
  min-height: 44px;
  border: 2px solid transparent;

  &:disabled {
    transform: none !important;
  }

  &:focus {
    box-shadow: 0 0 0 3px rgba(68, 68, 172, 0.2);
  }
}

.btn-danger {
  background: #991b1b;
  border-color: #991b1b;

  &:hover:not(:disabled) {
    background: #7f1d1d;
    border-color: #7f1d1d;
  }
}

.btn-secondary {
  background: #6b7280;
  border-color: #6b7280;

  &:hover:not(:disabled) {
    background: #4b5563;
    border-color: #4b5563;
  }
}

.btn-primary {
  background: #4444ac;
  border-color: #4444ac;

  &:hover:not(:disabled) {
    background: #3333a0;
    border-color: #3333a0;
  }
}

.delete-btn {
  min-height: 44px;
  min-width: 44px;

  &:focus {
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2);
  }
}

/* Messages d'erreur accessibles */
.error-banner {
  background: #fef2f2;
  border: 1px solid #991b1b;
  color: #991b1b;
}

/* Modaux accessibles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  padding: 1.5rem 1.5rem 0 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  
  h3 {
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #991b1b;
    font-size: 1.25rem;
    font-weight: 600;
  }
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
  min-height: 44px;
  min-width: 44px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: #f3f4f6;
  }

  &:focus {
    box-shadow: 0 0 0 3px rgba(68, 68, 172, 0.2);
  }
}

.modal-body {
  padding: 1.5rem;
  text-align: center;
}

.modal-actions {
  padding: 0 1.5rem 1.5rem 1.5rem;
  display: flex;
  gap: 1rem;
  justify-content: center;
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .edit-btn,
  .btn-primary,
  .btn-secondary,
  .btn-danger,
  .mission-textarea {
    border-width: 3px;
  }

  .mission-item-unified {
    border-width: 3px;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .mission-item-unified,
  .edit-btn,
  .btn-primary,
  .btn-secondary,
  .btn-danger {
    transition: none;
  }

  .loading-spinner,
  .ai-spinner {
    animation: none;
    border: 3px solid #4444ac;
  }

  .mission-item-unified:hover {
    transform: none;
  }

  .skip-link {
    transition: none;
  }
}

/* Print styles */
@media print {
  .skip-links,
  .ai-helper-modern,
  .suggestion-actions,
  .action-bar,
  .delete-btn,
  .modal-overlay {
    display: none;
  }

  .mission-item-unified {
    break-inside: avoid;
  }
}

/* Responsive design */
@media (max-width: 768px) {
  .missions-header {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }

  .missions-stats {
    align-self: center;
  }

  .modal-content {
    margin: 1rem;
    max-width: calc(100vw - 2rem);
  }

  .modal-actions {
    flex-direction: column;
  }
}

/* Loading State */
.loading-state {
  text-align: center;
  padding: 4rem 2rem;
  color: var(--text-muted);

  .loading-spinner {
    width: 48px;
    height: 48px;
    border: 4px solid var(--border-color);
    border-top: 4px solid var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 1.5rem auto;
  }

  h3 {
    margin: 0 0 0.5rem 0;
    color: var(--text-primary);
  }

  p {
    margin: 0;
    font-size: 1rem;
  }
}

/* Green Save Button */
.edit-btn-green {
  background: #22c55e;
  color: white;
  
  &:hover:not(:disabled) {
    background: #16a34a;
  }
  
  &:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }
}

/* Missions Section */
.missions-section {
  /* Header styles are now handled by the global .missions-header rule */
}

/* Missions List */
.missions-list {
  padding: 2rem;
  background: white;
  border-radius: 0 0 20px 20px;

  .mission-item-unified {
    background: white;
    border: 2px solid #e2e8f0;
    border-radius: 20px;
    padding: 2rem;
    margin-bottom: 2rem;
    display: flex;
    gap: 1.5rem;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #4444ac 0%, #6366f1 100%);
      transform: scaleX(0);
      transform-origin: left;
      transition: transform 0.3s ease;
    }

    &:hover {
      border-color: #4444ac;
      box-shadow: 0 20px 40px rgba(68, 68, 172, 0.1);
      transform: translateY(-2px);

      &::before {
        transform: scaleX(1);
      }
    }

    .mission-header {
      display: flex;
      align-items: center;
      margin-bottom: 1rem;
    }

    .mission-number {
      width: 50px;
      height: 50px;
      background: linear-gradient(135deg, #4444ac 0%, #6366f1 100%);
      color: white;
      border-radius: 15px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 1.25rem;
      flex-shrink: 0;
      box-shadow: 0 8px 16px rgba(68, 68, 172, 0.3);
    }

    .mission-content {
      flex: 1;
      width: 100%;
      min-width: 0;
      display: flex;
      flex-direction: column;

      .mission-input-container {
        margin-bottom: 1.5rem;
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;

        .mission-header-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;

          .mission-label {
            color: #374151;
            font-weight: 600;
            font-size: 0.95rem;
            margin: 0;
          }

          .delete-btn {
            width: 44px;
            height: 44px;
            background: #fee2e2;
            color: #dc2626;
            border: none;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s ease;
            flex-shrink: 0;

            &:hover {
              background: #fecaca;
              transform: scale(1.05);
            }

            .material-icons {
              font-size: 1.2rem;
            }
          }
        }

        .help-text {
          color: #6b7280;
          font-size: 0.875rem;
          margin: 0;
          padding: 0.5rem 0.75rem;
          background: #f8fafc;
          border-radius: 8px;
          border-left: 3px solid #4444ac;
          font-style: italic;
        }

        .mission-textarea {
          width: 100%;
          padding: 1.25rem 1.5rem;
          border: 2px solid #e2e8f0;
          border-radius: 16px;
          font-size: 1rem;
          line-height: 1.6;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          background: white;
          font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, sans-serif;
          resize: vertical;
          min-height: 140px;
          box-sizing: border-box;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

          &:focus {
            outline: none;
            border-color: #4444ac;
            background: white;
            box-shadow: 0 0 0 4px rgba(68, 68, 172, 0.08), 0 4px 12px rgba(0, 0, 0, 0.1);
            transform: translateY(-1px);
          }

          &:hover:not(:focus) {
            border-color: #cbd5e1;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
          }

          &::placeholder {
            color: #94a3b8;
            font-style: italic;
          }
        }
      }

      .ai-helper-modern {
        order: 3; // Ensure it appears after suggestion

        .ai-toggle {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: #f1f5f9;
          border-radius: 12px;
          border: 1px solid #e2e8f0;

          .ai-switch {
            position: relative;
            display: inline-block;
            width: 44px;
            height: 24px;

            .switch-input {
              opacity: 0;
              width: 0;
              height: 0;

              &:checked + .switch-slider {
                background-color: #4444ac;

                &:before {
                  transform: translateX(20px);
                }
              }
            }

            .switch-slider {
              position: absolute;
              cursor: pointer;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background-color: #ccc;
              transition: .4s;
              border-radius: 24px;

              &:before {
                position: absolute;
                content: "";
                height: 18px;
                width: 18px;
                left: 3px;
                bottom: 3px;
                background-color: white;
                transition: .4s;
                border-radius: 50%;
              }
            }
          }

          .ai-label {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            color: #000000;
            font-weight: 500;

            .material-icons {
              color: #8b5cf6;
              font-size: 1.1rem;
            }
          }
        }

        .ai-loading {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem;
          background: #ede9fe;
          border-radius: 8px;
          color: #6d28d9;
          font-weight: 500;
          margin-top: 0.5rem;

          .ai-spinner {
            width: 16px;
            height: 16px;
            border: 2px solid #c4b5fd;
            border-top: 2px solid #6d28d9;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
        }
      }

      .ai-suggestion {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-left: 4px solid #f59e0b;
        border-radius: 8px;
        padding: 1rem;
        margin-top: 1rem;
        transition: all 0.3s ease;
        width: 100%;
        box-sizing: border-box;

        &:hover {
          background: #f1f5f9;
          border-left-color: #f97316;
        }

        .suggestion-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
          color: #64748b;

          .material-icons {
            color: #f59e0b;
            font-size: 1.1rem;
          }

          strong {
            font-weight: 600;
            font-size: 0.875rem;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 0.025em;
          }
        }

        .suggestion-text {
          color: #334155;
          line-height: 1.6;
          margin-bottom: 1rem;
          font-size: 0.9rem;
          font-style: italic;
          border-left: 2px solid #e2e8f0;
          padding-left: 0.75rem;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        .suggestion-actions {
          display: flex;
          gap: 0.5rem;
          justify-content: flex-end;
          flex-wrap: wrap;
        }
      }
    }
  }

  .add-mission-section {
    text-align: center;
    padding: 2rem 0 0 0;
    border-top: 1px solid var(--border-color);
    margin-top: 1rem;
  }
}

/* Action Bar */
.action-bar {
  background: white;
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 1.5rem;
  margin-top: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);

  .save-section {
    display: flex;
    align-items: center;
    gap: 1rem;

    .changes-indicator {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #f59e0b;
      font-weight: 500;
      font-size: 0.9rem;

      .material-icons {
        font-size: 1.1rem;
      }
    }
  }
}

/* Empty State */
.empty-missions {
  padding: 2rem;
  background: white;
  border: 1px solid var(--border-color);
  border-radius: 16px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);

  .mission-header-info {
    background: #4444ac;
    padding: 1.5rem;
    border-radius: 12px;
    margin-bottom: 2rem;
    text-align: left;

    h1 {
      margin: 0 0 0.5rem 0;
      color: white;
      font-size: 1.75rem;
      font-weight: 700;
      font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    }

    .child-info {
      h2 {
        margin: 0 0 0.25rem 0;
        color: white;
        font-size: 1.5rem;
        font-weight: 600;
        font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      }

      .year-label {
        margin: 0;
        color: rgba(255, 255, 255, 0.9);
        font-size: 1rem;
        font-weight: 500;
      }
    }
  }

  .empty-content {
    text-align: center;

    .empty-icon {
      width: 80px;
      height: 80px;
      background: #4444ac;
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.5rem auto;

     .material-icons {
       font-size: 2.5rem;
       color: white;
     }
   }

   h4 {
     margin: 0 0 1rem 0;
     color: var(--text-primary);
     font-size: 1.3rem;
     font-weight: 600;
   }

   p {
     margin: 0 0 2rem 0;
     color: var(--text-muted);
     font-size: 1.1rem;
     max-width: 400px;
     margin-left: auto;
     margin-right: auto;
   }
  }
}

/* Animations */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.spinning {
  animation: spin 1s linear infinite;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .missions-hero {
    padding: 2rem 1.5rem;
    margin: -2rem -1.5rem 2rem -1.5rem;

    .hero-content .hero-text h1 {
      font-size: 2rem;
    }
  }
}

@media (max-width: 768px) {
  .missions-hero {
    .hero-content {
      flex-direction: column;
      text-align: center;
      gap: 1rem;
    }
  }

  .missions-section .section-header-modern {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;

    .header-left {
      justify-content: center;
    }
  }

  .mission-item {
    flex-direction: column;
    gap: 1rem;

    .mission-content .mission-header {
      flex-direction: column;
      gap: 0.75rem;
    }
  }

  .action-bar {
    flex-direction: column;
    gap: 1.5rem;
    align-items: stretch;

    .save-section {
      flex-direction: column;
      gap: 1rem;
    }
  }

  .modern-modal {
    max-width: 95%;

    .modal-header {
      padding: 1.5rem;
    }

    .modal-body {
      padding: 1.5rem;
    }

    .modal-footer {
      flex-direction: column;
      gap: 0.75rem;
    }
  }
}

/* ============================================================================= */
/*                              MODAL STYLES                                   */
/* ============================================================================= */

.modern-modal {
  background: white;
  border-radius: 20px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
  max-width: 480px;
  width: 90%;
  overflow: hidden;
  animation: slideIn 0.3s ease;

  .modal-header {
    padding: 2rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    border-bottom: 1px solid var(--border-color);

    &.danger {
      background: #fef2f2;
    }

    &.warning {
      background: #fffbeb;
    }

    .material-icons {
      font-size: 2rem;
      color: #f59e0b;
    }

    h3 {
      margin: 0;
      font-size: 1.3rem;
      font-weight: 600;
      color: var(--text-primary);
    }
  }

  .modal-body {
    padding: 2rem;

    p {
      margin: 0 0 1.5rem 0;
      color: var(--text-secondary);
      line-height: 1.6;
    }

    .mission-preview-card {
      background: #f8fafc;
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 1rem;
      margin: 1rem 0;

      strong {
        color: var(--text-primary);
        font-weight: 600;
      }

      p {
        margin: 0.5rem 0 0 0;
        font-style: italic;
      }
    }

    .warning-text {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 8px;
      padding: 0.75rem;
      color: #92400e;
      font-weight: 500;

      .material-icons {
        font-size: 1.2rem;
        color: #f59e0b;
      }
    }
  }

  .modal-footer {
    padding: 1.5rem 2rem;
    border-top: 1px solid var(--border-color);
    background: #f8fafc;
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
  }
}

/* Button size variants */
.edit-btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

.edit-btn-lg {
  padding: 1rem 2rem;
  font-size: 1.1rem;
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
</style>

