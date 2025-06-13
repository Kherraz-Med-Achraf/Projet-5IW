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
        <div class="mb-4">
          <label for="contenu" class="block font-medium mb-1">Observations :</label>
          <textarea
            id="contenu"
            v-model="form.contenu"
            :disabled="isSubmitted"
            rows="5"
            class="w-full border px-2 py-1 rounded"
          ></textarea>
        </div>
  
        <!-- Progression sur chaque mission -->
        <div v-if="missions.length" class="mb-4">
          <h2 class="text-xl font-medium mb-2">Progression sur les missions :</h2>
          <div v-for="m in missions" :key="m.id" class="mb-3">
            <label :for="'mission-' + m.id" class="block font-medium">
              • {{ m.description }}
            </label>
            <input
              :id="'mission-' + m.id"
              v-model="form.progressionMissions[m.id]"
              :disabled="isSubmitted"
              type="text"
              placeholder="Note / commentaire"
              class="w-full border px-2 py-1 rounded"
            />
          </div>
        </div>
  
        <!-- Upload et liste des pièces jointes -->
        <div class="mb-4">
          <!-- (le reste de la section pièces jointes reste inchangé) -->
        </div>
  
        <!-- Boutons Enregistrer / Soumettre / Réouvrir -->
        <div class="flex space-x-4 mt-6">
          <!-- (boutons inchangés) -->
        </div>
  
        <div v-if="error" class="text-red-600 mt-4">{{ error }}</div>
      </div>
  
      <!-- Modal de confirmation de soumission -->
      <div v-if="showSubmitModal" class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        <!-- (modal inchangé) -->
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
  
  const route  = useRoute()
  const router = useRouter()
  
  const childId = Number(route.params.childId)
  const yearId  = Number(route.params.yearId)
  const month   = Number(route.params.month)
  
  const loaded   = ref(false)
  const error    = ref<string>('')
  
  const form = reactive({
    contenu: '',
    progressionMissions: {} as Record<number, string>,
  })
  
  const selectedFile    = ref<File | null>(null)
  const existingJournal = ref<any>(null)
  const missions        = ref<Array<any>>([])
  const attachments     = ref<Array<any>>([])
  const toDelete        = ref<number[]>([])
  
  const isSubmitted = ref(false)
  const isDraft     = ref(false)
  const showSubmitModal = ref(false)
  
  const canReopen = computed(() => authStore.user?.role === 'ADMIN')
  
  const childName = computed(() => {
    const c = childStore.referentChildren.find(c => c.id === childId)
    return c ? `${c.firstName} ${c.lastName}` : ''
  })
  const yearLabel = computed(() => {
    const y = journalStore.academicYears.find(y => y.id === yearId)
    return y?.label || ''
  })
  const monthLabel = computed(() => {
    const labels = [
      'Janvier','Février','Mars','Avril','Mai','Juin',
      'Juillet','Août','Septembre','Octobre','Novembre','Décembre'
    ]
    return labels[month - 1] || ''
  })
  
  onMounted(async () => {
    try {
      await journalStore.fetchMissions(childId, yearId)
      missions.value = journalStore.missions
  
      await journalStore.fetchJournals(childId, yearId)
      existingJournal.value = journalStore.journals.find(j => j.month === month)
  
      if (existingJournal.value) {
        form.contenu = existingJournal.value.contenu || ''
        form.progressionMissions = { ...(existingJournal.value.progressionMissions || {}) }
        attachments.value = existingJournal.value.attachments || []
        isSubmitted.value = existingJournal.value.isSubmitted
        isDraft.value = existingJournal.value.isDraft
      } else {
        isSubmitted.value = false
        isDraft.value = false
      }
    } catch (e: any) {
      error.value = e.message
    } finally {
      loaded.value = true
    }
  })
  
  async function onSave() {
    error.value = ''
    try {
      if (existingJournal.value) {
        const updated = await journalStore.updateJournal(existingJournal.value.id, {
          contenu: form.contenu,
          progressionMissions: form.progressionMissions,
        })
        existingJournal.value = updated
        isDraft.value = updated.isDraft
      } else {
        const created = await journalStore.createJournal({
          childId,
          academicYearId: yearId,
          month,
          contenu: form.contenu,
          progressionMissions: form.progressionMissions,
        })
        existingJournal.value = created
        isDraft.value = created.isDraft
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
        const created = await journalStore.createJournal({
          childId,
          academicYearId: yearId,
          month,
          contenu: form.contenu,
          progressionMissions: form.progressionMissions,
        })
        existingJournal.value = created
      }
      const submitted = await journalStore.submitJournal(existingJournal.value.id)
      isSubmitted.value = submitted.isSubmitted
    } catch (e: any) {
      error.value = e.message
    }
  }
  
  async function onReopen() {
    error.value = ''
    try {
      if (existingJournal.value?.isSubmitted) {
        const reopened = await journalStore.reopenJournal(existingJournal.value.id, 'Réouverture demandée')
        existingJournal.value = reopened
        isSubmitted.value = reopened.isSubmitted
        isDraft.value = reopened.isDraft
      }
    } catch (e: any) {
      error.value = e.message
    }
  }
  
  function onFileChange(e: Event) {
    const input = e.target as HTMLInputElement
    if (input.files?.length) {
      selectedFile.value = input.files[0]
    }
  }
  
  async function onUpload() {
    if (!selectedFile.value) return
    error.value = ''
    try {
      if (!existingJournal.value) {
        const created = await journalStore.createJournal({
          childId,
          academicYearId: yearId,
          month,
          contenu: form.contenu,
          progressionMissions: form.progressionMissions,
        })
        existingJournal.value = created
        isDraft.value = created.isDraft
      }
      const newAtt = await journalStore.uploadAttachment(existingJournal.value.id, selectedFile.value)
      attachments.value.push(newAtt)
      selectedFile.value = null
    } catch (e: any) {
      error.value = e.message
    }
  }
  
  async function deleteSelected() {
    if (toDelete.value.length === 0) return
    error.value = ''
    try {
      for (const attId of toDelete.value) {
        await journalStore.deleteAttachment(attId)
        attachments.value = attachments.value.filter(a => a.id !== attId)
      }
      toDelete.value = []
    } catch (e: any) {
      error.value = e.message
    }
  }
  
  async function downloadAttachment(att: any) {
    const url = `http://localhost:3000/uploads/${att.filename}`
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`Échec du téléchargement : ${response.statusText}`)
      const blob = await response.blob()
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
  
  /**
   * Génération du PDF du rapport
   * - Missions annuelles
   * - Observations
   * - Évolution des missions si renseignée
   */
  function exportReport() {
    const doc = new jsPDF()
    let y = 20
  
    doc.setFontSize(16)
    doc.text(`Rapport mensuel - ${childName.value}`, 20, y)
    y += 10
  
    doc.setFontSize(12)
    doc.text('Missions de l’année :', 20, y)
    y += 8
    missions.value.forEach(m => {
      doc.text(`• ${m.description}`, 25, y)
      y += 7
    })
    y += 5
  
    doc.text(`Mois : ${monthLabel.value}`, 20, y)
    y += 8
    doc.text('Observations :', 20, y)
    y += 8
    const obsLines = doc.splitTextToSize(form.contenu || '-', 170)
    doc.text(obsLines, 20, y)
    y += obsLines.length * 7 + 5
  
    // nouvelle section : progression
    const filled = missions.value.filter(m => {
      const v = form.progressionMissions[m.id]
      return typeof v === 'string' && v.trim().length > 0
    })
    if (filled.length) {
      doc.text('Évolution des missions :', 20, y)
      y += 8
      filled.forEach(m => {
        doc.text(`• ${m.description}`, 25, y)
        y += 6
        const lines = doc.splitTextToSize(form.progressionMissions[m.id].trim(), 160)
        lines.forEach(line => {
          doc.text(line, 30, y)
          y += 6
        })
        y += 2
      })
    }
  
    doc.save(`Rapport_${childName.value}_${monthLabel.value}.pdf`)
  }
  
  function onBack() {
    router.back()
  }
  </script>
  
  <style scoped>
  .bg-blue-600 { background-color: #2563eb; }
  .bg-blue-700 { background-color: #1d4ed8; }
  .bg-green-600 { background-color: #16a34a; }
  .bg-green-700 { background-color: #15803d; }
  .bg-yellow-500 { background-color: #eab308; }
  .bg-yellow-600 { background-color: #ca8a04; }
  .form-checkbox { width: 1rem; height: 1rem; }
  .month-cell:focus,
  .month-cell::selection {
    background-color: transparent !important;
    outline: none !important;
    color: white;
  }
  </style>
  