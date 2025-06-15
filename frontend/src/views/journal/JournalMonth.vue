<!-- src/views/journal/JournalMonth.vue -->
<template>
  <div class="journal-month">
    <h1 class="journal-month__title">
      Journal de bord – {{ childName }} – {{ yearLabel }} – {{ monthLabel }}
      <span
        v-if="isSubmitted"
        class="journal-month__status journal-month__status--submitted"
        >(Soumis)</span
      >
      <span
        v-else-if="isDraft"
        class="journal-month__status journal-month__status--draft"
        >(Brouillon)</span
      >
    </h1>

    <div v-if="!loaded" class="journal-month__loading">Chargement…</div>

    <div v-else class="journal-month__content">
      <!-- Bouton exporter en PDF (visible uniquement si soumis) -->
      <div v-if="isSubmitted" class="journal-month__pdf-section">
        <button
          @click="exportReport"
          class="journal-month__btn journal-month__btn--primary"
        >
          📄 Exporter le rapport en PDF
        </button>
      </div>

      <!-- Observations -->
      <div class="journal-month__section">
        <label for="contenu" class="journal-month__label">Observations :</label>
        <textarea
          id="contenu"
          v-model="form.contenu"
          :disabled="isSubmitted"
          rows="5"
          class="journal-month__textarea"
          placeholder="Décrivez vos observations sur ce mois..."
        ></textarea>

        <!-- IA helper pour observations -->
        <div v-if="!isSubmitted" class="journal-month__ai-section">
          <input
            type="checkbox"
            id="obs-ai"
            v-model="obsPropose"
            @change="onProposeObservation"
            class="journal-month__checkbox"
          />
          <label for="obs-ai" class="journal-month__ai-label">
            Proposer une amélioration via IA
          </label>
          <span v-if="obsGenerating" class="journal-month__generating">
            (génération…)
          </span>
        </div>

        <div
          v-if="obsProposal && !obsGenerating"
          class="journal-month__proposal"
        >
          <p class="journal-month__proposal-text">
            <strong>Proposition :</strong> {{ obsProposal }}
          </p>
          <button
            @click="acceptObsProposal"
            class="journal-month__btn journal-month__btn--success journal-month__btn--small"
          >
            Utiliser cette proposition
          </button>
        </div>
      </div>

      <!-- Progression sur chaque mission -->
      <div v-if="missions.length" class="journal-month__section">
        <h2 class="journal-month__subtitle">
          🎯 Progression sur les missions annuelles
          <span class="journal-month__badge">{{ missions.length }}</span>
        </h2>
        <div class="journal-month__missions-grid">
          <div
            v-for="m in missions"
            :key="m.id"
            class="journal-month__mission-card"
          >
            <label
              :for="'mission-' + m.id"
              class="journal-month__mission-label"
            >
              📋 {{ m.description }}
            </label>
            <input
              :id="'mission-' + m.id"
              v-model="form.progressionMissions[m.id]"
              :disabled="isSubmitted"
              type="text"
              placeholder="Note / commentaire sur la progression..."
              class="journal-month__input"
            />

            <!-- IA helper pour progression -->
            <div v-if="!isSubmitted" class="journal-month__ai-section">
              <input
                type="checkbox"
                :id="`prog-ai-${m.id}`"
                v-model="m.aiPropose"
                @change="() => onProposeProgress(m)"
                class="journal-month__checkbox"
              />
              <label :for="`prog-ai-${m.id}`" class="journal-month__ai-label">
                Amélioration IA
              </label>
              <span v-if="m.aiGenerating" class="journal-month__generating">
                (génération…)
              </span>
            </div>

            <div
              v-if="m.aiProposal && !m.aiGenerating"
              class="journal-month__proposal"
            >
              <p class="journal-month__proposal-text">
                <strong>Proposition :</strong> {{ m.aiProposal }}
              </p>
              <button
                @click="acceptMissionProposal(m)"
                class="journal-month__btn journal-month__btn--success journal-month__btn--small"
              >
                Utiliser
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Upload et liste des pièces jointes -->
      <div class="journal-month__section">
        <label class="journal-month__label">📎 Pièces jointes :</label>
        <div
          v-if="attachments.length === 0"
          class="journal-month__no-attachments"
        >
          Aucune pièce jointe pour le moment.
        </div>
        <div v-else class="journal-month__attachments-list">
          <div
            v-for="att in attachments"
            :key="att.id"
            class="journal-month__attachment-item"
          >
            <div v-if="!isSubmitted" class="journal-month__attachment-edit">
              <input
                type="checkbox"
                :id="'cb-' + att.id"
                :value="att.id"
                v-model="toDelete"
                class="journal-month__checkbox"
              />
              <label
                :for="'cb-' + att.id"
                class="journal-month__attachment-link"
              >
                <a
                  :href="`http://localhost:3000/uploads/${att.filename}`"
                  target="_blank"
                >
                  📄 {{ att.filepath }}
                </a>
              </label>
            </div>
            <div v-else class="journal-month__attachment-view">
              <span class="journal-month__attachment-name"
                >📄 {{ att.filepath }}</span
              >
              <div class="journal-month__attachment-actions">
                <a
                  :href="`http://localhost:3000/uploads/${att.filename}`"
                  target="_blank"
                  class="journal-month__btn journal-month__btn--primary journal-month__btn--small"
                >
                  👁️ Afficher
                </a>
                <button
                  @click="downloadAttachment(att)"
                  class="journal-month__btn journal-month__btn--success journal-month__btn--small"
                >
                  📥 Télécharger
                </button>
              </div>
            </div>
          </div>
        </div>

        <button
          v-if="attachments.length > 0 && !isSubmitted"
          :disabled="toDelete.length === 0"
          @click="deleteSelected"
          class="journal-month__btn journal-month__btn--danger journal-month__delete-btn"
        >
          🗑️ Supprimer la sélection ({{ toDelete.length }})
        </button>

        <div
          v-if="!isSubmitted && attachments.length < 3"
          class="journal-month__upload-section"
        >
          <input
            type="file"
            @change="onFileChange"
            class="journal-month__file-input"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          />
          <button
            :disabled="!selectedFile"
            @click="onUpload"
            class="journal-month__btn journal-month__btn--primary"
          >
            📤 Ajouter le fichier
          </button>
          <p class="journal-month__upload-info">
            Maximum 3 pièces jointes (PDF, DOC, images)
          </p>
        </div>

        <div
          v-if="attachments.length >= 3 && !isSubmitted"
          class="journal-month__limit-warning"
        >
          ⚠️ Limite de 3 pièces jointes atteinte.
        </div>
      </div>

      <!-- Boutons Enregistrer / Soumettre / Réouvrir -->
      <div class="journal-month__actions">
        <button @click="onBack" class="journal-month__back-btn">
          ← Retour
        </button>
        <div class="journal-month__action-buttons">
          <button
            v-if="!isSubmitted"
            @click="onSave"
            class="journal-month__btn journal-month__btn--primary"
          >
            💾 Enregistrer (Brouillon)
          </button>
          <button
            v-if="!isSubmitted"
            @click="showSubmitModal = true"
            class="journal-month__btn journal-month__btn--success"
          >
            ✅ Soumettre définitivement
          </button>
          <button
            v-if="isSubmitted && canReopen"
            @click="onReopen"
            class="journal-month__btn journal-month__btn--warning"
          >
            🔓 Réouvrir (ADMIN)
          </button>
        </div>
      </div>

      <!-- Modal de confirmation de soumission -->
      <div v-if="showSubmitModal" class="journal-month__modal-overlay">
        <div class="journal-month__modal">
          <div class="journal-month__modal-header">
            <h2 class="journal-month__modal-title">
              <span class="journal-month__modal-icon">✅</span>
              Confirmer la soumission
            </h2>
          </div>

          <div class="journal-month__modal-content">
            <p class="journal-month__modal-text">
              Êtes-vous certain·e de vouloir soumettre le rapport de
              <strong>{{ monthLabel }}</strong> ?
            </p>
            <p class="journal-month__modal-warning">
              <strong>Une fois soumis, il ne sera plus modifiable.</strong>
            </p>
          </div>

          <div class="journal-month__modal-actions">
            <button
              @click="showSubmitModal = false"
              class="journal-month__btn journal-month__btn--secondary journal-month__modal-btn"
            >
              ❌ Annuler
            </button>
            <button
              @click="confirmSubmit"
              class="journal-month__btn journal-month__btn--success journal-month__modal-btn"
            >
              ✅ Confirmer la soumission
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
      form.contenu
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
    m.aiProposal = await journalStore.proposeMissionImprovement(current);
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
</script>

<style lang="scss" scoped>
@use "sass:color";

.journal-month {
  padding: 2rem;
  max-width: 60rem;
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

  &__status {
    font-size: 1rem;
    font-weight: 600;
    margin-left: 1rem;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;

    &--submitted {
      background-color: rgba($success, 0.1);
      color: $success;
      border: 1px solid rgba($success, 0.3);
    }

    &--draft {
      background-color: rgba($accent-primary, 0.1);
      color: $accent-primary;
      border: 1px solid rgba($accent-primary, 0.3);
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
    gap: 2rem;
  }

  &__section {
    background-color: $bg-primary;
    padding: 2rem;
    border-radius: 0.75rem;
    border: 1px solid $border;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    transition: all 0.2s ease;

    &:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      border-color: $accent-primary;
    }
  }

  &__pdf-section {
    margin-bottom: 1rem;
  }

  &__label {
    display: block;
    font-weight: 600;
    margin-bottom: 0.75rem;
    color: $text-primary;
    font-size: 1.125rem;
  }

  &__subtitle {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 1.5rem;
    color: $text-primary;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  &__badge {
    background: linear-gradient(135deg, $accent-primary, $accent-hover);
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.875rem;
    font-weight: 600;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  &__textarea {
    width: 100%;
    padding: 1rem;
    border: 2px solid $border;
    border-radius: 0.5rem;
    background-color: $bg-secondary;
    color: $text-primary;
    font-size: 1rem;
    font-family: inherit;
    line-height: 1.5;
    resize: vertical;
    min-height: 120px;
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

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      background-color: rgba($bg-tertiary, 0.5);
    }

    &::placeholder {
      color: $text-muted;
    }
  }

  &__input {
    width: 100%;
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

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      background-color: rgba($bg-tertiary, 0.5);
    }

    &::placeholder {
      color: $text-muted;
    }
  }

  &__missions-grid {
    display: grid;
    gap: 1.5rem;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  }

  &__mission-card {
    background-color: $bg-secondary;
    padding: 1.5rem;
    border-radius: 0.75rem;
    border: 1px solid $border;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;

    &::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(135deg, $accent-primary, $success);
    }

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
      border-color: $accent-primary;
    }
  }

  &__mission-label {
    display: block;
    font-weight: 600;
    margin-bottom: 1rem;
    color: $text-primary;
    font-size: 1rem;
  }

  &__ai-section {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-top: 1rem;
  }

  &__checkbox {
    width: 1.25rem;
    height: 1.25rem;
    accent-color: $accent-primary;
    cursor: pointer;
  }

  &__ai-label {
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
    }

    &--secondary {
      background: linear-gradient(
        135deg,
        $bg-tertiary,
        color.adjust($bg-tertiary, $lightness: -5%)
      );
      color: $text-primary;
      border: 1px solid $border;

      &:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
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

      &:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 4px 16px rgba(239, 68, 68, 0.4);
      }
    }

    &--warning {
      background: linear-gradient(
        135deg,
        $warning,
        color.adjust($warning, $lightness: -5%)
      );
      color: white;
      box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);

      &:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 4px 16px rgba(245, 158, 11, 0.4);
      }
    }

    &--small {
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
    }
  }

  &__no-attachments {
    color: $text-muted;
    text-align: center;
    padding: 2rem;
    font-style: italic;
    background-color: rgba($bg-tertiary, 0.3);
    border-radius: 0.5rem;
    border: 1px dashed $border;
  }

  &__attachments-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  &__attachment-item {
    padding: 1rem;
    background-color: $bg-secondary;
    border-radius: 0.5rem;
    border: 1px solid $border;
    transition: all 0.2s ease;

    &:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      border-color: $accent-primary;
    }
  }

  &__attachment-edit {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  &__attachment-view {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  &__attachment-link {
    color: $accent-primary;
    text-decoration: none;
    font-weight: 500;
    transition: color 0.2s ease;

    &:hover {
      color: $accent-hover;
      text-decoration: underline;
    }

    a {
      color: inherit;
      text-decoration: none;
    }
  }

  &__attachment-name {
    font-weight: 500;
    color: $text-primary;
  }

  &__attachment-actions {
    display: flex;
    gap: 0.5rem;
  }

  &__delete-btn {
    margin-bottom: 1rem;
  }

  &__upload-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1.5rem;
    background-color: rgba($accent-primary, 0.05);
    border-radius: 0.5rem;
    border: 1px dashed rgba($accent-primary, 0.3);
  }

  &__file-input {
    padding: 0.5rem;
    border: 1px solid $border;
    border-radius: 0.375rem;
    background-color: $bg-primary;
    color: $text-primary;
    font-size: 0.875rem;

    &:focus {
      outline: none;
      border-color: $accent-primary;
    }
  }

  &__upload-info {
    font-size: 0.875rem;
    color: $text-muted;
    margin: 0;
    text-align: center;
  }

  &__limit-warning {
    padding: 1rem;
    background-color: rgba($warning, 0.1);
    border: 1px solid rgba($warning, 0.3);
    border-radius: 0.5rem;
    color: $warning;
    font-size: 0.875rem;
    font-weight: 500;
    text-align: center;
  }

  &__actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    background-color: $bg-primary;
    border-radius: 0.75rem;
    border: 1px solid $border;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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

  &__action-buttons {
    display: flex;
    gap: 1rem;
  }

  &__error {
    color: $error;
    background: linear-gradient(135deg, rgba($error, 0.1), rgba($error, 0.05));
    border: 2px solid rgba($error, 0.3);
    padding: 1.5rem;
    border-radius: 0.75rem;
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
      rgba($success, 0.1),
      rgba($accent-primary, 0.05)
    );
    padding: 1.5rem;
    border-bottom: 1px solid rgba($success, 0.2);
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
    margin: 0;
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
  .journal-month {
    padding: 1rem;

    &__title {
      font-size: 1.5rem;
    }

    &__missions-grid {
      grid-template-columns: 1fr;
    }

    &__actions {
      flex-direction: column;
      gap: 1rem;
    }

    &__action-buttons {
      flex-direction: column;
      width: 100%;
    }

    &__attachment-view {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.75rem;
    }

    &__attachment-actions {
      align-self: stretch;
      justify-content: space-between;
    }
  }
}
</style>
