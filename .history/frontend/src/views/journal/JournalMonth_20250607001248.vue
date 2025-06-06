<!-- src/views/journal/JournalMonth.vue -->
<template>
  <!-- (le template reste EXACTEMENT le même) -->
</template>

<script lang="ts" setup>
/* -----------------------------------------
 * imports & état réactif (identique)
 * -------------------------------------- */
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

/* ... (tout le reste du script est inchangé jusqu’à la fonction exportReport) ... */

/**
 * Génération du PDF du rapport
 * - Missions annuelles
 * - Observations
 * - (NOUVEAU) Progression pour chaque mission si renseignée
 */
function exportReport() {
  const doc = new jsPDF()
  let y = 20

  /* ---- Titre ---- */
  doc.setFontSize(16)
  doc.text(`Rapport mensuel - ${childName.value}`, 20, y)
  y += 10

  /* ---- Missions annuelles ---- */
  doc.setFontSize(12)
  doc.text('Missions de l’année :', 20, y)
  y += 8
  missions.value.forEach(m => {
    doc.text(`• ${m.description}`, 25, y)
    y += 7
  })

  y += 5

  /* ---- Mois & Observations ---- */
  doc.text(`Mois : ${monthLabel.value}`, 20, y)
  y += 8
  doc.text('Observations :', 20, y)
  y += 8
  const obsLines = doc.splitTextToSize(form.contenu || '-', 170)
  doc.text(obsLines, 20, y)
  y += obsLines.length * 7 + 5

  /* ---- Progression des missions ---- */
  const filledProgress = missions.value.filter(m => {
    const v = form.progressionMissions[m.id]
    return typeof v === 'string' && v.trim().length > 0
  })

  if (filledProgress.length) {
    doc.text('Évolution des missions :', 20, y)
    y += 8
    filledProgress.forEach(m => {
      /* description */
      doc.text(`• ${m.description}`, 25, y)
      y += 6
      /* progression – wrap si long */
      const progLines = doc.splitTextToSize(form.progressionMissions[m.id].trim(), 160)
      progLines.forEach(line => {
        doc.text(line, 30, y)
        y += 6
      })
      y += 2
    })
  }

  /* ---- Sauvegarde ---- */
  doc.save(`Rapport_${childName.value}_${monthLabel.value}.pdf`)
}

/* ---- navigation “Retour” ---- */
function onBack() {
  router.back()
}
</script>

<style scoped>
/* (les styles restent inchangés) */
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
