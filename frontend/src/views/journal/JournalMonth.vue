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

<style scoped lang="scss">
.journal-month {
  max-width: 64rem;
  margin: 0 auto;
  padding: 2rem;

  .journal-month__title {
    text-align: center;
    margin-bottom: 3rem;
    padding: 2rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 12px;
    color: white;
    font-size: 2rem;
    font-weight: 600;
    line-height: 1.3;

    .journal-month__status {
      display: inline-block;
      margin-left: 1rem;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.9rem;
      font-weight: 600;

      &--submitted {
        background: rgba(16, 185, 129, 0.2);
        color: #065f46;
      }

      &--draft {
        background: rgba(245, 158, 11, 0.2);
        color: #92400e;
      }
    }
  }

  .journal-month__loading {
    text-align: center;
    padding: 4rem;
    color: #6b7280;
    font-size: 1.1rem;
  }

  .journal-month__content {
    .journal-month__pdf-section {
      text-align: center;
      margin-bottom: 3rem;

      .journal-month__btn--primary {
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
    }

    .journal-month__section {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      margin-bottom: 2rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      transition: transform 0.2s ease, box-shadow 0.2s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px -5p rgba(0, 0, 0, 0.2);
      }

      .journal-month__label {
        display: block;
        margin-bottom: 0.75rem;
        font-weight: 600;
        color: #111827;
        font-size: 1.1rem;
      }

      .journal-month__textarea {
        width: 100%;
        padding: 0.75rem 1rem;
        border: 2px solid #e5e7eb;
        border-radius: 8px;
        font-size: 1rem;
        font-family: inherit;
        resize: vertical;
        min-height: 120px;
        transition: border-color 0.2s ease, box-shadow 0.2s ease;

        &:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        &:disabled {
          background: #f9fafb;
          color: #6b7280;
          cursor: not-allowed;
        }

        &::placeholder {
          color: #9ca3af;
        }
      }

      .journal-month__subtitle {
        margin: 0 0 1.5rem 0;
        color: #111827;
        font-size: 1.3rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 0.5rem;

        .journal-month__badge {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 600;
        }
      }

      .journal-month__ai-section {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-top: 1rem;
        padding: 1rem;
        background: #f8fafc;
        border-radius: 8px;
        border: 1px solid #e2e8f0;

        .journal-month__checkbox {
          width: 1.25rem;
          height: 1.25rem;
          accent-color: #667eea;
        }

        .journal-month__ai-label {
          color: #374151;
          font-weight: 500;
          margin: 0;
          font-size: 0.9rem;
        }

        .journal-month__generating {
          color: #667eea;
          font-style: italic;
          font-size: 0.9rem;
        }
      }

      .journal-month__proposal {
        background: linear-gradient(
          135deg,
          rgba(102, 126, 234, 0.1),
          rgba(118, 75, 162, 0.1)
        );
        border: 1px solid rgba(102, 126, 234, 0.2);
        border-radius: 8px;
        padding: 1.5rem;
        margin-top: 1rem;

        .journal-month__proposal-text {
          margin: 0 0 1rem 0;
          color: #374151;
          line-height: 1.6;

          strong {
            color: #111827;
          }
        }

        .journal-month__btn--success {
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

        .journal-month__btn--small {
          font-size: 0.875rem;
          padding: 0.5rem 1rem;
        }
      }

      .journal-month__missions-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
        gap: 1.5rem;

        .journal-month__mission-card {
          background: #f8fafc;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          padding: 1.5rem;
          transition: all 0.3s ease;

          &:hover {
            border-color: #667eea;
            transform: translateY(-2px);
            box-shadow: 0 8px 25px -5px rgba(102, 126, 234, 0.2);
          }

          .journal-month__mission-label {
            display: block;
            margin-bottom: 0.75rem;
            font-weight: 600;
            color: #111827;
            font-size: 1rem;
          }

          .journal-month__input {
            width: 100%;
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

            &:disabled {
              background: #f9fafb;
              color: #6b7280;
              cursor: not-allowed;
            }

            &::placeholder {
              color: #9ca3af;
            }
          }
        }
      }

      .journal-month__no-attachments {
        color: #6b7280;
        font-style: italic;
        text-align: center;
        padding: 2rem;
        background: #f9fafb;
        border-radius: 8px;
        border: 2px dashed #e2e8f0;
      }

      .journal-month__attachments-list {
        .journal-month__attachment-item {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1rem;

          .journal-month__attachment-edit {
            display: flex;
            align-items: center;
            gap: 0.75rem;

            .journal-month__checkbox {
              width: 1.25rem;
              height: 1.25rem;
              accent-color: #667eea;
            }

            .journal-month__attachment-link a {
              color: #667eea;
              text-decoration: none;
              font-weight: 500;

              &:hover {
                text-decoration: underline;
              }
            }
          }

          .journal-month__attachment-view {
            display: flex;
            justify-content: space-between;
            align-items: center;

            .journal-month__attachment-name {
              color: #374151;
              font-weight: 500;
            }

            .journal-month__attachment-actions {
              display: flex;
              gap: 0.5rem;

              .journal-month__btn {
                padding: 0.5rem 1rem;
                border: none;
                border-radius: 6px;
                font-size: 0.875rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                text-decoration: none;
                display: inline-flex;
                align-items: center;

                &--primary {
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white;

                  &:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
                  }
                }

                &--success {
                  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                  color: white;

                  &:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
                  }
                }

                &--small {
                  font-size: 0.8rem;
                  padding: 0.4rem 0.8rem;
                }
              }
            }
          }
        }
      }

      .journal-month__delete-btn {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        color: white;
        border: none;
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        margin-top: 1rem;

        &:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
      }

      .journal-month__upload-section {
        margin-top: 1.5rem;
        padding: 1.5rem;
        background: #f8fafc;
        border-radius: 8px;
        border: 2px dashed #e2e8f0;

        .journal-month__file-input {
          margin-bottom: 1rem;
          padding: 0.5rem;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          background: white;
          width: 100%;
        }

        .journal-month__upload-info {
          margin: 0.5rem 0 0 0;
          color: #6b7280;
          font-size: 0.875rem;
        }

        .journal-month__btn--primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;

          &:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
          }

          &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
          }
        }
      }

      .journal-month__limit-warning {
        margin-top: 1rem;
        padding: 1rem;
        background: linear-gradient(
          135deg,
          rgba(245, 158, 11, 0.1),
          rgba(239, 68, 68, 0.05)
        );
        border: 1px solid rgba(245, 158, 11, 0.3);
        border-radius: 8px;
        color: #92400e;
        font-weight: 500;
      }
    }

    .journal-month__actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 3rem;
      padding: 2rem;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);

      .journal-month__back-btn {
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

      .journal-month__action-buttons {
        display: flex;
        gap: 1rem;

        .journal-month__btn {
          padding: 1rem 2rem;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;

          &--primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;

            &:hover {
              transform: translateY(-1px);
              box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
            }
          }

          &--success {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;

            &:hover {
              transform: translateY(-1px);
              box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
            }
          }

          &--danger {
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            color: white;

            &:hover {
              transform: translateY(-1px);
              box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
            }
          }

          &:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
          }
        }
      }
    }

    .journal-month__error {
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
  .journal-month__modal-overlay {
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

  .journal-month__modal {
    background: white;
    border-radius: 12px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
    max-width: 28rem;
    width: 90%;
    overflow: hidden;
    animation: slideIn 0.3s ease;

    .journal-month__modal-header {
      background: linear-gradient(
        135deg,
        rgba(16, 185, 129, 0.1),
        rgba(102, 126, 234, 0.05)
      );
      padding: 1.5rem;
      border-bottom: 1px solid rgba(16, 185, 129, 0.2);

      .journal-month__modal-title {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
        color: #111827;
        display: flex;
        align-items: center;
        gap: 0.75rem;

        .journal-month__modal-icon {
          font-size: 1.5rem;
        }
      }
    }

    .journal-month__modal-content {
      padding: 1.5rem;

      .journal-month__modal-text {
        margin: 0 0 1rem 0;
        color: #6b7280;
        font-size: 1rem;
        line-height: 1.5;
      }

      .journal-month__modal-warning {
        margin: 0;
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
    }

    .journal-month__modal-actions {
      padding: 1.5rem;
      border-top: 1px solid #e5e7eb;
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
      background-color: #f9fafb;

      .journal-month__modal-btn {
        min-width: 140px;
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        border: none;

        &.journal-month__btn--primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;

          &:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
          }
        }

        &.journal-month__btn--success {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;

          &:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
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
  .journal-month {
    padding: 1rem;

    .journal-month__title {
      font-size: 1.5rem;
      padding: 1.5rem;
    }

    .journal-month__content {
      .journal-month__section {
        padding: 1.5rem;

        .journal-month__missions-grid {
          grid-template-columns: 1fr;

          .journal-month__mission-card {
            padding: 1rem;
          }
        }
      }

      .journal-month__actions {
        flex-direction: column;
        gap: 1rem;
        align-items: stretch;

        .journal-month__back-btn {
          order: 2;
        }

        .journal-month__action-buttons {
          flex-direction: column;
          width: 100%;
          order: 1;
        }
      }

      .journal-month__attachments-list {
        .journal-month__attachment-item {
          .journal-month__attachment-view {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;

            .journal-month__attachment-actions {
              align-self: stretch;
              justify-content: space-between;
            }
          }
        }
      }
    }
  }
}
</style>
