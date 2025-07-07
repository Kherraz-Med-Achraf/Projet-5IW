<!-- src/views/journal/JournalMonth.vue -->
<template>
  <main class="profile-container" role="main" lang="fr">
    <!-- Skip links pour navigation rapide -->
    <div class="skip-links">
      <a href="#main-content" class="skip-link">Aller au contenu principal</a>
      <a href="#observations-section" class="skip-link">Aller aux observations</a>
      <a href="#missions-section" class="skip-link">Aller aux missions</a>
      <a href="#attachments-section" class="skip-link">Aller aux pièces jointes</a>
    </div>

    <!-- Content -->
    <div class="profile-content" id="main-content">
      <div class="content-grid">
        <!-- En-tête avec informations du journal -->
        <div class="profile-section">
          <div class="section-header">
            <h1>
              <i class="material-icons" aria-hidden="true">edit_note</i>
              Journal de {{ childName }} – {{ yearLabel }} – {{ monthLabel }}
            </h1>
            <div class="status-indicator">
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
            </div>
          </div>

          <!-- Actions principales -->
          <div v-if="loaded" class="section-actions">
            <button
              v-if="isSubmitted"
              @click="exportReport"
              class="edit-btn"
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

          <!-- Loader -->
          <div v-if="!loaded" class="loading-indicator">
            <i class="material-icons spinning">hourglass_empty</i>
            <span>Chargement du journal...</span>
          </div>
        </div>

        <!-- Section Observations -->
        <div v-if="loaded" class="profile-section" id="observations-section">
          <div class="section-header">
            <h2>
              <i class="material-icons" aria-hidden="true">visibility</i>
              Observations du mois
            </h2>
            <div v-if="!isSubmitted" class="info-note">
              <i class="material-icons" aria-hidden="true">info</i>
              <span>Décrivez vos observations sur l'évolution de l'enfant ce mois-ci</span>
            </div>
          </div>

          <div class="form-content">
            <div class="form-group">
              <label for="contenu" class="form-label">Contenu des observations</label>
              <textarea
                id="contenu"
                v-model="form.contenu"
                :disabled="isSubmitted"
                rows="6"
                class="form-textarea"
                placeholder="Décrivez vos observations sur ce mois..."
              ></textarea>
            </div>

            <!-- IA helper pour observations -->
            <div v-if="!isSubmitted" class="ai-helper">
              <div class="ai-toggle">
                <input
                  type="checkbox"
                  id="obs-ai"
                  v-model="obsPropose"
                  @change="onProposeObservation"
                  class="form-checkbox"
                />
                <label for="obs-ai" class="ai-label">
                  <i class="material-icons">auto_awesome</i>
                  Proposer une amélioration via IA
                </label>
                <div v-if="obsGenerating" class="ai-status">
                  <i class="material-icons spinning">hourglass_empty</i>
                  Génération en cours...
                </div>
              </div>

              <div v-if="obsProposal && !obsGenerating" class="ai-proposal">
                <div class="proposal-header">
                  <i class="material-icons">lightbulb</i>
                  <strong>Suggestion d'amélioration</strong>
                </div>
                <p class="proposal-text">{{ obsProposal }}</p>
                <button
                  @click="acceptObsProposal"
                  class="btn btn-success btn-sm"
                  type="button"
                >
                  <i class="material-icons">check</i>
                  Utiliser cette proposition
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Section Missions -->
        <div v-if="loaded && missions.length" class="profile-section" id="missions-section">
          <div class="section-header">
            <h2>
              <i class="material-icons" aria-hidden="true">flag</i>
              Progression sur les missions annuelles
            </h2>
            <span class="mission-count">{{ missions.length }} mission{{ missions.length > 1 ? 's' : '' }}</span>
          </div>

          <div class="missions-grid">
            <div
              v-for="m in missions"
              :key="m.id"
              class="mission-progress-card"
            >
              <div class="mission-header">
                <div class="mission-icon">
                  <i class="material-icons">assignment_ind</i>
                </div>
                <div class="mission-title">
                  <h3>{{ m.description }}</h3>
                </div>
              </div>

              <div class="mission-content">
                <div class="form-group">
                  <label :for="'mission-' + m.id" class="form-label">
                    Progression et commentaires
                  </label>
                  <input
                    :id="'mission-' + m.id"
                    v-model="form.progressionMissions[m.id]"
                    :disabled="isSubmitted"
                    type="text"
                    placeholder="Note / commentaire sur la progression..."
                    class="form-input"
                  />
                </div>

                <!-- IA helper pour progression -->
                <div v-if="!isSubmitted" class="ai-helper ai-helper-compact">
                  <div class="ai-toggle">
                    <input
                      type="checkbox"
                      :id="`prog-ai-${m.id}`"
                      v-model="m.aiPropose"
                      @change="() => onProposeProgress(m)"
                      class="form-checkbox"
                    />
                    <label :for="`prog-ai-${m.id}`" class="ai-label ai-label-compact">
                      <i class="material-icons">auto_awesome</i>
                      Amélioration IA
                    </label>
                    <div v-if="m.aiGenerating" class="ai-status ai-status-compact">
                      <i class="material-icons spinning">hourglass_empty</i>
                    </div>
                  </div>

                  <div v-if="m.aiProposal && !m.aiGenerating" class="ai-proposal ai-proposal-compact">
                    <p class="proposal-text">{{ m.aiProposal }}</p>
                    <button
                      @click="acceptMissionProposal(m)"
                      class="btn btn-success btn-xs"
                      type="button"
                    >
                      <i class="material-icons">check</i>
                      Utiliser
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Section Pièces jointes -->
        <div v-if="loaded" class="profile-section" id="attachments-section">
          <div class="section-header">
            <h2>
              <i class="material-icons" aria-hidden="true">attach_file</i>
              Pièces jointes
            </h2>
                         <div v-if="!isSubmitted" class="info-note">
               <i class="material-icons" aria-hidden="true">info</i>
               <span>Ajoutez des documents pour enrichir vos observations</span>
             </div>
          </div>

          <!-- Liste des pièces jointes -->
          <div v-if="attachments.length === 0" class="empty-state">
            <i class="material-icons">attach_file</i>
            <p>Aucune pièce jointe</p>
            <small>Les documents permettent d'enrichir vos observations</small>
          </div>

          <div v-else class="attachments-grid">
            <div
              v-for="att in attachments"
              :key="att.id"
              class="attachment-card"
            >
              <div class="attachment-header">
                <div class="attachment-icon">
                  <i class="material-icons">description</i>
                </div>
                <div class="attachment-info">
                  <h4>{{ att.filepath }}</h4>
                  <span class="attachment-size">Document</span>
                </div>
              </div>

              <div class="attachment-actions">
                <a
                  :href="`http://localhost:3000/uploads/${att.filename}`"
                  target="_blank"
                  class="btn btn-primary btn-sm"
                  aria-label="Voir le document"
                >
                  <i class="material-icons">visibility</i>
                  Voir
                </a>
                <button
                  @click="downloadAttachment(att)"
                  class="btn btn-success btn-sm"
                  type="button"
                  aria-label="Télécharger le document"
                >
                  <i class="material-icons">download</i>
                  Télécharger
                </button>
                <button
                  v-if="!isSubmitted"
                  @click="toggleAttachmentSelection(att.id)"
                  :class="['btn', 'btn-sm', isAttachmentSelected(att.id) ? 'btn-danger' : 'btn-outline']"
                  type="button"
                  :aria-label="isAttachmentSelected(att.id) ? 'Désélectionner' : 'Sélectionner pour suppression'"
                >
                  <i class="material-icons">
                    {{ isAttachmentSelected(att.id) ? 'check_box' : 'check_box_outline_blank' }}
                  </i>
                </button>
              </div>
            </div>
          </div>

          <!-- Actions de suppression -->
          <div v-if="!isSubmitted && toDelete.length > 0" class="attachment-bulk-actions">
            <button
              @click="deleteSelected"
              :disabled="deleting"
              class="btn btn-danger"
              type="button"
            >
              <i class="material-icons" aria-hidden="true">
                {{ deleting ? 'hourglass_empty' : 'delete' }}
              </i>
              {{ deleting ? 'Suppression...' : `Supprimer ${toDelete.length} fichier${toDelete.length > 1 ? 's' : ''}` }}
            </button>
          </div>

                     <!-- Input file visible -->
           <div v-if="!isSubmitted && attachments.length < 3" class="file-upload-section">
             <input
               type="file"
               @change="onFileChange"
               class="form-input"
               accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
               aria-label="Sélectionner un fichier à joindre"
             />
             <button
               :disabled="!selectedFile"
               @click="onUpload"
               class="btn btn-primary"
               type="button"
             >
               <i class="material-icons" aria-hidden="true">upload</i>
               Ajouter le fichier
             </button>
             <p class="upload-info">Maximum 3 pièces jointes (PDF, DOC, images)</p>
           </div>

           <div v-if="attachments.length >= 3 && !isSubmitted" class="upload-limit-warning">
             <i class="material-icons">warning</i>
             Limite de 3 pièces jointes atteinte.
           </div>
        </div>

        <!-- Actions globales -->
        <div v-if="loaded && !isSubmitted" class="profile-section">
          <div class="section-header">
            <h2>
              <i class="material-icons" aria-hidden="true">save</i>
              Actions
            </h2>
          </div>

          <div class="action-buttons">
            <button
              @click="saveJournal"
              :disabled="saving"
              class="btn btn-primary"
              type="button"
            >
              <i class="material-icons" aria-hidden="true">
                {{ saving ? 'hourglass_empty' : 'save' }}
              </i>
              {{ saving ? 'Sauvegarde...' : 'Sauvegarder' }}
            </button>
            
            <button
              @click="goBack"
              class="btn btn-secondary"
              type="button"
            >
              <i class="material-icons" aria-hidden="true">arrow_back</i>
              Retour
            </button>
          </div>
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

<style scoped lang="scss">
// Variables de design
:root {
  --primary-color: #667eea;
  --primary-light: #764ba2;
  --success-color: #10b981;
  --warning-color: #f59e0b;
  --danger-color: #ef4444;
  --info-color: #3b82f6;
  --text-primary: #111827;
  --text-secondary: #6b7280;
  --background-light: #f8fafc;
  --border-color: #e5e7eb;
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

// Status badges
.status-indicator {
  display: flex;
  align-items: center;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  
  &.status-submitted {
    background: linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%);
    color: var(--success-color);
    border: 1px solid var(--success-color);
  }
  
  &.status-draft {
    background: linear-gradient(135deg, #fef3c7 0%, #fef7cd 100%);
    color: var(--warning-color);
    border: 1px solid var(--warning-color);
  }
  
  &.status-new {
    background: linear-gradient(135deg, #dbeafe 0%, #e0f2fe 100%);
    color: var(--info-color);
    border: 1px solid var(--info-color);
  }
}

// Section actions
.section-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-top: 1rem;
}

// Form styling
.form-content {
  margin-top: 1rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: var(--text-primary);
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }
  
  &:disabled {
    background: #f9fafb;
    color: var(--text-secondary);
    cursor: not-allowed;
  }
}

.form-textarea {
  resize: vertical;
  min-height: 120px;
}

.form-checkbox {
  margin-right: 0.5rem;
}

// AI Helper styling
.ai-helper {
  margin-top: 1rem;
  padding: 1rem;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  
  &.ai-helper-compact {
    padding: 0.75rem;
    margin-top: 0.75rem;
  }
}

.ai-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
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

.ai-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.875rem;
  
  &.ai-status-compact {
    font-size: 0.75rem;
  }
  
  .material-icons {
    font-size: 16px;
    
    &.spinning {
      animation: spin 1s linear infinite;
    }
  }
}

.ai-proposal {
  margin-top: 1rem;
  padding: 1rem;
  background: white;
  border-radius: 8px;
  border-left: 4px solid var(--primary-color);
  
  &.ai-proposal-compact {
    margin-top: 0.75rem;
    padding: 0.75rem;
  }
}

.proposal-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  color: var(--primary-color);
  font-weight: 600;
}

.proposal-text {
  margin: 0 0 1rem 0;
  line-height: 1.6;
  color: var(--text-primary);
}

// Missions grid
.mission-count {
  background: var(--primary-color);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.missions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
  margin-top: 1rem;
}

.mission-progress-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-color);
}

.mission-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.mission-icon {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-light) 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  
  .material-icons {
    font-size: 20px;
    color: white;
  }
}

.mission-title h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.4;
}

// Attachments
.attachments-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.attachment-card {
  background: white;
  border-radius: 12px;
  padding: 1rem;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-color);
  transition: all 0.3s ease;
  
  &:hover {
    box-shadow: var(--shadow-md);
  }
}

.attachment-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.attachment-icon {
  width: 32px;
  height: 32px;
  background: var(--background-light);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  
  .material-icons {
    font-size: 18px;
    color: var(--text-secondary);
  }
}

.attachment-info h4 {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
  word-break: break-word;
}

.attachment-size {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.attachment-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.attachment-bulk-actions {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

// Buttons
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid transparent;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .material-icons {
    font-size: 16px;
  }
  
  &.btn-sm {
    padding: 0.375rem 0.75rem;
    font-size: 0.8125rem;
    
    .material-icons {
      font-size: 14px;
    }
  }
  
  &.btn-xs {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    
    .material-icons {
      font-size: 12px;
    }
  }
  
  &.btn-primary {
    background: var(--primary-color);
    color: white;
    border-color: var(--primary-color);
    
    &:hover:not(:disabled) {
      background: var(--primary-light);
    }
  }
  
  &.btn-success {
    background: var(--success-color);
    color: white;
    border-color: var(--success-color);
    
    &:hover:not(:disabled) {
      background: #059669;
    }
  }
  
  &.btn-danger {
    background: var(--danger-color);
    color: white;
    border-color: var(--danger-color);
    
    &:hover:not(:disabled) {
      background: #dc2626;
    }
  }
  
  &.btn-secondary {
    background: #6b7280;
    color: white;
    border-color: #6b7280;
    
    &:hover:not(:disabled) {
      background: #4b5563;
    }
  }
  
  &.btn-outline {
    background: transparent;
    color: var(--text-secondary);
    border-color: var(--border-color);
    
    &:hover:not(:disabled) {
      background: var(--background-light);
    }
  }
}

// Action buttons
.action-buttons {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

// Loading states
.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 2rem;
  color: var(--text-secondary);
  
  .material-icons {
    font-size: 24px;
    
    &.spinning {
      animation: spin 1s linear infinite;
    }
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

// File upload section
.file-upload-section {
  margin-top: 1rem;
  padding: 1.5rem;
  background: var(--background-light);
  border-radius: 8px;
  border: 2px dashed var(--border-color);
  
  .form-input {
    margin-bottom: 1rem;
  }
  
  .upload-info {
    margin: 0.5rem 0 0 0;
    color: var(--text-secondary);
    font-size: 0.875rem;
  }
}

.upload-limit-warning {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
  padding: 1rem;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(239, 68, 68, 0.05));
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 8px;
  color: #92400e;
  font-weight: 500;
  
  .material-icons {
    color: var(--warning-color);
  }
}

// Responsive
@media (max-width: 768px) {
  .missions-grid {
    grid-template-columns: 1fr;
  }
  
  .attachments-grid {
    grid-template-columns: 1fr;
  }
  
  .attachment-actions {
    justify-content: flex-start;
  }
  
  .action-buttons {
    flex-direction: column;
  }
  
  .section-actions {
    flex-direction: column;
    align-items: stretch;
  }
  
  .file-upload-section {
    padding: 1rem;
    
    .btn {
      width: 100%;
      justify-content: center;
    }
  }
}
</style>
