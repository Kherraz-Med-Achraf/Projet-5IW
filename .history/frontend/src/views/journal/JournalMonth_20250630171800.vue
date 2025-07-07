<!-- src/views/journal/JournalMonth.vue -->
<template>
  <div class="profile-container">
    <!-- Skip links pour navigation rapide -->
    <a href="#main-content" class="skip-link">Aller au contenu principal</a>
    <a href="#observations-section" class="skip-link">Aller aux observations</a>
    <a href="#missions-section" class="skip-link">Aller aux missions</a>
    <a href="#attachments-section" class="skip-link">Aller aux pièces jointes</a>

    <div id="main-content" class="profile-content">
      <!-- Loading State -->
      <div v-if="!loaded" class="loading-state">
        <div class="loading-spinner"></div>
        <h3>Chargement du journal</h3>
        <p>Veuillez patienter...</p>
      </div>

      <!-- Main Content -->
      <div v-else class="journal-month-container">
        <!-- Header simple avec info enfant -->
        <div class="profile-section">
          <div class="journal-header-simple">
            <div class="header-title">
              <h1>
                <span class="material-icons">edit_note</span>
                Journal mensuel
              </h1>
              <div class="status-actions">
                <div v-if="isSubmitted" class="status-badge status-submitted">
                  <i class="material-icons">check_circle</i>
                  Soumis
                </div>
                <div v-else-if="isDraft" class="status-badge status-draft">
                  <i class="material-icons">edit</i>
                  Brouillon
                </div>
                <div v-else class="status-badge status-new">
                  <i class="material-icons">add_circle</i>
                  Nouveau
                </div>

                <button
                  v-if="isSubmitted"
                  @click="exportReport"
                  class="edit-btn edit-btn-custom"
                  type="button"
                  aria-label="Exporter le rapport en PDF"
                >
                  <i class="material-icons" aria-hidden="true">picture_as_pdf</i>
                  Exporter PDF
                </button>
                
                <button
                  v-if="!isSubmitted && isDraft"
                  @click="submitJournal"
                  :disabled="submitting"
                  class="edit-btn edit-btn-success"
                  type="button"
                  aria-label="Soumettre le journal"
                >
                  <i class="material-icons" aria-hidden="true">
                    {{ submitting ? 'hourglass_empty' : 'send' }}
                  </i>
                  {{ submitting ? 'Soumission...' : 'Soumettre' }}
                </button>
              </div>
            </div>
            
            <div class="child-info">
              <h3>{{ childName }}</h3>
              <p class="period-label">{{ yearLabel }} – {{ monthLabel }}</p>
            </div>
          </div>
        </div>

        <!-- Section Observations -->
        <div class="profile-section observations-section" id="observations-section">
          <div class="section-header-clean">
            <h2>
              <span class="material-icons">visibility</span>
              Observations du mois
            </h2>
            <p class="section-description" v-if="!isSubmitted">
              Décrivez les progrès, difficultés et événements marquants observés ce mois-ci
            </p>
          </div>

          <div class="observation-content">
            <div class="observation-input-container">
              <textarea
                id="contenu"
                v-model="form.contenu"
                :disabled="isSubmitted"
                rows="6"
                class="observation-textarea"
                placeholder="Exemple: Ce mois-ci, [Prénom] a montré des progrès significatifs en..."
              ></textarea>
            </div>

            <!-- IA helper pour observations -->
            <div v-if="!isSubmitted" class="ai-helper-modern">
              <div class="ai-toggle">
                <label class="ai-switch">
                  <input
                    type="checkbox"
                    id="obs-ai"
                    v-model="obsPropose"
                    @change="onProposeObservation"
                    class="switch-input"
                  />
                  <span class="switch-slider"></span>
                </label>
                <div class="ai-label">
                  <span class="material-icons">psychology</span>
                  <span>Assistant IA</span>
                </div>
              </div>

              <div v-if="obsGenerating" class="ai-loading">
                <div class="ai-spinner"></div>
                <span>Génération en cours...</span>
              </div>
            </div>

            <!-- AI Proposal for observations -->
            <div
              v-if="obsProposal && !obsGenerating"
              class="ai-suggestion"
            >
              <div class="suggestion-header">
                <span class="material-icons">lightbulb</span>
                <strong>Suggestion d'amélioration</strong>
              </div>
              <div class="suggestion-text">{{ obsProposal }}</div>
              
              <div class="suggestion-actions">
                <button
                  @click="acceptObsProposal"
                  class="edit-btn edit-btn-success edit-btn-sm"
                >
                  <span class="material-icons">check</span>
                  Appliquer
                </button>
                <button
                  @click="obsProposal = null; obsPropose = false"
                  class="edit-btn edit-btn-custom edit-btn-sm"
                >
                  <span class="material-icons">close</span>
                  Ignorer
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Section Missions -->
        <div v-if="missions.length" class="profile-section missions-section" id="missions-section">
          <div class="section-header-clean">
            <h2>
              <span class="material-icons">flag</span>
              Suivi des missions annuelles
            </h2>
            <p class="section-description">
              Évaluez les progrès réalisés sur chaque mission définie pour l'année
            </p>
            <div class="mission-count-simple">{{ missions.length }} mission{{ missions.length > 1 ? 's' : '' }}</div>
          </div>

          <div class="missions-progress-grid">
            <div
              v-for="m in missions"
              :key="m.id"
              class="mission-progress-card-clean"
            >
              <div class="mission-card-header">
                <div class="mission-number">{{ missions.indexOf(m) + 1 }}</div>
                <div class="mission-card-title">
                  <h3>{{ m.description }}</h3>
                </div>
              </div>

              <div class="mission-card-content">
                <div class="progress-input-container">
                  <textarea
                    :id="'mission-' + m.id"
                    v-model="form.progressionMissions[m.id]"
                    :disabled="isSubmitted"
                    rows="3"
                    placeholder="Exemple: Progrès observés cette semaine, difficultés rencontrées..."
                    class="progress-textarea"
                  ></textarea>
                </div>

                <!-- IA helper pour progression -->
                <div v-if="!isSubmitted" class="ai-helper-modern ai-helper-compact">
                  <div class="ai-toggle">
                    <label class="ai-switch ai-switch-small">
                      <input
                        type="checkbox"
                        :id="`prog-ai-${m.id}`"
                        v-model="m.aiPropose"
                        @change="() => onProposeProgress(m)"
                        class="switch-input"
                      />
                      <span class="switch-slider"></span>
                    </label>
                    <div class="ai-label ai-label-compact">
                      <span class="material-icons">psychology</span>
                      <span>Assistant IA</span>
                    </div>
                  </div>

                  <div v-if="m.aiGenerating" class="ai-loading ai-loading-compact">
                    <div class="ai-spinner ai-spinner-small"></div>
                    <span>Génération...</span>
                  </div>
                </div>

                <!-- AI Proposal for mission progress -->
                <div
                  v-if="m.aiProposal && !m.aiGenerating"
                  class="ai-suggestion ai-suggestion-compact"
                >
                  <div class="suggestion-text">{{ m.aiProposal }}</div>
                  
                  <div class="suggestion-actions">
                    <button
                      @click="acceptMissionProposal(m)"
                      class="edit-btn edit-btn-success edit-btn-xs"
                    >
                      <span class="material-icons">check</span>
                      Utiliser
                    </button>
                    <button
                      @click="m.aiProposal = null; m.aiPropose = false"
                      class="edit-btn edit-btn-custom edit-btn-xs"
                    >
                      <span class="material-icons">close</span>
                      Ignorer
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Section Pièces jointes -->
        <div class="profile-section attachments-section" id="attachments-section">
          <div class="section-header-clean">
            <h2>
              <span class="material-icons">attach_file</span>
              Documents et pièces jointes
            </h2>
            <p class="section-description" v-if="!isSubmitted">
              Ajoutez des photos, documents ou rapports pour compléter vos observations
            </p>
          </div>

          <!-- Liste des pièces jointes -->
          <div v-if="attachments.length === 0" class="empty-state-clean">
            <div class="empty-icon">
              <span class="material-icons">attach_file</span>
            </div>
            <h4>Aucune pièce jointe</h4>
            <p>Les documents permettent d'enrichir et d'illustrer vos observations</p>
          </div>

          <div v-else class="attachments-grid-clean">
            <div
              v-for="att in attachments"
              :key="att.id"
              class="attachment-card-clean"
            >
              <div class="attachment-header-clean">
                <div class="attachment-icon-clean">
                  <span class="material-icons">description</span>
                </div>
                <div class="attachment-info-clean">
                  <h4>{{ att.filepath }}</h4>
                  <span class="attachment-type">Document</span>
                </div>
              </div>

              <div class="attachment-actions-clean">
                <a
                  :href="`http://localhost:3000/uploads/${att.filename}`"
                  target="_blank"
                  class="edit-btn edit-btn-custom edit-btn-sm"
                  aria-label="Voir le document"
                >
                  <span class="material-icons">visibility</span>
                  Voir
                </a>
                <button
                  @click="downloadAttachment(att)"
                  class="edit-btn edit-btn-success edit-btn-sm"
                  type="button"
                  aria-label="Télécharger le document"
                >
                  <span class="material-icons">download</span>
                  Télécharger
                </button>
                <button
                  v-if="!isSubmitted"
                  @click="toggleAttachmentSelection(att.id)"
                  :class="['edit-btn', 'edit-btn-sm', isAttachmentSelected(att.id) ? 'edit-btn-danger' : 'edit-btn-custom']"
                  type="button"
                  :aria-label="isAttachmentSelected(att.id) ? 'Désélectionner' : 'Sélectionner pour suppression'"
                >
                  <span class="material-icons">
                    {{ isAttachmentSelected(att.id) ? 'check_box' : 'check_box_outline_blank' }}
                  </span>
                </button>
              </div>
            </div>
          </div>

          <!-- Actions de suppression -->
          <div v-if="!isSubmitted && toDelete.length > 0" class="bulk-actions">
            <button
              @click="deleteSelected"
              :disabled="deleting"
              class="edit-btn edit-btn-danger"
              type="button"
            >
              <span class="material-icons" aria-hidden="true">
                {{ deleting ? 'hourglass_empty' : 'delete' }}
              </span>
              {{ deleting ? 'Suppression...' : `Supprimer ${toDelete.length} fichier${toDelete.length > 1 ? 's' : ''}` }}
            </button>
          </div>

          <!-- Upload section -->
          <div v-if="!isSubmitted && attachments.length < 3" class="upload-section-clean">
            <div class="upload-input-container">
              <input
                type="file"
                @change="onFileChange"
                class="file-input-clean"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                aria-label="Sélectionner un fichier à joindre"
              />
              <button
                :disabled="!selectedFile"
                @click="onUpload"
                class="edit-btn edit-btn-success"
                type="button"
              >
                <span class="material-icons" aria-hidden="true">upload</span>
                Ajouter le fichier
              </button>
            </div>
            <p class="upload-info">Maximum 3 pièces jointes (PDF, DOC, images)</p>
          </div>

          <div v-if="attachments.length >= 3 && !isSubmitted" class="upload-limit-warning">
            <span class="material-icons">warning</span>
            Limite de 3 pièces jointes atteinte.
          </div>
        </div>

        <!-- Action Bar -->
        <div v-if="!isSubmitted" class="action-bar">
          <button
            @click="goBack"
            class="edit-btn edit-btn-custom"
            type="button"
          >
            <span class="material-icons" aria-hidden="true">arrow_back</span>
            Retour
          </button>
          
          <div class="save-section">
            <button
              @click="saveJournal"
              :disabled="saving"
              class="edit-btn edit-btn-green"
              type="button"
            >
              <span class="material-icons" aria-hidden="true">
                {{ saving ? 'hourglass_empty' : 'save' }}
              </span>
              {{ saving ? 'Sauvegarde...' : 'Sauvegarder' }}
            </button>
          </div>
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
  const labels = [
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
  return labels[month - 1] || "";
});

/* ---------- mounted ----------------------------------------------------- */
onMounted(async () => {
  try {
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
  if (input.files?.length) selectedFile.value = input.files[0];
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
async function downloadAttachment(att: any) {
  const url = `http://localhost:3000/uploads/${att.filename}`;
  try {
    const res = await fetch(url);
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
  let y = 20;

  doc.setFontSize(16);
  doc.text(`Rapport mensuel - ${sanitizePdfText(childName.value)}`, 20, 15);

  doc.setFontSize(12);
  doc.text("Missions de l'année :", 20, y);
  y += 8;
  missions.value.forEach((m) => {
    doc.text(`• ${sanitizePdfText(m.description)}`, 25, y);
    y += 7;
  });

  const hasProg = missions.value.some((m) => {
    const v = form.progressionMissions[m.id];
    return v && v.trim().length;
  });
  if (hasProg) {
    y += 5;
    doc.text("Évolution des missions :", 20, y);
    y += 8;
    missions.value.forEach((m) => {
      const prog = form.progressionMissions[m.id];
      if (prog && prog.trim().length) {
        const line = `• ${sanitizePdfText(m.description)} - ${sanitizePdfText(
          prog.trim()
        )}`;
        const wrapped = doc.splitTextToSize(line, 170);
        doc.text(wrapped, 25, y);
        y += wrapped.length * 7;
      }
    });
  }

  y += 5;
  doc.text(`Mois : ${sanitizePdfText(monthLabel.value)}`, 20, y);
  y += 8;
  doc.text("Observations :", 20, y);
  y += 8;
  const obs = doc.splitTextToSize(sanitizePdfText(form.contenu || ""), 170);
  doc.text(obs, 20, y);

  doc.save(
    `Rapport_${sanitizePdfText(childName.value)}_${sanitizePdfText(
      monthLabel.value
    )}.pdf`
  );
  toast.success("Rapport PDF généré et téléchargé");
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
/* Variables CSS épurées */
:root {
  --primary-color: #667eea;
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

/* Container principal */
.journal-month-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
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

/* Header simple avec info enfant */
.journal-header-simple {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
  }

  .header-title {
    flex: 1;

    h1 {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin: 0 0 1rem 0;
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--text-primary);

      .material-icons {
        font-size: 28px;
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

    @media (max-width: 768px) {
      text-align: left;
    }

    h3 {
      margin: 0 0 0.25rem 0;
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .period-label {
      margin: 0;
      font-size: 1rem;
      color: var(--text-secondary);
      font-weight: 500;
    }
  }
}

/* Status badges simples */
.status-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  border: 1px solid;

  &.status-submitted {
    background: #ecfdf5;
    color: var(--success-color);
    border-color: var(--success-color);
  }

  &.status-draft {
    background: #fef3c7;
    color: var(--warning-color);
    border-color: var(--warning-color);
  }

  &.status-new {
    background: #dbeafe;
    color: var(--info-color);
    border-color: var(--info-color);
  }
}

/* Section headers clean */
.section-header-clean {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid var(--border-color);

  h2 {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin: 0 0 0.5rem 0;
    font-size: 1.375rem;
    font-weight: 700;
    color: var(--text-primary);

    .material-icons {
      font-size: 22px;
      color: var(--primary-color);
    }
  }

  .section-description {
    margin: 0;
    font-size: 0.95rem;
    color: var(--text-secondary);
    line-height: 1.5;
  }

  .mission-count-simple {
    background: var(--primary-color);
    color: white;
    padding: 0.375rem 0.75rem;
    border-radius: 16px;
    font-size: 0.8rem;
    font-weight: 600;
    display: inline-block;
    margin-top: 0.5rem;
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
    color: var(--text-primary);
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
