<!-- src/views/journal/JournalMonth.vue -->
<template>
    <div class="p-4 max-w-3xl mx-auto">
      <h1 class="text-2xl font-semibold mb-4">
        Journal de bord –
        {{ childName }} –
        {{ yearLabel }} –
        {{ monthLabel }}
        <span v-if="isSubmitted" class="text-green-600 ml-2">(Soumis)</span>
        <span v-else-if="isDraft" class="text-blue-600 ml-2">(Brouillon)</span>
      </h1>
  
      <div v-if="!loaded" class="text-center text-gray-500">Chargement…</div>
  
      <div v-else>
        <!-- Bouton exporter en PDF (visible uniquement si soumis) -->
        <div class="mb-4" v-if="isSubmitted">
          <button
            @click="exportReport"
            class="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
          >
            Exporter le rapport en PDF
          </button>
        </div>
  
        <!-- Observations -->
        <div class="mb-6">
          <label for="contenu" class="block font-medium mb-1">Observations :</label>
          <textarea
            id="contenu"
            v-model="form.contenu"
            :disabled="isSubmitted"
            rows="5"
            class="w-full border px-2 py-1 rounded"
          ></textarea>
  
          <!-- IA helper pour observations -->
          <div v-if="!isSubmitted" class="mt-1 flex items-center space-x-2">
            <input
              type="checkbox"
              id="obs-ai"
              v-model="obsPropose"
              @change="onProposeObservation"
              class="form-checkbox"
            />
            <label for="obs-ai" class="text-sm">Proposer une amélioration via IA</label>
            <span v-if="obsGenerating" class="text-xs text-gray-500">(génération…)</span>
          </div>
  
          <div
            v-if="obsProposal && !obsGenerating"
            class="mt-2 bg-gray-100 p-3 rounded border text-sm"
          >
            <p class="mb-2 text-gray-700">
              <strong>Proposition :</strong> {{ obsProposal }}
            </p>
            <button
              @click="acceptObsProposal"
              class="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-xs"
            >
              Utiliser cette proposition
            </button>
          </div>
        </div>
  
        <!-- Progression sur chaque mission -->
        <div v-if="missions.length" class="mb-6">
          <h2 class="text-xl font-medium mb-2">Progression sur les missions :</h2>
          <div v-for="m in missions" :key="m.id" class="mb-4">
            <label :for="'mission-' + m.id" class="block font-medium">
              • {{ m.description }}
            </label>
            <input
              :id="'mission-' + m.id"
              v-model="form.progressionMissions[m.id]"
              :disabled="isSubmitted"
              type="text"
              placeholder="Note / commentaire (facultatif)"
              class="w-full border px-2 py-1 rounded"
            />
  
            <!-- IA helper pour progression -->
            <div v-if="!isSubmitted" class="mt-1 flex items-center space-x-2">
              <input
                type="checkbox"
                :id="`prog-ai-${m.id}`"
                v-model="m.aiPropose"
                @change="() => onProposeProgress(m)"
                class="form-checkbox"
              />
              <label :for="`prog-ai-${m.id}`" class="text-sm">Amélioration IA</label>
              <span v-if="m.aiGenerating" class="text-xs text-gray-500">(génération…)</span>
            </div>
  
            <div
              v-if="m.aiProposal && !m.aiGenerating"
              class="mt-1 bg-gray-100 p-2 rounded border text-xs"
            >
              <p class="mb-1 text-gray-700">
                <strong>Proposition :</strong> {{ m.aiProposal }}
              </p>
              <button
                @click="acceptMissionProposal(m)"
                class="bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
              >
                Utiliser
              </button>
            </div>
          </div>
        </div>
  
        <!-- Upload et liste des pièces jointes -->
        <div class="mb-4">
          <label class="block font-medium mb-1">Pièces jointes :</label>
          <div v-if="attachments.length === 0" class="text-gray-500 mb-2">
            Aucune pièce jointe.
          </div>
          <ul class="list-disc list-inside mb-2">
            <li v-for="att in attachments" :key="att.id" class="flex items-center justify-between py-1">
              <div v-if="!isSubmitted" class="flex items-center space-x-2">
                <input
                  type="checkbox"
                  :id="'cb-'+att.id"
                  :value="att.id"
                  v-model="toDelete"
                  class="form-checkbox"
                />
                <label :for="'cb-'+att.id" class="underline text-blue-600">
                  <a :href="`http://localhost:3000/uploads/${att.filename}`" target="_blank">
                    {{ att.filepath }}
                  </a>
                </label>
              </div>
              <div v-else class="flex items-center space-x-2">
                <span class="text-gray-800">{{ att.filepath }}</span>
                <a
                  :href="`http://localhost:3000/uploads/${att.filename}`"
                  target="_blank"
                  class="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                >
                  Afficher
                </a>
                <button
                  @click="downloadAttachment(att)"
                  class="bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                >
                  Télécharger
                </button>
              </div>
            </li>
          </ul>
          <button
            v-if="attachments.length > 0 && !isSubmitted"
            :disabled="toDelete.length === 0"
            @click="deleteSelected"
            class="mb-2 bg-red-600 text-white px-4 py-1 rounded hover:bg-red-700 disabled:opacity-50"
          >
            Supprimer la/les sélectionnée(s)
          </button>
          <div v-if="!isSubmitted && attachments.length < 3" class="mt-2">
            <input type="file" @change="onFileChange" />
            <button
              :disabled="!selectedFile"
              @click="onUpload"
              class="mt-2 bg-blue-500 text-white px-4 py-1 rounded disabled:opacity-50"
            >
              Upload
            </button>
            <p class="text-sm text-gray-500 mt-1">(Vous pouvez au maximum avoir 3 pièces jointes)</p>
          </div>
          <div v-if="attachments.length >= 3 && !isSubmitted" class="text-sm text-yellow-600 mt-2">
            Limite de 3 pièces jointes atteinte.
          </div>
        </div>
  
        <!-- Boutons Enregistrer / Soumettre / Réouvrir -->
        <div class="flex space-x-4 mt-6">
          <button
            v-if="!isSubmitted"
            @click="onSave"
            class="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Enregistrer (Brouillon)
          </button>
          <button
            v-if="!isSubmitted"
            @click="showSubmitModal = true"
            class="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
          >
            Soumettre
          </button>
          <button
            v-if="isSubmitted && canReopen"
            @click="onReopen"
            class="bg-yellow-500 text-white px-6 py-2 rounded hover:bg-yellow-600"
          >
            Réouvrir (ADMIN only)
          </button>
          <button @click="onBack" class="ml-auto text-gray-600 hover:underline">
            ← Retour
          </button>
        </div>
  
        <!-- Modal de confirmation de soumission -->
        <div
          v-if="showSubmitModal"
          class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
        >
          <div class="bg-white rounded-lg p-6 max-w-lg w-full">
            <h2 class="text-lg font-semibold mb-4">Confirmer la soumission</h2>
            <p class="mb-6">
              Êtes-vous certain·e de vouloir soumettre le rapport de
              <strong>{{ monthLabel }}</strong> ?
              <br />
              Une fois soumis, il ne sera plus modifiable.
            </p>
            <div class="flex justify-end space-x-4">
              <button
                @click="showSubmitModal = false"
                class="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
              >
                Annuler
              </button>
              <button
                @click="confirmSubmit"
                class="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script lang="ts" setup>
  import { ref, reactive, onMounted, computed } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useJournalStore } from '@/stores/journalStore'
  import { useChildStore } from '@/stores/childStore'
  import { useAuthStore } from '@/stores/auth'
  import { jsPDF } from 'jspdf'
  
  const journalStore = useJournalStore()
  const childStore   = useChildStore()
  const authStore    = useAuthStore()
  const route        = useRoute()
  const router       = useRouter()
  const allMissionsFilled = computed(() => {
  if (!missions.value.length) return false
  return missions.value.every(m => {
    const v = form.progressionMissions[m.id]
    return typeof v === 'string' && v.trim().length > 0
  })
})
  
  const childId = Number(route.params.childId)
  const yearId  = Number(route.params.yearId)
  const month   = Number(route.params.month)
  
  const loaded = ref(false)
  const error  = ref<string>('')
  
  /* ---------- form state -------------------------------------------------- */
  const form = reactive({
    contenu: '',
    progressionMissions: {} as Record<number, string>,
  })
  
  /* IA flags for observations */
  const obsPropose    = ref(false)
  const obsGenerating = ref(false)
  const obsProposal   = ref<string | null>(null)
  
  /* file & data */
  const selectedFile    = ref<File | null>(null)
  const existingJournal = ref<any>(null)
  const missions        = ref<Array<any>>([])
  const attachments     = ref<Array<any>>([])
  const toDelete        = ref<number[]>([])
  
  /* ---------- flags ------------------------------------------------------- */
  const isSubmitted     = ref(false)
  const isDraft         = ref(false)
  const canReopen       = computed(() => authStore.user?.role === 'ADMIN')
  const showSubmitModal = ref(false)
  
  /* ---------- helpers ----------------------------------------------------- */
  const childName = computed(() => {
    const c = childStore.referentChildren.find(c => c.id === childId)
    return c ? `${c.firstName} ${c.lastName}` : ''
  })
  const yearLabel = computed(() => {
    const y = journalStore.academicYears.find(y => y.id === yearId)
    return y?.label || ''
  })
  const monthLabel = computed(() => {
    const labels = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
    return labels[month - 1] || ''
  })
  
  /* ---------- mounted ----------------------------------------------------- */
  onMounted(async () => {
    try {
      await journalStore.fetchMissions(childId, yearId)
      missions.value = journalStore.missions.map(m => ({
        ...m,
        aiPropose: false,
        aiGenerating: false,
        aiProposal: null as string | null
      }))
  
      await journalStore.fetchJournals(childId, yearId)
      existingJournal.value = journalStore.journals.find(j => j.month === month)
  
      if (existingJournal.value) {
        form.contenu             = existingJournal.value.contenu || ''
        form.progressionMissions = { ...(existingJournal.value.progressionMissions || {}) }
        attachments.value        = existingJournal.value.attachments || []
        isSubmitted.value        = existingJournal.value.isSubmitted
        isDraft.value            = existingJournal.value.isDraft
      }
    } catch (e: any) {
      error.value = e.message
    } finally {
      loaded.value = true
    }
  })
  
  /* ---------- IA: propose observation ------------------------------------- */
  async function onProposeObservation() {
    if (!obsPropose.value) {
      obsProposal.value    = null
      obsGenerating.value  = false
      return
    }
    if (!form.contenu.trim()) {
      alert('Veuillez d’abord saisir des observations avant de demander une amélioration.')
      obsPropose.value = false
      return
    }
    obsGenerating.value = true
    obsProposal.value   = null
    try {
      obsProposal.value = await journalStore.proposeMissionImprovement(form.contenu)
    } catch (e: any) {
      error.value = e.message || 'Erreur IA observation.'
      obsPropose.value = false
    } finally {
      obsGenerating.value = false
    }
  }
  function acceptObsProposal() {
    if (obsProposal.value) {
      form.contenu = obsProposal.value
      obsPropose.value = false
      obsProposal.value = null
    }
  }
  
  /* ---------- IA: propose progression for a mission ---------------------- */
  async function onProposeProgress(m: any) {
    if (!m.aiPropose) {
      m.aiProposal   = null
      m.aiGenerating = false
      return
    }
    const current = form.progressionMissions[m.id] || ''
    if (!current.trim()) {
      alert('Veuillez d’abord saisir une progression avant de demander une amélioration.')
      m.aiPropose = false
      return
    }
    m.aiGenerating = true
    m.aiProposal   = null
    try {
      m.aiProposal = await journalStore.proposeMissionImprovement(current)
    } catch (e: any) {
      error.value = e.message || 'Erreur IA progression.'
      m.aiPropose = false
    } finally {
      m.aiGenerating = false
    }
  }
  function acceptMissionProposal(m: any) {
    if (m.aiProposal) {
      form.progressionMissions[m.id] = m.aiProposal
      m.aiPropose = false
      m.aiProposal = null
    }
  }
  
  /* ---------- save / submit / reopen ------------------------------------- */
  async function onSave() {
    error.value = ''
    try {
      if (existingJournal.value) {
        const upd = await journalStore.updateJournal(existingJournal.value.id, {
          contenu: form.contenu,
          progressionMissions: form.progressionMissions,
        })
        existingJournal.value = upd
        isDraft.value         = upd.isDraft
      } else {
        const crt = await journalStore.createJournal({
          childId,
          academicYearId: yearId,
          month,
          contenu: form.contenu,
          progressionMissions: form.progressionMissions,
        })
        existingJournal.value = crt
        isDraft.value         = crt.isDraft
      }
    } catch (e: any) {
      error.value = e.message
    }
  }
  
  async function confirmSubmit() {
    showSubmitModal.value = false
    error.value = ''
    try {
      if (!existingJournal.value) {
        existingJournal.value = await journalStore.createJournal({
          childId,
          academicYearId: yearId,
          month,
          contenu: form.contenu,
          progressionMissions: form.progressionMissions,
        })
      }
      const sub = await journalStore.submitJournal(existingJournal.value.id)
      isSubmitted.value = sub.isSubmitted
    } catch (e: any) {
      error.value = e.message
    }
  }
  
  async function onReopen() {
    error.value = ''
    try {
      if (existingJournal.value?.isSubmitted) {
        const rep = await journalStore.reopenJournal(existingJournal.value.id, 'Réouverture demandée')
        existingJournal.value = rep
        isSubmitted.value     = rep.isSubmitted
        isDraft.value         = rep.isDraft
      }
    } catch (e: any) {
      error.value = e.message
    }
  }
  
  /* ---------- attachments ------------------------------------------------- */
  function onFileChange(e: Event) {
    const input = e.target as HTMLInputElement
    if (input.files?.length) selectedFile.value = input.files[0]
  }
  async function onUpload() {
    if (!selectedFile.value) return
    error.value = ''
    try {
      if (!existingJournal.value) {
        existingJournal.value = await journalStore.createJournal({
          childId,
          academicYearId: yearId,
          month,
          contenu: form.contenu,
          progressionMissions: form.progressionMissions,
        })
        isDraft.value = existingJournal.value.isDraft
      }
      const att = await journalStore.uploadAttachment(existingJournal.value.id, selectedFile.value)
      attachments.value.push(att)
      selectedFile.value = null
    } catch (e: any) {
      error.value = e.message
    }
  }
  async function deleteSelected() {
    if (!toDelete.value.length) return
    error.value = ''
    try {
      for (const id of toDelete.value) {
        await journalStore.deleteAttachment(id)
        attachments.value = attachments.value.filter(a => a.id !== id)
      }
      toDelete.value = []
    } catch (e: any) {
      error.value = e.message
    }
  }
  async function downloadAttachment(att: any) {
    const url = `http://localhost:3000/uploads/${att.filename}`
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(res.statusText)
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = att.filepath
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch {
      error.value = 'Impossible de télécharger le fichier.'
    }
  }
  
  /* ---------- PDF --------------------------------------------------------- */
  function sanitizePdfText(str: string) {
    return str
      .replace(/[’‘]/g, "'")
      .replace(/→|›|»|«/g, '-')
      .replace(/[\u2013\u2014]/g, '-')
  }
  
  function exportReport() {
    const doc = new jsPDF()
    let y = 20
  
    doc.setFontSize(16)
    doc.text(`Rapport mensuel - ${sanitizePdfText(childName.value)}`, 20, 15)
  
    doc.setFontSize(12)
    doc.text('Missions de l’année :', 20, y); y += 8
    missions.value.forEach(m => {
      doc.text(`• ${sanitizePdfText(m.description)}`, 25, y)
      y += 7
    })
  
    const hasProg = missions.value.some(m => {
      const v = form.progressionMissions[m.id]
      return v && v.trim().length
    })
    if (hasProg) {
      y += 5
      doc.text('Évolution des missions :', 20, y); y += 8
      missions.value.forEach(m => {
        const prog = form.progressionMissions[m.id]
        if (prog && prog.trim().length) {
          const line = `• ${sanitizePdfText(m.description)} - ${sanitizePdfText(prog.trim())}`
          const wrapped = doc.splitTextToSize(line, 170)
          doc.text(wrapped, 25, y)
          y += wrapped.length * 7
        }
      })
    }
  
    y += 5
    doc.text(`Mois : ${sanitizePdfText(monthLabel.value)}`, 20, y); y += 8
    doc.text('Observations :', 20, y); y += 8
    const obs = doc.splitTextToSize(sanitizePdfText(form.contenu || ''), 170)
    doc.text(obs, 20, y)
  
    doc.save(`Rapport_${sanitizePdfText(childName.value)}_${sanitizePdfText(monthLabel.value)}.pdf`)
  }
  
  function onBack() {
    router.back()
  }
  </script>
  
  <style scoped>
  .bg-blue-600  { background-color: #2563eb; }
  .bg-blue-700  { background-color: #1d4ed8; }
  .bg-green-600 { background-color: #16a34a; }
  .bg-green-700 { background-color: #15803d; }
  .bg-yellow-500{ background-color: #eab308; }
  .bg-yellow-600{ background-color: #ca8a04; }
  
  /* Styles pour les cases à cocher IA */
  .form-checkbox {
    width: 1rem;
    height: 1rem;
  }
  
  /* Désactive le focus/outline blanc sur les cellules de calendrier si besoin */
  .month-cell:focus,
  .month-cell::selection {
    background-color: transparent !important;
    outline: none !important;
    color: white;
  }
  
  /* Styles additionnels pour les zones IA */
  .ai-checkbox-label {
    font-size: 0.875rem; /* text-sm */
    color: #4a5568;      /* text-gray-700 */
  }
  
  .ai-proposal-box {
    background-color: #f7fafc; /* bg-gray-100 */
    border: 1px solid #e2e8f0;  /* border-gray-200 */
    padding: 0.75rem;           /* p-3 */
    border-radius: 0.375rem;    /* rounded */
    font-size: 0.875rem;        /* text-sm */
    color: #2d3748;             /* text-gray-800 */
  }
  
  /* Bouton accepter la proposition IA */
  .button-ai-accept {
    background-color: #38a169; /* green-600 */
    color: white;
    font-size: 0.75rem;       /* text-xs */
    padding: 0.25rem 0.5rem;   /* px-3 py-1 */
    border-radius: 0.375rem;  /* rounded */
  }
  
  .button-ai-accept:hover {
    background-color: #2f855a; /* green-700 */
  }
  </style>
  