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
          <label class="block font-medium mb-1">Pièces jointes :</label>
  
          <!-- Si aucune pièce jointe -->
          <div v-if="attachments.length === 0" class="text-gray-500 mb-2">
            Aucune pièce jointe.
          </div>
  
          <!-- Liste des pièces -->
          <ul class="list-disc list-inside mb-2">
            <li
              v-for="att in attachments"
              :key="att.id"
              class="flex items-center justify-between py-1"
            >
              <!-- Si journal non soumis, on affiche la checkbox + suppression -->
              <div v-if="!isSubmitted" class="flex items-center space-x-2">
                <!-- Checkbox pour suppression multiple -->
                <input
                  type="checkbox"
                  :id="'cb-'+att.id"
                  :value="att.id"
                  v-model="toDelete"
                  :disabled="isSubmitted"
                  class="form-checkbox"
                />
                <label :for="'cb-'+att.id" class="underline text-blue-600">
                  <a
                    :href="`http://localhost:3000/uploads/${att.filename}`"
                    target="_blank"
                  >
                    {{ att.filepath }}
                  </a>
                </label>
              </div>
  
              <!-- Si journal soumis, on affiche les boutons Afficher/Télécharger -->
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
  
          <!-- Bouton supprimer sélection -->
          <button
            v-if="attachments.length > 0 && !isSubmitted"
            :disabled="toDelete.length === 0"
            @click="deleteSelected"
            class="mb-2 bg-red-600 text-white px-4 py-1 rounded hover:bg-red-700 disabled:opacity-50"
          >
            Supprimer la/les sélectionnée(s)
          </button>
  
          <!-- Input de téléchargement, uniquement si on n’a pas encore atteint 3 fichiers -->
          <div v-if="!isSubmitted && attachments.length < 3" class="mt-2">
            <input type="file" @change="onFileChange" />
            <button
              :disabled="!selectedFile"
              @click="onUpload"
              class="mt-2 bg-blue-500 text-white px-4 py-1 rounded disabled:opacity-50"
            >
              Upload
            </button>
            <p class="text-sm text-gray-500 mt-1">
              (Vous pouvez au maximum avoir 3 pièces jointes)
            </p>
          </div>
  
          <!-- Message si la limite de 3 est atteinte -->
          <div
            v-if="attachments.length >= 3 && !isSubmitted"
            class="text-sm text-yellow-600 mt-2"
          >
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
            :disabled="!allMissionsFilled"
            @click="showSubmitModal = true"
            class="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            Soumettre
          </button>
          <p v-if="!isSubmitted && !allMissionsFilled" class="text-red-600 text-sm mt-1">
            Les missions annuels n'ont pas été remplis, veuillez les remplir avant de remplir le journal de bord.
          </p>
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
  
        <div v-if="error" class="text-red-600 mt-4">{{ error }}</div>
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

const loaded  = ref(false)
const error   = ref<string>('')

/* ---------- form state -------------------------------------------------- */
const form = reactive({
  contenu: '',
  progressionMissions: {} as Record<number, string>,
})

const selectedFile      = ref<File | null>(null)
const existingJournal   = ref<any>(null)
const missions          = ref<Array<any>>([])
const attachments       = ref<Array<any>>([])
const toDelete          = ref<number[]>([])

/* ---------- flags ------------------------------------------------------- */
const isSubmitted    = ref(false)
const isDraft        = ref(false)
const canReopen      = computed(() => authStore.user?.role === 'ADMIN')
const showSubmitModal = ref(false)

/* ---------- helpers ----------------------------------------------------- */
const allMissionsFilled = computed(() => {
  if (!missions.value.length) return false
  return missions.value.every(m => {
    const v = form.progressionMissions[m.id]
    return typeof v === 'string' && v.trim().length > 0
  })
})

const childName = computed(() => {
  const c = childStore.referentChildren.find(c => c.id === childId)
  return c ? `${c.firstName} ${c.lastName}` : ''
})

const yearLabel = computed(() => {
  const y = journalStore.academicYears.find(y => y.id === yearId)
  return y?.label || ''
})

const monthLabel = computed(() => {
  const m = [
    'Janvier','Février','Mars','Avril','Mai','Juin',
    'Juillet','Août','Septembre','Octobre','Novembre','Décembre'
  ]
  return m[month - 1] || ''
})

/** Convertit les caractères “exotiques” (guillemet courbe, flèche, etc.)
 *  en équivalents ASCII compatibles avec la police standard de jsPDF. */
function sanitizePdfText(str: string) {
  return str
    .replace(/[’‘]/g, "'")
    .replace(/→|›|»|«/g, '-')       // remplace la flèche par un tiret
    .replace(/[\u2013\u2014]/g, '-') // tirets longs
}

/* ---------- mounted ----------------------------------------------------- */
onMounted(async () => {
  try {
    await journalStore.fetchMissions(childId, yearId)
    missions.value = journalStore.missions

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
  } finally { loaded.value = true }
})

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
  } catch (e:any){ error.value = e.message }
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
  } catch (e:any){ error.value = e.message }
}

async function onReopen() {
  error.value = ''
  try {
    if (existingJournal.value?.isSubmitted) {
      const rep = await journalStore.reopenJournal(existingJournal.value.id,'Réouverture demandée')
      existingJournal.value = rep
      isSubmitted.value     = rep.isSubmitted
      isDraft.value         = rep.isDraft
    }
  } catch (e:any){ error.value = e.message }
}

/* ---------- attachments ------------------------------------------------- */
function onFileChange(e:Event){
  const input = e.target as HTMLInputElement
  if (input.files?.length) selectedFile.value = input.files[0]
}

async function onUpload(){
  if(!selectedFile.value) return
  error.value=''
  try{
    if(!existingJournal.value){
      existingJournal.value = await journalStore.createJournal({
        childId,
        academicYearId: yearId,
        month,
        contenu: form.contenu,
        progressionMissions: form.progressionMissions,
      })
      isDraft.value = existingJournal.value.isDraft
    }
    const att = await journalStore.uploadAttachment(existingJournal.value.id,selectedFile.value)
    attachments.value.push(att)
    selectedFile.value=null
  }catch(e:any){ error.value=e.message }
}

async function deleteSelected(){
  if(!toDelete.value.length) return
  error.value=''
  try{
    for(const id of toDelete.value){
      await journalStore.deleteAttachment(id)
      attachments.value = attachments.value.filter(a=>a.id!==id)
    }
    toDelete.value=[]
  }catch(e:any){ error.value=e.message }
}

async function downloadAttachment(att:any){
  const url=`http://localhost:3000/uploads/${att.filename}`
  try{
    const res=await fetch(url)
    if(!res.ok) throw new Error(res.statusText)
    const blob=await res.blob()
    const blobUrl=URL.createObjectURL(blob)
    const a=document.createElement('a')
    a.href=blobUrl
    a.download=att.filepath
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(blobUrl)
  }catch(e){ error.value='Impossible de télécharger le fichier.' }
}

/* ---------- PDF --------------------------------------------------------- */
function exportReport(){
  const doc=new jsPDF()
  let y=20

  doc.setFontSize(16)
  doc.text(`Rapport mensuel - ${sanitizePdfText(childName.value)}`,20,15)

  doc.setFontSize(12)
  doc.text('Missions de l’année :',20,y); y+=8
  missions.value.forEach(m=>{
    doc.text(`• ${sanitizePdfText(m.description)}`,25,y)
    y+=7
  })

  const hasProg=missions.value.some(m=>{
    const v=form.progressionMissions[m.id]
    return v && v.trim().length
  })

  if(hasProg){
    y+=5
    doc.text('Évolution des missions :',20,y); y+=8
    missions.value.forEach(m=>{
      const prog=form.progressionMissions[m.id]
      if(prog && prog.trim().length){
        const line = `• ${sanitizePdfText(m.description)} - ${sanitizePdfText(prog.trim())}`
        const wrapped = doc.splitTextToSize(line,170)
        doc.text(wrapped,25,y)
        y+=wrapped.length*7
      }
    })
  }

  y+=5
  doc.text(`Mois : ${sanitizePdfText(monthLabel.value)}`,20,y); y+=8
  doc.text('Observations :',20,y); y+=8
  const obs = doc.splitTextToSize(sanitizePdfText(form.contenu||''),170)
  doc.text(obs,20,y)

  doc.save(`Rapport_${sanitizePdfText(childName.value)}_${sanitizePdfText(monthLabel.value)}.pdf`)
}

function onBack(){ router.back() }
</script>

<style scoped>
.bg-blue-600  { background-color:#2563eb; }
.bg-blue-700  { background-color:#1d4ed8; }
.bg-green-600 { background-color:#16a34a; }
.bg-green-700 { background-color:#15803d; }
.bg-yellow-500{ background-color:#eab308; }
.bg-yellow-600{ background-color:#ca8a04; }
.form-checkbox{ width:1rem; height:1rem; }
.month-cell:focus,
.month-cell::selection{
  background-color:transparent !important;
  outline:none !important;
  color:white;
}
</style>
