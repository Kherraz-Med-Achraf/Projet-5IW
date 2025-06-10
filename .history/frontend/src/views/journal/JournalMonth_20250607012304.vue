
  
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
