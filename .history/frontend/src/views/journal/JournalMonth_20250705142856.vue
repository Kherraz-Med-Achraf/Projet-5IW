<!-- src/views/journal/JournalMonth.vue -->
<template>
  <main class="profile-container" role="main" lang="fr">
    <div class="profile-content">
      <!-- Loading State -->
      <div v-if="!loaded" class="loading-state">
        <div class="loading-spinner"></div>
        <h3>Chargement du journal</h3>
        <p>Veuillez patienter...</p>
      </div>

      <!-- Main Content -->
      <div v-else class="journal-month-container">
        <!-- Header -->
        <header class="profile-section">
          <div class="journal-header">
            <div class="header-title">
              <h1>
                <span class="material-icons">edit_note</span>
                Journal mensuel
              </h1>
              <div class="status-actions">
                <div class="status-badge" 
                     :class="{
                       'status-submitted': isSubmitted,
                       'status-draft': isDraft && !isSubmitted,
                       'status-new': !isDraft && !isSubmitted
                     }">
                  <span class="material-icons">
                    {{ isSubmitted ? 'check_circle' : isDraft ? 'edit' : 'add_circle' }}
                  </span>
                  <span>{{ isSubmitted ? 'Soumis' : isDraft ? 'Brouillon' : 'Nouveau' }}</span>
                </div>
                
                <button v-if="!isSubmitted && isDraft" @click="submitJournal" :disabled="submitting" class="edit-btn edit-btn-success">
                  <span class="material-icons">{{ submitting ? 'hourglass_empty' : 'send' }}</span>
                  {{ submitting ? 'Soumission...' : 'Soumettre' }}
                </button>
              </div>
            </div>
            
            <div class="child-info">
              <h2>{{ childName }}</h2>
              <p class="period-label">{{ yearLabel }} – {{ monthLabel }}</p>
            </div>
          </div>
        </header>

        <!-- Section Observations -->
        <section class="profile-section">
          <header class="section-header">
            <div class="section-title">
              <div class="section-icon">
                <span class="material-icons">visibility</span>
              </div>
              <div>
                <h2>Observations du mois</h2>
                <p v-if="!isSubmitted">Décrivez les progrès, difficultés et événements marquants observés ce mois-ci</p>
              </div>
            </div>
          </header>

          <div class="observation-content">
            <div v-if="!isSubmitted" class="info-note">
              <span class="material-icons">info</span>
              <span>Décrivez factuellement les observations réalisées ce mois-ci</span>
            </div>
            
            <textarea
              v-model="form.contenu"
              :disabled="isSubmitted"
              rows="6"
              class="observation-textarea"
              placeholder="Exemple: Ce mois-ci, [Prénom] a montré des progrès significatifs en..."
            ></textarea>

            <!-- Assistant IA pour observations -->
            <div v-if="!isSubmitted" class="ai-helper">
              <div class="ai-toggle">
                <label class="ai-switch">
                  <input
                    type="checkbox"
                    v-model="obsPropose"
                    @change="onProposeObservation"
                    :disabled="obsGenerating"
                  />
                  <span class="switch-slider"></span>
                </label>
                <div class="ai-label">
                  <span class="material-icons">psychology</span>
                  <span>Assistant IA</span>
                </div>
              </div>
              <div class="ai-help-text">
                L'IA peut vous proposer des améliorations de vos observations
              </div>

              <div v-if="obsGenerating" class="ai-loading">
                <div class="ai-spinner"></div>
                <span>Génération en cours...</span>
              </div>
            </div>

            <!-- Suggestion IA pour observations -->
            <div v-if="obsProposal && !obsGenerating" class="ai-suggestion">
              <div class="suggestion-header">
                <span class="material-icons">lightbulb</span>
                <h3>Suggestion d'amélioration</h3>
              </div>
              <div class="suggestion-text">{{ obsProposal }}</div>
              
              <div class="suggestion-actions">
                <button @click="acceptObsProposal" class="edit-btn edit-btn-success edit-btn-sm">
                  <span class="material-icons">check</span>
                  Appliquer
                </button>
                <button @click="obsProposal = null; obsPropose = false" class="edit-btn edit-btn-custom edit-btn-sm">
                  <span class="material-icons">close</span>
                  Ignorer
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- Section Missions -->
        <section v-if="missions.length" class="profile-section">
          <header class="section-header">
            <div class="section-title">
              <div class="section-icon">
                <span class="material-icons">assignment</span>
              </div>
              <div>
                <h2>Progression des missions</h2>
                <span class="mission-count">{{ missions.length }} objectif{{ missions.length > 1 ? "s" : "" }}</span>
              </div>
            </div>
          </header>

          <div class="missions-grid">
            <div v-for="mission in missions" :key="mission.id" class="mission-card">
              <div class="mission-content">
                <div class="mission-icon">
                  <span class="material-icons">assignment_ind</span>
                </div>
                <div class="mission-info">
                  <h3>{{ mission.description }}</h3>
                  <textarea
                    v-model="form.progressionMissions[mission.id]"
                    :disabled="isSubmitted"
                    rows="3"
                    class="progress-textarea"
                    :placeholder="`Progression observée pour: ${mission.description}`"
                  ></textarea>

                  <!-- Assistant IA pour chaque mission -->
                  <div v-if="!isSubmitted" class="ai-helper">
                    <div class="ai-toggle">
                      <label class="ai-switch">
                        <input
                          type="checkbox"
                          v-model="mission.aiPropose"
                          @change="onProposeProgress(mission)"
                          :disabled="mission.aiGenerating"
                        />
                        <span class="switch-slider"></span>
                      </label>
                      <div class="ai-label">
                        <span class="material-icons">psychology</span>
                        <span>Assistant IA</span>
                      </div>
                    </div>

                    <div v-if="mission.aiGenerating" class="ai-loading">
                      <div class="ai-spinner"></div>
                      <span>Génération en cours...</span>
                    </div>
                  </div>

                  <!-- Suggestion IA pour mission -->
                  <div v-if="mission.aiProposal && !mission.aiGenerating" class="ai-suggestion">
                    <div class="suggestion-header">
                      <span class="material-icons">lightbulb</span>
                      <h4>Suggestion d'amélioration</h4>
                    </div>
                    <div class="suggestion-text">{{ mission.aiProposal }}</div>
                    
                    <div class="suggestion-actions">
                      <button @click="acceptMissionProposal(mission)" class="edit-btn edit-btn-success edit-btn-sm">
                        <span class="material-icons">check</span>
                        Appliquer
                      </button>
                      <button @click="mission.aiProposal = null; mission.aiPropose = false" class="edit-btn edit-btn-custom edit-btn-sm">
                        <span class="material-icons">close</span>
                        Ignorer
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Section Pièces jointes -->
        <section class="profile-section">
          <header class="section-header">
            <div class="section-title">
              <div class="section-icon">
                <span class="material-icons">attach_file</span>
              </div>
              <div>
                <h2>Pièces jointes</h2>
                <span v-if="attachments.length">{{ attachments.length }} / 3 fichier{{ attachments.length > 1 ? 's' : '' }}</span>
              </div>
            </div>
          </header>

          <div v-if="attachments.length" class="attachments-grid">
            <div v-for="att in attachments" :key="att.id" class="attachment-card">
              <div class="attachment-header">
                <div class="attachment-icon">
                  <span class="material-icons">description</span>
                </div>
                <div class="attachment-info">
                  <h4>{{ att.originalName }}</h4>
                  <span class="attachment-type">{{ att.type }}</span>
                </div>
                <div class="attachment-actions">
                  <a :href="att.url" target="_blank" class="edit-btn edit-btn-sm">
                    <span class="material-icons">visibility</span>
                    Voir
                  </a>
                  <button v-if="!isSubmitted" @click="toggleAttachmentSelection(att.id)" class="edit-btn edit-btn-sm">
                    <span class="material-icons">{{ isAttachmentSelected(att.id) ? 'check_box' : 'check_box_outline_blank' }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="empty-state">
            <div class="empty-icon">
              <span class="material-icons">attach_file</span>
            </div>
            <h4>Aucune pièce jointe</h4>
            <p>Les documents permettent d'enrichir et d'illustrer vos observations</p>
          </div>

          <!-- Actions de suppression -->
          <div v-if="!isSubmitted && toDelete.length > 0" class="bulk-actions">
            <button @click="deleteSelected" :disabled="deleting" class="edit-btn edit-btn-danger">
              <span class="material-icons">{{ deleting ? 'hourglass_empty' : 'delete' }}</span>
              {{ deleting ? 'Suppression...' : `Supprimer ${toDelete.length} fichier${toDelete.length > 1 ? 's' : ''}` }}
            </button>
          </div>

          <!-- Upload section -->
          <div v-if="!isSubmitted && attachments.length < 3" class="upload-section">
            <div class="upload-input-container">
              <input type="file" @change="onFileChange" class="file-input" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" />
              <button :disabled="!selectedFile" @click="onUpload" class="edit-btn edit-btn-success">
                <span class="material-icons">upload</span>
                Ajouter le fichier
              </button>
            </div>
            <p class="upload-info">Maximum 3 pièces jointes (PDF, DOC, images)</p>
          </div>

          <div v-if="attachments.length >= 3 && !isSubmitted" class="upload-limit-warning">
            <span class="material-icons">warning</span>
            Limite de 3 pièces jointes atteinte.
          </div>
        </section>

        <!-- Action Bar -->
        <nav v-if="!isSubmitted" class="action-bar">
          <button @click="goBack" class="edit-btn edit-btn-custom">
            <span class="material-icons">arrow_back</span>
            Retour
          </button>
          
          <div class="save-section">
            <button @click="saveJournal" :disabled="saving" class="edit-btn edit-btn-green">
              <span class="material-icons">{{ saving ? 'hourglass_empty' : 'save' }}</span>
              {{ saving ? 'Sauvegarde...' : 'Sauvegarder' }}
            </button>
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

// Form state
const form = reactive({
  contenu: "",
  progressionMissions: {} as Record<number, string>,
});

// IA flags for observations
const obsPropose = ref(false);
const obsGenerating = ref(false);
const obsProposal = ref<string | null>(null);

// File & data
const selectedFile = ref<File | null>(null);
const existingJournal = ref<any>(null);
const missions = ref<Array<any>>([]);
const attachments = ref<Array<any>>([]);
const toDelete = ref<number[]>([]);

// Flags
const isSubmitted = ref(false);
const isDraft = ref(false);
const submitting = ref(false);
const saving = ref(false);
const deleting = ref(false);

// Helpers
const childName = computed(() => {
  const c = childStore.referentChildren.find((c) => c.id === childId);
  return c ? `${c.firstName} ${c.lastName}` : "";
});

const yearLabel = computed(() => {
  const y = journalStore.academicYears.find((y) => y.id === yearId);
  return y?.label || "";
});

const monthLabel = computed(() => {
  const labels = ["", "Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
  return labels[month] || "";
});

// Load data
onMounted(async () => {
  try {
    await childStore.fetchReferentChildren();
    await journalStore.fetchAcademicYears();
    await journalStore.fetchMissions(childId, yearId);
    missions.value = journalStore.missions.map((m) => ({
      ...m,
      aiPropose: false,
      aiGenerating: false,
      aiProposal: null as string | null,
    }));

    await journalStore.fetchJournals(childId, yearId);
    existingJournal.value = journalStore.journals.find((j) => j.month === month);

    if (existingJournal.value) {
      form.contenu = existingJournal.value.contenu || "";
      form.progressionMissions = { ...(existingJournal.value.progressionMissions || {}) };
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

// IA: propose observation
async function onProposeObservation() {
  if (!obsPropose.value) {
    obsProposal.value = null;
    obsGenerating.value = false;
    return;
  }
  if (!form.contenu.trim()) {
    toast.warning("Veuillez d'abord saisir des observations avant de demander une amélioration.");
    obsPropose.value = false;
    return;
  }
  obsGenerating.value = true;
  obsProposal.value = null;
  try {
    obsProposal.value = await journalStore.proposeMissionImprovement(form.contenu, 'observation');
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

// IA: propose progression for a mission
async function onProposeProgress(m: any) {
  if (!m.aiPropose) {
    m.aiProposal = null;
    m.aiGenerating = false;
    return;
  }
  const current = form.progressionMissions[m.id] || "";
  if (!current.trim()) {
    toast.warning("Veuillez d'abord saisir une progression avant de demander une amélioration.");
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

// Save/submit functions
async function saveJournal() {
  if (saving.value) return;
  
  saving.value = true;
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
  } finally {
    saving.value = false;
  }
}

async function submitJournal() {
  if (submitting.value) return;
  
  submitting.value = true;
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
  } finally {
    submitting.value = false;
  }
}

// Attachment functions
function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  if (input.files?.length) {
    const file = input.files[0];
    
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error(`Le fichier est trop volumineux. Taille maximum autorisée : 10MB`);
      input.value = '';
      selectedFile.value = null;
      return;
    }
    
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      toast.error(`Type de fichier non autorisé. Formats acceptés : PDF, JPEG, PNG`);
      input.value = '';
      selectedFile.value = null;
      return;
    }
    
    selectedFile.value = file;
  }
}

async function onUpload() {
  if (!selectedFile.value) return;
  
  try {
    if (!existingJournal.value) {
      existingJournal.value = await journalStore.createJournal({
        childId,
        academicYearId: yearId,
        month,
        contenu: form.contenu,
        progressionMissions: form.progressionMissions,
      });
      isDraft.value = true;
    }

    const uploaded = await journalStore.uploadAttachment(existingJournal.value.id, selectedFile.value);
    attachments.value.push(uploaded);
    selectedFile.value = null;
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
    
    toast.success("Fichier ajouté avec succès");
  } catch (e: any) {
    toast.error(e.message || "Erreur lors de l'upload");
  }
}

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

async function deleteSelected() {
  if (deleting.value || toDelete.value.length === 0) return;
  
  deleting.value = true;
  try {
    await Promise.all(toDelete.value.map(id => journalStore.deleteAttachment(id)));
    attachments.value = attachments.value.filter(att => !toDelete.value.includes(att.id));
    toDelete.value = [];
    toast.success("Fichiers supprimés avec succès");
  } catch (e: any) {
    toast.error(e.message || "Erreur lors de la suppression");
  } finally {
    deleting.value = false;
  }
}

function goBack() {
  router.back();
}
</script>

<style lang="scss" scoped>
/* === MINIMAL CSS - ONLY ESSENTIALS === */

/* Basic utility classes */
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

/* Container styles - inherit from global CSS */
.profile-container {
  font-family: 'Satoshi', sans-serif;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  padding: 1rem 0;
}

.profile-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

/* Loading */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f4f6;
  border-top: 3px solid #4444ac;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Basic sections */
.profile-section {
  background: white;
  border-radius: 12px;
  margin-bottom: 2rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.section-header {
  background: #4444ac;
  padding: 1.5rem;
  color: white;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.section-icon {
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Journal header */
.journal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 2rem;
  gap: 2rem;
}

.header-title h1 {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 0 0 1rem 0;
  font-size: 2rem;
  font-weight: 800;
}

.status-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  
  &.status-submitted {
    background: #dcfce7;
    color: #166534;
  }
  
  &.status-draft {
    background: #fef3c7;
    color: #92400e;
  }
  
  &.status-new {
    background: #dbeafe;
    color: #1e40af;
  }
}

.child-info {
  background: #4444ac;
  color: white;
  padding: 1.5rem;
  border-radius: 12px;
  text-align: right;
  min-width: 200px;
  
  h2 {
    margin: 0 0 0.5rem 0;
    font-size: 1.5rem;
    font-weight: 700;
    color: white !important;
  }
  
  .period-label {
    margin: 0;
    font-size: 1rem;
    opacity: 0.9;
    font-weight: 500;
    color: white !important;
  }
}

/* Info note */
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
}

/* Forms */
.observation-content,
.missions-grid,
.attachments-grid {
  padding: 2rem;
}

.observation-textarea,
.progress-textarea {
  width: 100%;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-family: inherit;
  resize: vertical;
}

.observation-textarea:focus,
.progress-textarea:focus {
  outline: none;
  border-color: #4444ac;
  box-shadow: 0 0 0 3px rgba(68, 68, 172, 0.1);
}

/* AI Helper */
.ai-helper {
  margin-top: 1rem;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  width: 100%;
  box-sizing: border-box;
}

.ai-toggle {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.ai-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.ai-switch input {
  opacity: 0;
  width: 0;
  height: 0;
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
}

.switch-slider:before {
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

input:checked + .switch-slider {
  background-color: #4444ac;
}

input:checked + .switch-slider:before {
  transform: translateX(20px);
}

.ai-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.ai-help-text {
  font-size: 0.8rem;
  color: #6b7280;
}

.ai-loading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.ai-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #f3f4f6;
  border-top: 2px solid #4444ac;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* AI Suggestions */
.ai-suggestion {
  margin-top: 1rem;
  padding: 1rem;
  background: #fefbf3;
  border: 1px solid #fed7aa;
  border-radius: 8px;
  width: 100%;
  box-sizing: border-box;
}

.suggestion-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.suggestion-header h3,
.suggestion-header h4 {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #92400e;
}

.suggestion-text {
  margin-bottom: 1rem;
  font-size: 0.875rem;
  line-height: 1.5;
  color: #451a03;
}

.suggestion-actions {
  display: flex;
  gap: 0.5rem;
}

/* Missions */
.missions-grid {
  display: grid;
  gap: 1.5rem;
}

.mission-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
}

.mission-content {
  display: flex;
  gap: 1rem;
}

.mission-icon {
  width: 40px;
  height: 40px;
  background: #f3f4f6;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.mission-info {
  flex: 1;
}

.mission-info h3 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  font-weight: 600;
}

.mission-count {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.8);
}

/* Attachments */
.attachments-grid {
  display: grid;
  gap: 1rem;
}

.attachment-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
}

.attachment-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.attachment-icon {
  width: 36px;
  height: 36px;
  background: #f3f4f6;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.attachment-info {
  flex: 1;
}

.attachment-info h4 {
  margin: 0 0 0.25rem 0;
  font-size: 0.9rem;
  font-weight: 600;
}

.attachment-type {
  font-size: 0.8rem;
  color: #6b7280;
}

.attachment-actions {
  display: flex;
  gap: 0.5rem;
}

/* Empty state */
.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: #6b7280;
}

.empty-icon {
  width: 64px;
  height: 64px;
  background: #f3f4f6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem auto;
}

/* Upload */
.upload-section {
  border-top: 1px solid #e5e7eb;
  padding: 1.5rem;
}

.upload-input-container {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-bottom: 0.75rem;
}

.file-input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.upload-info {
  margin: 0;
  font-size: 0.85rem;
  color: #6b7280;
  text-align: center;
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
}

/* Bulk actions */
.bulk-actions {
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
}

/* Action bar */
.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 0;
  margin-top: 2rem;
  border-top: 2px solid #e5e7eb;
}

.save-section {
  display: flex;
  align-items: center;
  gap: 1rem;
}

/* Buttons sizes */
.edit-btn-sm {
  padding: 0.5rem 0.75rem;
  font-size: 0.8rem;
}

/* Responsive */
@media (max-width: 768px) {
  .journal-header {
    flex-direction: column;
  }
  
  .child-info {
    text-align: center;
    min-width: unset;
    width: 100%;
  }
  
  .upload-input-container {
    flex-direction: column;
    align-items: stretch;
  }
  
  .action-bar {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
}
</style> 