<!-- src/views/journal/JournalMonth.vue -->
<template>
  <main class="profile-container journal-page" role="main" lang="fr">
    <!-- Skip links pour navigation rapide -->
    <div class="skip-links">
      <a href="#main-content" class="skip-link">Aller au contenu principal</a>
      <a href="#observations-section" class="skip-link">Aller aux observations</a>
      <a href="#missions-section" class="skip-link">Aller aux missions</a>
      <a href="#attachments-section" class="skip-link">Aller aux pièces jointes</a>
    </div>

    <div id="main-content" class="profile-content">
      <!-- Loading State -->
      <div v-if="!loaded" class="loading-state" role="status" aria-live="polite">
        <div class="loading-spinner" aria-hidden="true"></div>
        <h3>Chargement du journal</h3>
        <p>Veuillez patienter...</p>
      </div>

      <!-- Main Content -->
      <div v-else class="journal-month-container">
        <!-- Header simple avec info enfant amélioré -->
        <header class="profile-section">
          <div class="journal-header-simple">
            <div class="header-title">
              <h1>
                <span class="material-icons" aria-hidden="true">edit_note</span>
                Journal mensuel
              </h1>
              <div class="status-actions" role="group" aria-label="Actions et statut du journal">
                <div class="status-badge" 
                     :class="{
                       'status-submitted': isSubmitted,
                       'status-draft': isDraft && !isSubmitted,
                       'status-new': !isDraft && !isSubmitted
                     }"
                     role="status"
                     :aria-label="isSubmitted ? 'Journal soumis' : isDraft ? 'Brouillon en cours' : 'Nouveau journal'">
                  <span class="material-icons" aria-hidden="true">
                    {{ isSubmitted ? 'check_circle' : isDraft ? 'edit' : 'add_circle' }}
                  </span>
                  <span>{{ isSubmitted ? 'Soumis' : isDraft ? 'Brouillon' : 'Nouveau' }}</span>
                </div>

                <button
                  v-if="isSubmitted"
                  @click="exportReport"
                  class="edit-btn edit-btn-custom"
                  type="button"
                  aria-describedby="export-help"
                >
                  <span class="material-icons" aria-hidden="true">picture_as_pdf</span>
                  Exporter PDF
                  <span class="sr-only">du journal mensuel</span>
                </button>
                <div v-if="isSubmitted" id="export-help" class="sr-only">
                  Télécharge un rapport PDF professionnel du journal mensuel
                </div>
                
                <button
                  v-if="!isSubmitted && isDraft"
                  @click="submitJournal"
                  :disabled="submitting"
                  class="edit-btn edit-btn-success"
                  type="button"
                  :aria-describedby="submitting ? 'submit-loading' : 'submit-help'"
                >
                  <span class="material-icons" aria-hidden="true">
                    {{ submitting ? 'hourglass_empty' : 'send' }}
                  </span>
                  {{ submitting ? 'Soumission...' : 'Soumettre' }}
                  <span class="sr-only">le journal</span>
                </button>
                <div v-if="!isSubmitted && isDraft" id="submit-help" class="sr-only">
                  Soumet définitivement le journal - action irréversible
                </div>
                <div v-if="submitting" id="submit-loading" class="sr-only">
                  Soumission en cours, veuillez patienter
                </div>
              </div>
            </div>
            
            <div class="child-info" role="banner" aria-label="Informations sur l'enfant et la période">
              <h2>{{ childName }}</h2>
              <p class="period-label">{{ yearLabel }} – {{ monthLabel }}</p>
            </div>
          </div>
        </header>

        <!-- Section Observations -->
        <section class="profile-section observations-section" id="observations-section" aria-labelledby="observations-title">
          <header class="section-header-enhanced">
            <div class="section-title-modern">
              <div class="section-icon-wrapper" aria-hidden="true">
                <span class="material-icons">visibility</span>
              </div>
              <div class="section-text">
                <h2 id="observations-title">Observations du mois</h2>
                <p class="section-subtitle" v-if="!isSubmitted">
                  Décrivez les progrès, difficultés et événements marquants observés ce mois-ci
                </p>
              </div>
            </div>
          </header>

          <div class="observation-content">
            <div class="observation-input-container">
              <label for="contenu" class="sr-only">
                Observations du mois de {{ monthLabel }}
              </label>
              <div v-if="!isSubmitted" class="info-note" role="note">
                <span class="material-icons" aria-hidden="true">info</span>
                <span>Décrivez factuellement les observations réalisées ce mois-ci</span>
              </div>
              <textarea
                id="contenu"
                v-model="form.contenu"
                :disabled="isSubmitted"
                rows="6"
                class="observation-textarea"
                placeholder="Exemple: Ce mois-ci, [Prénom] a montré des progrès significatifs en..."
                :aria-describedby="isSubmitted ? 'obs-readonly-help' : undefined"
              ></textarea>
              <div v-if="isSubmitted" id="obs-readonly-help" class="help-text">
                Les observations sont en lecture seule car le journal a été soumis
              </div>
            </div>

            <!-- IA helper pour observations -->
            <div v-if="!isSubmitted" class="ai-helper-modern" role="region" aria-labelledby="ai-obs-title">
              <div class="ai-toggle">
                <h3 id="ai-obs-title" class="sr-only">Assistant IA pour les observations</h3>
                <label class="ai-switch" for="obs-ai">
                  <input
                    type="checkbox"
                    id="obs-ai"
                    v-model="obsPropose"
                    @change="onProposeObservation"
                    class="switch-input"
                    :aria-describedby="obsGenerating ? 'ai-generating' : 'ai-description'"
                    :disabled="obsGenerating"
                  />
                  <span class="switch-slider" aria-hidden="true"></span>
                  <span class="sr-only">Activer l'assistant IA pour améliorer les observations</span>
                </label>
                <div class="ai-label">
                  <span class="material-icons" aria-hidden="true">psychology</span>
                  <span>Assistant IA</span>
                </div>
              </div>
              <div id="ai-description" class="ai-help-text">
                L'IA peut vous proposer des améliorations de vos observations
              </div>

              <div v-if="obsGenerating" class="ai-loading" role="status" aria-live="polite">
                <div class="ai-spinner" aria-hidden="true"></div>
                <span id="ai-generating">Génération en cours...</span>
              </div>
            </div>

            <!-- AI Proposal for observations -->
            <div
              v-if="obsProposal && !obsGenerating"
              class="ai-suggestion"
              role="region"
              aria-labelledby="ai-suggestion-title"
            >
              <header class="suggestion-header">
                <span class="material-icons" aria-hidden="true">lightbulb</span>
                <h3 id="ai-suggestion-title">Suggestion d'amélioration</h3>
              </header>
              <div class="suggestion-text" role="article">{{ obsProposal }}</div>
              
              <div class="suggestion-actions" role="group" aria-label="Actions pour la suggestion IA">
                <button
                  @click="acceptObsProposal"
                  class="edit-btn edit-btn-success edit-btn-sm"
                  type="button"
                  aria-describedby="accept-suggestion-help"
                >
                  <span class="material-icons" aria-hidden="true">check</span>
                  Appliquer
                </button>
                <div id="accept-suggestion-help" class="sr-only">
                  Remplace vos observations actuelles par la suggestion IA
                </div>
                <button
                  @click="obsProposal = null; obsPropose = false"
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
        </section>

        <!-- Section Missions -->
        <section v-if="missions.length" class="profile-section missions-section" id="missions-section" aria-labelledby="missions-title">
          <header class="section-header-enhanced">
            <div class="section-title-modern">
              <div class="section-icon-wrapper" aria-hidden="true">
                <span class="material-icons">flag</span>
              </div>
              <div class="section-text">
                <h2 id="missions-title">Suivi des missions annuelles</h2>
                <p class="section-subtitle">
                  Évaluez les progrès réalisés sur chaque mission définie pour l'année
                </p>
              </div>
            </div>
            <div class="section-badge" role="status" :aria-label="`${missions.length} mission${missions.length > 1 ? 's' : ''} à évaluer`">
              <span class="mission-counter">{{ missions.length }}</span>
              <span class="mission-label">mission{{ missions.length > 1 ? 's' : '' }}</span>
            </div>
          </header>

          <div class="missions-progress-grid" role="list" aria-label="Liste des missions à évaluer">
            <article
              v-for="(m, index) in missions"
              :key="m.id"
              class="mission-progress-card-clean"
              role="listitem"
              :aria-labelledby="`mission-${m.id}-title`"
            >
              <header class="mission-card-header">
                <div class="mission-number" aria-label="`Mission ${index + 1}`">{{ index + 1 }}</div>
                <div class="mission-card-title">
                  <h3 :id="`mission-${m.id}-title`">{{ m.description }}</h3>
                </div>
              </header>

              <div class="mission-card-content">
                <div class="progress-input-container">
                  <label :for="`mission-${m.id}`" class="sr-only">
                    Progression de la mission {{ index + 1 }} : {{ m.description }}
                  </label>
                  <div v-if="!isSubmitted" class="info-note" role="note">
                    <span class="material-icons" aria-hidden="true">info</span>
                    <span>Décrivez les progrès et difficultés observés pour cette mission</span>
                  </div>
                  <textarea
                    :id="`mission-${m.id}`"
                    v-model="form.progressionMissions[m.id]"
                    :disabled="isSubmitted"
                    rows="3"
                    placeholder="Exemple: Progrès observés cette semaine, difficultés rencontrées..."
                    class="progress-textarea"
                    :aria-describedby="isSubmitted ? `mission-${m.id}-readonly` : undefined"
                  ></textarea>
                  <div v-if="isSubmitted" :id="`mission-${m.id}-readonly`" class="help-text">
                    La progression est en lecture seule car le journal a été soumis
                  </div>
                </div>

                <!-- IA helper pour progression -->
                <div v-if="!isSubmitted" class="ai-helper-modern ai-helper-compact" role="region" :aria-labelledby="`ai-mission-${m.id}-title`">
                  <div class="ai-toggle">
                    <h4 :id="`ai-mission-${m.id}-title`" class="sr-only">Assistant IA pour la mission {{ index + 1 }}</h4>
                    <label class="ai-switch ai-switch-small" :for="`prog-ai-${m.id}`">
                      <input
                        type="checkbox"
                        :id="`prog-ai-${m.id}`"
                        v-model="m.aiPropose"
                        @change="() => onProposeProgress(m)"
                        class="switch-input"
                        :aria-describedby="m.aiGenerating ? `ai-mission-${m.id}-generating` : `ai-mission-${m.id}-description`"
                        :disabled="m.aiGenerating"
                      />
                      <span class="switch-slider" aria-hidden="true"></span>
                      <span class="sr-only">Activer l'assistant IA pour cette mission</span>
                    </label>
                    <div class="ai-label ai-label-compact">
                      <span class="material-icons" aria-hidden="true">psychology</span>
                      <span>Assistant IA</span>
                    </div>
                  </div>
                  <div :id="`ai-mission-${m.id}-description`" class="ai-help-text-compact">
                    L'IA peut améliorer la description des progrès
                  </div>

                  <div v-if="m.aiGenerating" class="ai-loading ai-loading-compact" role="status" aria-live="polite">
                    <div class="ai-spinner ai-spinner-small" aria-hidden="true"></div>
                    <span :id="`ai-mission-${m.id}-generating`">Génération...</span>
                  </div>
                </div>

                <!-- AI Proposal for mission progress -->
                <div
                  v-if="m.aiProposal && !m.aiGenerating"
                  class="ai-suggestion ai-suggestion-compact"
                  role="region"
                  :aria-labelledby="`ai-mission-${m.id}-suggestion-title`"
                >
                  <h4 :id="`ai-mission-${m.id}-suggestion-title`" class="sr-only">Suggestion IA pour la mission {{ index + 1 }}</h4>
                  <div class="suggestion-text" role="article">{{ m.aiProposal }}</div>
                  
                  <div class="suggestion-actions" role="group" :aria-label="`Actions pour la suggestion de la mission ${index + 1}`">
                    <button
                      @click="acceptMissionProposal(m)"
                      class="edit-btn edit-btn-success edit-btn-xs"
                      type="button"
                    >
                      <span class="material-icons" aria-hidden="true">check</span>
                      Utiliser
                      <span class="sr-only">cette suggestion</span>
                    </button>
                    <button
                      @click="m.aiProposal = null; m.aiPropose = false"
                      class="edit-btn edit-btn-custom edit-btn-xs"
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
          </div>
        </section>

        <!-- Section Pièces jointes -->
        <section class="profile-section attachments-section" id="attachments-section" aria-labelledby="attachments-title">
          <header class="section-header-enhanced">
            <div class="section-title-modern">
              <div class="section-icon-wrapper" aria-hidden="true">
                <span class="material-icons">attach_file</span>
              </div>
              <div class="section-text">
                <h2 id="attachments-title">Documents et pièces jointes</h2>
                <p class="section-subtitle" v-if="!isSubmitted">
                  Ajoutez des photos, documents ou rapports pour compléter vos observations
                </p>
              </div>
            </div>
            <div v-if="attachments.length > 0" class="section-badge" role="status" :aria-label="`${attachments.length} fichier${attachments.length > 1 ? 's' : ''} joint${attachments.length > 1 ? 's' : ''}`">
              <span class="attachment-counter">{{ attachments.length }}</span>
              <span class="attachment-label">fichier{{ attachments.length > 1 ? 's' : '' }}</span>
            </div>
          </header>

          <!-- Liste des pièces jointes -->
          <div v-if="attachments.length === 0" class="empty-state-clean" role="status">
            <div class="empty-icon" aria-hidden="true">
              <span class="material-icons">attach_file</span>
            </div>
            <h3>Aucune pièce jointe</h3>
            <p>Les documents permettent d'enrichir et d'illustrer vos observations</p>
          </div>

          <div v-else class="attachments-grid-clean" role="list" aria-label="Liste des pièces jointes">
            <article
              v-for="att in attachments"
              :key="att.id"
              class="attachment-card-clean"
              role="listitem"
              :aria-labelledby="`attachment-${att.id}-title`"
            >
              <header class="attachment-header-clean">
                <div class="attachment-icon-clean" aria-hidden="true">
                  <span class="material-icons">description</span>
                </div>
                <div class="attachment-info-clean">
                  <h4 :id="`attachment-${att.id}-title`">{{ att.filepath }}</h4>
                  <span class="attachment-type">Document</span>
                </div>
              </header>

              <div class="attachment-actions-clean" role="group" :aria-label="`Actions pour ${att.filepath}`">
                <button
                  @click="viewAttachment(att)"
                  class="edit-btn edit-btn-custom edit-btn-sm"
                  type="button"
                  :aria-label="`Voir le document ${att.filepath} dans un nouvel onglet`"
                >
                  <span class="material-icons" aria-hidden="true">visibility</span>
                  Voir
                </button>
                <button
                  @click="downloadAttachment(att)"
                  class="edit-btn edit-btn-success edit-btn-sm"
                  type="button"
                  :aria-label="`Télécharger le document ${att.filepath}`"
                >
                  <span class="material-icons" aria-hidden="true">download</span>
                  Télécharger
                </button>
                <button
                  v-if="!isSubmitted"
                  @click="toggleAttachmentSelection(att.id)"
                  :class="['edit-btn', 'edit-btn-sm', isAttachmentSelected(att.id) ? 'edit-btn-danger' : 'edit-btn-custom']"
                  type="button"
                  :aria-label="isAttachmentSelected(att.id) ? `Désélectionner ${att.filepath}` : `Sélectionner ${att.filepath} pour suppression`"
                  :aria-pressed="isAttachmentSelected(att.id)"
                  role="switch"
                >
                  <span class="material-icons" aria-hidden="true">
                    {{ isAttachmentSelected(att.id) ? 'check_box' : 'check_box_outline_blank' }}
                  </span>
                  <span class="sr-only">{{ isAttachmentSelected(att.id) ? 'Sélectionné' : 'Non sélectionné' }}</span>
                </button>
              </div>
            </article>
          </div>

          <!-- Actions de suppression -->
          <div v-if="!isSubmitted && toDelete.length > 0" class="bulk-actions" role="region" aria-label="Actions en lot">
            <button
              @click="deleteSelected"
              :disabled="deleting"
              class="edit-btn edit-btn-danger"
              type="button"
              :aria-describedby="deleting ? 'delete-loading' : 'delete-count'"
            >
              <span class="material-icons" aria-hidden="true">
                {{ deleting ? 'hourglass_empty' : 'delete' }}
              </span>
              {{ deleting ? 'Suppression...' : `Supprimer ${toDelete.length} fichier${toDelete.length > 1 ? 's' : ''}` }}
            </button>
            <div v-if="deleting" id="delete-loading" class="sr-only">
              Suppression en cours, veuillez patienter
            </div>
                         <div v-else id="delete-count" class="sr-only">
               {{ toDelete.length }} fichier{{ toDelete.length > 1 ? 's' : '' }} sélectionné{{ toDelete.length > 1 ? 's' : '' }} pour suppression
             </div>
          </div>

          <!-- Upload section -->
          <div v-if="!isSubmitted && attachments.length < 3" class="upload-section-clean" role="region" aria-labelledby="upload-title">
            <h3 id="upload-title" class="sr-only">Ajouter une pièce jointe</h3>
            <div class="upload-input-container">
              <label for="file-input" class="sr-only">
                Sélectionner un fichier à joindre (PDF, DOC, images)
              </label>
              <input
                id="file-input"
                type="file"
                @change="onFileChange"
                class="file-input-clean"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                :aria-describedby="selectedFile ? 'file-selected' : 'file-help'"
              />
              <div v-if="selectedFile" id="file-selected" class="help-text">
                Fichier sélectionné : {{ selectedFile.name }}
              </div>
              <div v-else id="file-help" class="help-text">
                Formats acceptés : PDF, DOC, DOCX, JPG, PNG
              </div>
              <button
                :disabled="!selectedFile"
                @click="onUpload"
                class="edit-btn edit-btn-success"
                type="button"
                :aria-describedby="selectedFile ? 'upload-ready' : 'upload-disabled'"
              >
                <span class="material-icons" aria-hidden="true">upload</span>
                Ajouter le fichier
              </button>
              <div v-if="selectedFile" id="upload-ready" class="sr-only">
                Prêt à téléverser {{ selectedFile.name }}
              </div>
              <div v-else id="upload-disabled" class="sr-only">
                Sélectionnez d'abord un fichier pour l'ajouter
              </div>
            </div>
            <p class="upload-info">Maximum 3 pièces jointes (PDF, DOC, images)</p>
          </div>

          <div v-if="attachments.length >= 3 && !isSubmitted" class="upload-limit-warning" role="alert">
            <span class="material-icons" aria-hidden="true">warning</span>
            Limite de 3 pièces jointes atteinte.
          </div>
        </section>

        <!-- Action Bar -->
        <nav v-if="!isSubmitted" class="action-bar" role="navigation" aria-label="Actions principales">
          <button
            @click="goBack"
            class="edit-btn edit-btn-custom"
            type="button"
          >
            <span class="material-icons" aria-hidden="true">arrow_back</span>
            Retour
            <span class="sr-only">à la liste des journaux</span>
          </button>
          
          <div class="save-section">
            <button
              @click="saveJournal"
              :disabled="saving"
              class="edit-btn edit-btn-green"
              type="button"
              :aria-describedby="saving ? 'save-loading' : 'save-help'"
            >
              <span class="material-icons" aria-hidden="true">
                {{ saving ? 'hourglass_empty' : 'save' }}
              </span>
              {{ saving ? 'Sauvegarde...' : 'Sauvegarder' }}
              <span class="sr-only">le brouillon</span>
            </button>
            <div v-if="saving" id="save-loading" class="sr-only">
              Sauvegarde en cours, veuillez patienter
            </div>
            <div v-else id="save-help" class="sr-only">
              Sauvegarde le journal en tant que brouillon
            </div>
          </div>
        </nav>
      </div>
    </div>
  </main>
</template>

<script lang="ts" setup>
import { ref, reactive, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useJournalStore } from "@/stores/journalStore";
import { useChildStore } from "@/stores/childStore";
import { useAuthStore } from "@/stores/auth";
import { useToast } from "vue-toastification";
import { jsPDF } from "jspdf";

const journalStore = useJournalStore();
const childStore = useChildStore();
const authStore = useAuthStore();
const toast = useToast();
const route = useRoute();
const router = useRouter();

const childId = Number(route.params.childId);
const yearId = Number(route.params.yearId);
const month = Number(route.params.month);

const loaded = ref(false);

/* ---------- form state -------------------------------------------------- */
const form = reactive({
  contenu: "",
  progressionMissions: {} as Record<number, string>,
});

/* IA flags for observations */
const obsPropose = ref(false);
const obsGenerating = ref(false);
const obsProposal = ref<string | null>(null);

/* file & data */
const selectedFile = ref<File | null>(null);
const existingJournal = ref<any>(null);
const missions = ref<Array<any>>([]);
const attachments = ref<Array<any>>([]);
const toDelete = ref<number[]>([]);

/* ---------- flags ------------------------------------------------------- */
const isSubmitted = ref(false);
const isDraft = ref(false);
const canReopen = computed(() => authStore.user?.role === "ADMIN");
const showSubmitModal = ref(false);

/* ---------- helpers ----------------------------------------------------- */
const childName = computed(() => {
  const c = childStore.referentChildren.find((c) => c.id === childId);
  return c ? `${c.firstName} ${c.lastName}` : "";
});
const yearLabel = computed(() => {
  const y = journalStore.academicYears.find((y) => y.id === yearId);
  return y?.label || "";
});
const monthLabel = computed(() => {
  // Tableau des mois dans l'ordre calendaire pour mapping
  const labels = [
    "", // index 0 inutilisé
    "Janvier",    // mois 1
    "Février",    // mois 2
    "Mars",       // mois 3
    "Avril",      // mois 4
    "Mai",        // mois 5
    "Juin",       // mois 6
    "Juillet",    // mois 7
    "Août",       // mois 8
    "Septembre",  // mois 9
    "Octobre",    // mois 10
    "Novembre",   // mois 11
    "Décembre",   // mois 12
  ];
  return labels[month] || "";
});

/* ---------- mounted ----------------------------------------------------- */
onMounted(async () => {
  try {
    // Charger les enfants référents pour avoir le nom
    await childStore.fetchReferentChildren();
    
    await journalStore.fetchMissions(childId, yearId);
    missions.value = journalStore.missions.map((m) => ({
      ...m,
      aiPropose: false,
      aiGenerating: false,
      aiProposal: null as string | null,
    }));

    await journalStore.fetchJournals(childId, yearId);
    existingJournal.value = journalStore.journals.find(
      (j) => j.month === month
    );

    if (existingJournal.value) {
      form.contenu = existingJournal.value.contenu || "";
      form.progressionMissions = {
        ...(existingJournal.value.progressionMissions || {}),
      };
      attachments.value = existingJournal.value.attachments || [];
      isSubmitted.value = existingJournal.value.isSubmitted;
      isDraft.value = existingJournal.value.isDraft;

      const status = isSubmitted.value ? "soumis" : "en brouillon";
      toast.success(`Journal de ${monthLabel.value} chargé (${status})`);
    } else {
      toast.info(`Nouveau journal pour ${monthLabel.value}`);
    }
  } catch (e: any) {
    toast.error(e.message || "Erreur lors du chargement du journal");
  } finally {
    loaded.value = true;
  }
});

/* ---------- IA: propose observation ------------------------------------- */
async function onProposeObservation() {
  if (!obsPropose.value) {
    obsProposal.value = null;
    obsGenerating.value = false;
    return;
  }
  if (!form.contenu.trim()) {
    alert(
      "Veuillez d'abord saisir des observations avant de demander une amélioration."
    );
    obsPropose.value = false;
    return;
  }
  obsGenerating.value = true;
  obsProposal.value = null;
  try {
    obsProposal.value = await journalStore.proposeMissionImprovement(
      form.contenu,
      'observation'
    );
  } catch (e: any) {
    toast.error(e.message || "Erreur lors de la génération de l'amélioration");
    obsPropose.value = false;
  } finally {
    obsGenerating.value = false;
  }
}
function acceptObsProposal() {
  if (obsProposal.value) {
    form.contenu = obsProposal.value;
    obsPropose.value = false;
    obsProposal.value = null;
  }
}

/* ---------- IA: propose progression for a mission ---------------------- */
async function onProposeProgress(m: any) {
  if (!m.aiPropose) {
    m.aiProposal = null;
    m.aiGenerating = false;
    return;
  }
  const current = form.progressionMissions[m.id] || "";
  if (!current.trim()) {
    alert(
      "Veuillez d'abord saisir une progression avant de demander une amélioration."
    );
    m.aiPropose = false;
    return;
  }
  m.aiGenerating = true;
  m.aiProposal = null;
  try {
    m.aiProposal = await journalStore.proposeMissionImprovement(current, 'progression');
  } catch (e: any) {
    toast.error(e.message || "Erreur lors de la génération de l'amélioration");
    m.aiPropose = false;
  } finally {
    m.aiGenerating = false;
  }
}
function acceptMissionProposal(m: any) {
  if (m.aiProposal) {
    form.progressionMissions[m.id] = m.aiProposal;
    m.aiPropose = false;
    m.aiProposal = null;
  }
}

/* ---------- save / submit / reopen ------------------------------------- */
async function onSave() {
  try {
    if (existingJournal.value) {
      const upd = await journalStore.updateJournal(existingJournal.value.id, {
        contenu: form.contenu,
        progressionMissions: form.progressionMissions,
      });
      existingJournal.value = upd;
      isDraft.value = upd.isDraft;
      toast.success("Journal sauvegardé en brouillon");
    } else {
      const crt = await journalStore.createJournal({
        childId,
        academicYearId: yearId,
        month,
        contenu: form.contenu,
        progressionMissions: form.progressionMissions,
      });
      existingJournal.value = crt;
      isDraft.value = crt.isDraft;
      toast.success("Journal créé et sauvegardé en brouillon");
    }
  } catch (e: any) {
    toast.error(e.message || "Erreur lors de la sauvegarde");
  }
}

async function confirmSubmit() {
  showSubmitModal.value = false;
  try {
    if (!existingJournal.value) {
      existingJournal.value = await journalStore.createJournal({
        childId,
        academicYearId: yearId,
        month,
        contenu: form.contenu,
        progressionMissions: form.progressionMissions,
      });
    }
    const sub = await journalStore.submitJournal(existingJournal.value.id);
    isSubmitted.value = sub.isSubmitted;
    toast.success(`Journal de ${monthLabel.value} soumis avec succès !`);
  } catch (e: any) {
    toast.error(e.message || "Erreur lors de la soumission");
  }
}

async function onReopen() {
  try {
    if (existingJournal.value?.isSubmitted) {
      const rep = await journalStore.reopenJournal(
        existingJournal.value.id,
        "Réouverture demandée"
      );
      existingJournal.value = rep;
      isSubmitted.value = rep.isSubmitted;
      isDraft.value = rep.isDraft;
      toast.success("Journal réouvert pour modification");
    }
  } catch (e: any) {
    toast.error(e.message || "Erreur lors de la réouverture");
  }
}

/* ---------- attachments ------------------------------------------------- */
function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  if (input.files?.length) {
    const file = input.files[0];
    
    // SÉCURITÉ: Validation de la taille du fichier (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB en bytes
    if (file.size > maxSize) {
      toast.error(`Le fichier est trop volumineux. Taille maximum autorisée : 10MB`);
      input.value = ''; // Reset l'input
      selectedFile.value = null;
      return;
    }
    
    // SÉCURITÉ: Validation du type de fichier
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      toast.error(`Type de fichier non autorisé. Formats acceptés : PDF, JPEG, PNG`);
      input.value = ''; // Reset l'input
      selectedFile.value = null;
      return;
    }
    
    selectedFile.value = file;
  }
}
async function onUpload() {
  if (!selectedFile.value) return;
  
  // Double vérification côté frontend avant envoi
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (selectedFile.value.size > maxSize) {
    toast.error(`Fichier trop volumineux (${(selectedFile.value.size / 1024 / 1024).toFixed(1)}MB). Maximum : 10MB`);
    return;
  }
  
  try {
    if (!existingJournal.value) {
      existingJournal.value = await journalStore.createJournal({
        childId,
        academicYearId: yearId,
        month,
        contenu: form.contenu,
        progressionMissions: form.progressionMissions,
      });
      isDraft.value = existingJournal.value.isDraft;
    }
    const att = await journalStore.uploadAttachment(
      existingJournal.value.id,
      selectedFile.value
    );
    attachments.value.push(att);
    selectedFile.value = null;
    toast.success(`Fichier "${att.filepath}" ajouté avec succès`);
  } catch (e: any) {
    toast.error(e.message || "Erreur lors de l'ajout du fichier");
  }
}
async function deleteSelected() {
  if (!toDelete.value.length) return;
  try {
    for (const id of toDelete.value) {
      await journalStore.deleteAttachment(id);
      attachments.value = attachments.value.filter((a) => a.id !== id);
    }
    toast.success(`${toDelete.value.length} fichier(s) supprimé(s)`);
    toDelete.value = [];
  } catch (e: any) {
    toast.error(e.message || "Erreur lors de la suppression");
  }
}

async function viewAttachment(att: any) {
  const url = `http://localhost:3000/journal/file/${att.filename}`;
  try {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(res.statusText);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    
    // Ouvrir dans un nouvel onglet
    window.open(blobUrl, '_blank');
    
    // Nettoyer l'URL après un délai pour permettre l'ouverture
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 1000);
  } catch {
    toast.error("Impossible d'afficher le fichier");
  }
}

async function downloadAttachment(att: any) {
  const url = `http://localhost:3000/journal/file/${att.filename}`;
  try {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(res.statusText);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = att.filepath;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
    toast.success(`Fichier "${att.filepath}" téléchargé`);
  } catch {
    toast.error("Impossible de télécharger le fichier");
  }
}

/* ---------- PDF --------------------------------------------------------- */
function sanitizePdfText(str: string) {
  return str
    .replace(/[’‘]/g, "'")
    .replace(/→|›|»|«/g, "-")
    .replace(/[\u2013\u2014]/g, "-");
}

function exportReport() {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let currentY = margin;

  // Couleurs
  const primaryColor = [68, 68, 172]; // #4444ac
  const secondaryColor = [107, 114, 128]; // #6b7280
  const lightGray = [249, 250, 251]; // #f9fafb
  const darkGray = [31, 41, 55]; // #1f2937

  // === HEADER AVEC LOGO ET TITRE ===
  // Rectangle de header avec couleur primaire
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 50, 'F');

  // Titre principal en blanc
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('JOURNAL MENSUEL', margin, 25);
  
  // Sous-titre
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('Institut Médico-Éducatif', margin, 35);

  // Date de génération en haut à droite
  const today = new Date().toLocaleDateString('fr-FR');
  doc.setFontSize(10);
  const dateText = `Généré le ${today}`;
  const dateWidth = doc.getTextWidth(dateText);
  doc.text(dateText, pageWidth - margin - dateWidth, 15);

  currentY = 70;

  // === INFORMATIONS DE L'ENFANT ===
  // Boîte d'information avec fond gris
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.rect(margin, currentY, contentWidth, 35, 'F');
  doc.setDrawColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.rect(margin, currentY, contentWidth, 35, 'S');

  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMATIONS', margin + 10, currentY + 15);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Enfant : ${sanitizePdfText(childName.value)}`, margin + 10, currentY + 25);
  doc.text(`Période : ${sanitizePdfText(yearLabel.value)} - ${sanitizePdfText(monthLabel.value)}`, margin + 10, currentY + 32);

  currentY += 55;

  // === OBSERVATIONS DU MOIS ===
  if (form.contenu && form.contenu.trim()) {
    // Titre de section avec ligne colorée
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(3);
    doc.line(margin, currentY, margin + 30, currentY);
    
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('OBSERVATIONS DU MOIS', margin + 35, currentY + 2);
    
    currentY += 15;

    // Contenu des observations avec encadré
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    const observationText = sanitizePdfText(form.contenu);
    const wrappedObservations = doc.splitTextToSize(observationText, contentWidth - 20);
    
    // Hauteur nécessaire pour le texte
    const textHeight = wrappedObservations.length * 6 + 20;
    
    // Fond gris clair pour les observations
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, currentY, contentWidth, textHeight, 'F');
    doc.setDrawColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setLineWidth(0.5);
    doc.rect(margin, currentY, contentWidth, textHeight, 'S');
    
    // Texte des observations
    doc.text(wrappedObservations, margin + 10, currentY + 12);
    
    currentY += textHeight + 20;
  }

  // === MISSIONS ET PROGRESSIONS ===
  if (missions.value.length > 0) {
    // Vérifier s'il y a de la place pour la section missions
    const estimatedHeight = missions.value.length * 30 + 40;
    if (currentY + estimatedHeight > pageHeight - margin) {
      doc.addPage();
      currentY = margin;
    }

    // Titre de section avec ligne colorée
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(3);
    doc.line(margin, currentY, margin + 30, currentY);
    
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('SUIVI DES MISSIONS ANNUELLES', margin + 35, currentY + 2);
    
    currentY += 20;

    missions.value.forEach((mission, index) => {
      // Vérifier s'il faut une nouvelle page
      if (currentY + 40 > pageHeight - margin) {
        doc.addPage();
        currentY = margin;
      }

      // Numéro de mission dans un cercle
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.circle(margin + 8, currentY + 8, 6, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text((index + 1).toString(), margin + 6, currentY + 10);

      // Description de la mission
      doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      const missionDesc = sanitizePdfText(mission.description);
      const wrappedMission = doc.splitTextToSize(missionDesc, contentWidth - 40);
      doc.text(wrappedMission, margin + 20, currentY + 10);
      
      currentY += wrappedMission.length * 6 + 5;

      // Progression si elle existe
      const progression = form.progressionMissions[mission.id];
      if (progression && progression.trim()) {
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Progression observée :', margin + 20, currentY + 5);
        
        currentY += 8;
        
        doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
        doc.setFontSize(10);
        const progressionText = sanitizePdfText(progression);
        const wrappedProgression = doc.splitTextToSize(progressionText, contentWidth - 40);
        doc.text(wrappedProgression, margin + 20, currentY + 3);
        
        currentY += wrappedProgression.length * 5 + 10;
      } else {
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.text('Aucune progression renseignée', margin + 20, currentY + 5);
        currentY += 15;
      }

      // Ligne de séparation
      if (index < missions.value.length - 1) {
        doc.setDrawColor(lightGray[0], lightGray[1], lightGray[2]);
        doc.setLineWidth(0.5);
        doc.line(margin + 20, currentY, pageWidth - margin, currentY);
        currentY += 10;
      }
    });
  }

  // === FOOTER ===
  // Ajouter une ligne en bas de page
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(1);
  doc.line(margin, pageHeight - 25, pageWidth - margin, pageHeight - 25);

  // Texte du footer
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Document généré automatiquement par le système de gestion IME', margin, pageHeight - 15);
  
  // Numéro de page
  const totalPages = doc.getNumberOfPages();
  doc.text(`Page 1 sur ${totalPages}`, pageWidth - margin - 30, pageHeight - 15);

  // === SAUVEGARDE ===
  const fileName = `Journal_${sanitizePdfText(childName.value)}_${sanitizePdfText(monthLabel.value)}_${sanitizePdfText(yearLabel.value)}.pdf`;
  doc.save(fileName);
  
  toast.success("Rapport PDF professionnel généré et téléchargé !");
}

function onBack() {
  router.back();
}

// État pour le nouveau design
const submitting = ref(false);
const saving = ref(false);
const deleting = ref(false);

// Méthodes pour les nouvelles fonctionnalités

function toggleAttachmentSelection(attachmentId: number) {
  const index = toDelete.value.indexOf(attachmentId);
  if (index > -1) {
    toDelete.value.splice(index, 1);
  } else {
    toDelete.value.push(attachmentId);
  }
}

function isAttachmentSelected(attachmentId: number): boolean {
  return toDelete.value.includes(attachmentId);
}

async function saveJournal() {
  if (saving.value) return;
  
  saving.value = true;
  try {
    await onSave();
  } catch (error) {
    console.error('Erreur de sauvegarde:', error);
  } finally {
    saving.value = false;
  }
}

async function submitJournal() {
  if (submitting.value) return;
  
  submitting.value = true;
  try {
    await confirmSubmit();
  } catch (error) {
    console.error('Erreur de soumission:', error);
  } finally {
    submitting.value = false;
  }
}

function goBack() {
  onBack();
}
</script>

<style lang="scss" scoped>
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
  border-left: 3px solid var(--primary-color);
}

.ai-help-text {
  font-size: 0.875rem;
  color: #374151;
  margin-top: 0.5rem;
}

.ai-help-text-compact {
  font-size: 0.8rem;
  color: #374151;
  margin-top: 0.25rem;
}

/* Status badges avec contrastes améliorés WCAG AA */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.875rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  border: 1px solid;
  min-height: 44px;
  white-space: nowrap;
  
  .material-icons {
    font-size: 1rem;
  }

  &.status-submitted {
    background: #dcfce7; /* Fond vert très clair */
    color: #166534; /* Texte vert foncé - ratio 7.2:1 */
    border-color: #166534;
  }

  &.status-draft {
    background: #fef3c7; /* Fond jaune très clair */
    color: #92400e; /* Texte orange foncé - ratio 6.1:1 */
    border-color: #92400e;
  }

  &.status-new {
    background: #dbeafe; /* Fond bleu très clair */
    color: #1e40af; /* Texte bleu foncé - ratio 5.8:1 */
    border-color: #1e40af;
  }
}

/* Formulaires accessibles */
.observation-textarea,
.progress-textarea {
  &:disabled {
    background-color: #f9fafb;
    cursor: not-allowed;
    opacity: 0.7;
    color: #6b7280;
  }

  &:hover:not(:disabled) {
    border-color: var(--primary-color);
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

/* Upload accessible */
.file-input-clean {
  &:hover {
    border-color: var(--primary-color);
  }

  &:focus {
    border-color: #2222a5;
    box-shadow: 0 0 0 3px rgba(68, 68, 172, 0.1);
  }
}

/* Boutons accessibles */
.edit-btn {
  min-height: 44px; /* Minimum touch target */
  border: 2px solid transparent;

  &:disabled {
    transform: none !important;
  }

  &:focus {
    box-shadow: 0 0 0 3px rgba(68, 68, 172, 0.2);
  }

  &.edit-btn-success {
    background: #166534; /* Couleur plus foncée pour contraste */
    border-color: #166534;

    &:hover:not(:disabled) {
      background: #065f46;
      border-color: #065f46;
    }
  }

  &.edit-btn-danger {
    background: #991b1b; /* Couleur plus foncée pour contraste */
    border-color: #991b1b;

    &:hover:not(:disabled) {
      background: #7f1d1d;
      border-color: #7f1d1d;
    }
  }
}

/* Messages d'alerte accessibles */
.upload-limit-warning {
  background: #fef3c7; /* Fond jaune très clair */
  color: #92400e; /* Texte orange foncé - ratio 6.1:1 */
  border-color: #92400e;
}

.bulk-actions {
  background: #fef2f2; /* Fond rouge très clair */
  border-color: #991b1b; /* Bordure rouge foncée */
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .edit-btn,
  .observation-textarea,
  .progress-textarea,
  .file-input-clean {
    border-width: 3px;
  }

  .status-badge {
    border-width: 2px;
    font-weight: 600;
  }

  .mission-progress-card-clean,
  .attachment-card-clean {
    border-width: 3px;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .mission-progress-card-clean,
  .attachment-card-clean,
  .edit-btn {
    transition: none;
  }

  .loading-spinner,
  .ai-spinner {
    animation: none;
    border: 3px solid var(--primary-color);
  }

  .mission-progress-card-clean:hover,
  .attachment-card-clean:hover,
  .edit-btn:hover {
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
  .upload-section-clean,
  .bulk-actions,
  .action-bar {
    display: none;
  }

  .mission-progress-card-clean,
  .attachment-card-clean {
    break-inside: avoid;
  }
}

/* Variables CSS épurées */
:root {
  --primary-color: #4444ac;
  --success-color: #10b981;
  --warning-color: #f59e0b;
  --danger-color: #ef4444;
  --info-color: #3b82f6;
  --text-primary: #1f2937;
  --text-secondary: #6b7280;
  --border-color: #e5e7eb;
  --background-light: #f9fafb;
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

/* Reset pour éviter les problèmes de scroll */
html, body {
  margin: 0;
  padding: 0;
  overflow-x: hidden;
}

/* Info note styles */
.info-note {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  color: #1e40af;
  font-size: 0.875rem;
  font-weight: 500;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  .material-icons {
    font-size: 1rem;
    color: #3b82f6;
  }
}

/* Override global profile-container styles for journal pages */
.profile-container.journal-page {
  min-height: auto !important; /* Override the global min-height: 100vh */
  font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  color: var(--text-primary);
  line-height: 1.6;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  padding: 1rem 0;
  overflow-x: hidden;
  height: auto;
  overflow-y: visible;
}

/* Profile content inherits from global styles but ensures no scroll issues */
.journal-page .profile-content {
  background: transparent;
  /* Ensure content flows naturally */
  overflow: visible;
  height: auto;
}

.journal-month-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
  padding-bottom: 2rem;
  /* Content determines height naturally */
  height: auto;
  overflow: visible;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  text-align: center;
  color: var(--text-secondary);

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #f3f4f6;
    border-top: 3px solid var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }

  h3 {
    margin: 0 0 0.5rem 0;
    color: var(--text-primary);
    font-size: 1.25rem;
    font-weight: 600;
  }

  p {
    margin: 0;
    font-size: 0.95rem;
  }
}

/* Header simple avec info enfant amélioré */
.journal-header-simple {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  padding: 2rem;
  background: white;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1.5rem;
    padding: 1.5rem;
  }

  .header-title {
    flex: 1;

    h1 {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin: 0 0 1.5rem 0;
      font-size: 2rem;
      font-weight: 800;
      color: var(--text-primary);

      @media (max-width: 768px) {
        font-size: 1.75rem;
      }

      .material-icons {
        font-size: 32px;
        color: var(--primary-color);
      }
    }

    .status-actions {
      display: flex;
      gap: 1rem;
      align-items: center;
      flex-wrap: wrap;
    }
  }

  .child-info {
    text-align: right;
    flex-shrink: 0;
    background: var(--primary-color);
    color: white;
    padding: 1.5rem;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(68, 68, 172, 0.3);
    min-width: 200px;

    @media (max-width: 768px) {
      text-align: center;
      min-width: unset;
      width: 100%;
    }

    h3 {
      margin: 0 0 0.5rem 0;
      font-size: 1.5rem;
      font-weight: 700;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .period-label {
      margin: 0;
      font-size: 1rem;
      opacity: 0.9;
      font-weight: 500;
    }
  }
}

/* Section headers modernes et élégants */
.section-header-enhanced {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: #4444ac;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
}

.section-title-modern {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  flex: 1;
}

.section-icon-wrapper {
  width: 48px;
  height: 48px;
  background: var(--primary-color);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(68, 68, 172, 0.25);

  .material-icons {
    font-size: 24px;
    color: white;
  }
}

.section-text {
  flex: 1;
  min-width: 0;

  h2 {
    margin: 0 0 0.5rem 0;
    font-size: 1.5rem;
    font-weight: 700;
    color: white;
    line-height: 1.3;
    font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  }

  .section-subtitle {
    margin: 0;
    font-size: 0.95rem;
    color: rgba(255, 255, 255, 0.9);
    line-height: 1.5;
    font-weight: 400;
  }
}

.section-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  padding: 0.75rem 1rem;
  border-radius: 20px;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;

  @media (max-width: 768px) {
    align-self: flex-start;
  }

  .mission-counter,
  .attachment-counter {
    font-size: 1.125rem;
    font-weight: 700;
  }

  .mission-label,
  .attachment-label {
    font-size: 0.875rem;
    opacity: 0.9;
  }
}

/* Observations Section */
.observations-section {
  margin-bottom: 2rem;

  .observation-content {
    background: white;
    border-radius: 8px;
    padding: 1.5rem;
    border: 1px solid var(--border-color);
  }

  .observation-input-container {
    margin-bottom: 1rem;
  }

  .observation-textarea {
    width: 100%;
    padding: 1rem;
    border: 2px solid var(--border-color);
    border-radius: 6px;
    font-size: 1rem;
    line-height: 1.6;
    resize: vertical;
    transition: border-color 0.3s ease;
    font-family: inherit;

    &:focus {
      outline: none;
      border-color: var(--primary-color);
    }

    &:disabled {
      background: #f9fafb;
      color: var(--text-secondary);
      cursor: not-allowed;
    }
  }
}

/* Missions Section */
.missions-section {
  margin-bottom: 2rem;

  .missions-progress-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 1.5rem;
  }

  .mission-progress-card-clean {
    background: white;
    border-radius: 8px;
    padding: 1.5rem;
    border: 1px solid var(--border-color);
    transition: box-shadow 0.3s ease;

    &:hover {
      box-shadow: var(--shadow-md);
    }
  }

  .mission-card-header {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .mission-number {
    width: 32px;
    height: 32px;
    background: var(--primary-color);
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.875rem;
    flex-shrink: 0;
  }

  .mission-card-title h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
    line-height: 1.4;
  }

  .progress-input-container {
    margin-bottom: 1rem;
  }

  .progress-textarea {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid var(--border-color);
    border-radius: 6px;
    font-size: 0.95rem;
    line-height: 1.5;
    resize: vertical;
    transition: border-color 0.3s ease;
    font-family: inherit;

    &:focus {
      outline: none;
      border-color: var(--primary-color);
    }

    &:disabled {
      background: #f9fafb;
      color: var(--text-secondary);
      cursor: not-allowed;
    }
  }
}

/* Assistant IA moderne */
.ai-helper-modern {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1rem;

  &.ai-helper-compact {
    padding: 0.75rem;
  }

  .ai-toggle {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .ai-switch {
    position: relative;
    display: inline-block;
    width: 44px;
    height: 22px;

    &.ai-switch-small {
      width: 36px;
      height: 18px;
    }

    .switch-input {
      opacity: 0;
      width: 0;
      height: 0;

      &:checked + .switch-slider {
        background-color: var(--primary-color);

        &:before {
          transform: translateX(22px);
        }
      }

      &:checked + .ai-switch-small .switch-slider:before {
        transform: translateX(18px);
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
      transition: 0.3s;
      border-radius: 22px;

      &:before {
        position: absolute;
        content: "";
        height: 16px;
        width: 16px;
        left: 3px;
        bottom: 3px;
        background-color: white;
        transition: 0.3s;
        border-radius: 50%;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
      }
    }

    &.ai-switch-small .switch-slider {
      &:before {
        height: 12px;
        width: 12px;
      }
    }
  }

  .ai-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 500;
    color: #000000;
    cursor: pointer;

    &.ai-label-compact {
      font-size: 0.875rem;
    }

    .material-icons {
      color: var(--primary-color);
      font-size: 18px;
    }
  }

  .ai-loading {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.75rem;
    color: var(--text-secondary);
    font-size: 0.875rem;

    &.ai-loading-compact {
      margin-top: 0.5rem;
      font-size: 0.8rem;
    }

    .ai-spinner {
      width: 14px;
      height: 14px;
      border: 2px solid #f3f4f6;
      border-top: 2px solid var(--primary-color);
      border-radius: 50%;
      animation: spin 1s linear infinite;

      &.ai-spinner-small {
        width: 12px;
        height: 12px;
      }
    }
  }
}

/* Suggestions IA */
.ai-suggestion {
  background: white;
  border: 1px solid var(--primary-color);
  border-left: 4px solid var(--primary-color);
  border-radius: 6px;
  padding: 1rem;
  margin-top: 1rem;

  &.ai-suggestion-compact {
    padding: 0.75rem;
    margin-top: 0.75rem;
  }

  .suggestion-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
    color: var(--primary-color);
    font-weight: 600;

    .material-icons {
      font-size: 16px;
    }
  }

  .suggestion-text {
    margin-bottom: 1rem;
    line-height: 1.6;
    color: var(--text-primary);
  }

  .suggestion-actions {
    display: flex;
    gap: 0.5rem;
  }
}

/* Attachments Section */
.attachments-section {
  margin-bottom: 2rem;

  .attachments-grid-clean {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1rem;
  }

  .attachment-card-clean {
    background: white;
    border-radius: 8px;
    padding: 1rem;
    border: 1px solid var(--border-color);
    transition: box-shadow 0.3s ease;

    &:hover {
      box-shadow: var(--shadow-sm);
    }
  }

  .attachment-header-clean {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .attachment-icon-clean {
    width: 36px;
    height: 36px;
    background: var(--background-light);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;

    .material-icons {
      color: var(--text-secondary);
      font-size: 18px;
    }
  }

  .attachment-info-clean {
    flex: 1;
    min-width: 0;

    h4 {
      margin: 0 0 0.25rem 0;
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text-primary);
      word-break: break-word;
    }

    .attachment-type {
      font-size: 0.8rem;
      color: var(--text-secondary);
    }
  }

  .attachment-actions-clean {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
}

/* Empty states */
.empty-state-clean {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--text-secondary);

  .empty-icon {
    width: 64px;
    height: 64px;
    background: var(--background-light);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 1rem auto;

    .material-icons {
      font-size: 28px;
      color: var(--text-secondary);
    }
  }

  h4 {
    margin: 0 0 0.5rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  p {
    margin: 0;
    font-size: 0.9rem;
  }
}

/* Upload section */
.upload-section-clean {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  border: 2px dashed var(--border-color);
  margin-top: 1rem;

  .upload-input-container {
    display: flex;
    gap: 1rem;
    align-items: center;
    margin-bottom: 0.75rem;

    @media (max-width: 768px) {
      flex-direction: column;
      align-items: stretch;
    }
  }

  .file-input-clean {
    flex: 1;
    padding: 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    font-size: 0.9rem;
    background: white;

    &:focus {
      outline: none;
      border-color: var(--primary-color);
    }
  }

  .upload-info {
    margin: 0;
    font-size: 0.85rem;
    color: var(--text-secondary);
    text-align: center;
  }
}

.upload-limit-warning {
  background: #fef3c7;
  color: #92400e;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
  font-size: 0.875rem;
}

/* Bulk actions */
.bulk-actions {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

/* Action bar */
.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 0;
  margin-top: 2rem;
  border-top: 2px solid var(--border-color);

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .save-section {
    display: flex;
    align-items: center;
    gap: 1rem;

    @media (max-width: 768px) {
      justify-content: center;
    }
  }
}

/* Animations */
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.spinning {
  animation: spin 1s linear infinite;
}

/* Responsive design */
@media (max-width: 768px) {
  .journal-month-container {
    padding: 0 0.5rem;
  }

  .missions-progress-grid {
    grid-template-columns: 1fr;
  }

  .attachments-grid-clean {
    grid-template-columns: 1fr;
  }

  .attachment-actions-clean {
    justify-content: center;
  }
}
</style>
