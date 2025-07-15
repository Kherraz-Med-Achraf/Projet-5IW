<!-- src/views/journal/JournalMissions.vue -->
<template>
    <div class="p-4 max-w-3xl mx-auto">
      <h1 class="text-2xl font-semibold mb-4">
        Missions annuelles – {{ childName }} – {{ yearLabel }}
      </h1>
  
      <div v-if="!loaded" class="text-center text-gray-500">Chargement…</div>
  
      <div v-else>
        <!-- Liste des missions -->
        <div
          v-for="(mission, index) in missionsList"
          :key="mission.id ?? index"
          class="mb-6"
        >
          <div class="flex items-start space-x-2">
            <input
              v-model="mission.description"
              :placeholder="`Mission ${index + 1}`"
              class="flex-1 border px-2 py-1 rounded"
              type="text"
            />
  
            <!-- bouton suppression -->
            <button
              @click="removeMission(index)"
              class="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 h-9"
            >
              Supprimer
            </button>
          </div>
  
          <!-- IA helper -->
          <div class="mt-1 flex items-center space-x-2">
            <input
              type="checkbox"
              :id="`cb-ai-${index}`"
              v-model="mission.propose"
              @change="onPropose(index)"
              class="form-checkbox"
            />
            <label :for="`cb-ai-${index}`" class="text-sm">
              Proposer une amélioration via IA
            </label>
  
            <!-- loader -->
            <span v-if="mission.generating" class="text-xs text-gray-500">
              (génération…)
            </span>
          </div>
  
          <!-- proposition affichée quand dispo -->
          <div
            v-if="mission.proposal && !mission.generating"
            class="mt-2 bg-gray-100 p-3 rounded border text-sm"
          >
            <p class="mb-2 text-gray-700">
              <strong>Proposition :</strong> {{ mission.proposal }}
            </p>
  
            <button
              @click="acceptProposal(index)"
              class="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-xs"
            >
              Utiliser cette proposition
            </button>
          </div>
        </div>
  
        <!-- ajouter mission -->
        <button
          @click="addMission"
          class="mb-6 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Ajouter une mission
        </button>
  
        <!-- actions principales -->
        <div class="flex space-x-4">
          <button
            @click="onSave"
            :disabled="saving"
            class="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {{ saving ? 'Enregistrement…' : 'Enregistrer les missions' }}
          </button>
          <button @click="onBack" class="ml-auto text-gray-600 hover:underline">
            ← Retour
          </button>
        </div>
  
        <div v-if="error" class="text-red-600 mt-4">{{ error }}</div>
      </div>
    </div>
  </template>
  
  <script lang="ts" setup>
  import { ref, reactive, onMounted, computed } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useJournalStore } from '@/stores/journalStore'
  import { useChildStore } from '@/stores/childStore'
  
  const journalStore = useJournalStore()
  const childStore   = useChildStore()
  
  const route  = useRoute()
  const router = useRouter()
  
  const childId = Number(route.params.childId)
  const yearId  = Number(route.params.yearId)
  
  const loaded = ref(false)
  const saving = ref(false)
  const error  = ref<string>('')
  
  interface MissionVM {
    id?: number
    description: string
    propose?: boolean        // checkbox state
    generating?: boolean     // loading flag
    proposal?: string | null // IA suggestion
  }
  
  /* liste éditable */
  const missionsList = reactive<MissionVM[]>([])
  
  /* libellés */
  const childName = computed(() => {
    const c = childStore.referentChildren.find(c => c.id === childId)
    return c ? `${c.firstName} ${c.lastName}` : ''
  })
  const yearLabel = computed(() => {
    const y = journalStore.academicYears.find(y => y.id === yearId)
    return y?.label || ''
  })
  
  /* chargement initial */
  onMounted(async () => {
    try {
      await journalStore.fetchMissions(childId, yearId)
      missionsList.splice(
        0,
        missionsList.length,
        ...journalStore.missions.map(m => ({
          id: m.id,
          description: m.description,
          propose: false,
          generating: false,
          proposal: null,
        }))
      )
    } catch (e: any) {
      error.value = e.message
    } finally {
      loaded.value = true
    }
  })
  
  /* ajout / suppression */
  function addMission() {
    missionsList.push({ description: '', propose: false, generating: false, proposal: null })
  }
  function removeMission(index: number) {
    missionsList.splice(index, 1)
  }
  
  /* IA : génération de proposition */
  async function onPropose(index: number) {
    const m = missionsList[index]
    if (!m.propose) {
      /* case décochée : on efface la suggestion */
      m.proposal   = null
      m.generating = false
      return
    }
    if (!m.description.trim()) {
      alert('Veuillez d’abord décrire la mission avant de demander une amélioration.')
      m.propose = false
      return
    }
  
    m.generating = true
    m.proposal   = null
  
    try {
      /* appel au store — ajoutera la logique OpenAI dans un second temps */
      const suggestion = await journalStore.proposeMissionImprovement(m.description)
      m.proposal = suggestion
    } catch (e:any) {
      error.value = e.message || 'Erreur de génération de la proposition.'
      m.propose = false
    } finally {
      m.generating = false
    }
  }
  
  /* accepte la suggestion → remplace le texte d’origine */
  function acceptProposal(index: number) {
    const m = missionsList[index]
    if (m.proposal) {
      m.description = m.proposal
      /* on décoche la case et on retire la proposition */
      m.propose   = false
      m.proposal  = null
    }
  }
  
  /* enregistrement */
  async function onSave() {
    error.value  = ''
    saving.value = true
    try {
      /* enlever les lignes vides avant d’envoyer */
      const payload = missionsList
        .map(m => ({ id: m.id, description: m.description.trim() }))
        .filter(m => m.description !== '')
  
      await journalStore.saveMissions(childId, yearId, payload)
      await journalStore.fetchMissions(childId, yearId)
  
      missionsList.splice(
        0,
        missionsList.length,
        ...journalStore.missions.map(m => ({ id: m.id, description: m.description }))
      )
    } catch (e: any) {
      error.value = e.message
    } finally {
      saving.value = false
    }
  }
  
  /* navigation */
  function onBack() {
    router.back()
  }
  </script>
  
  <style scoped>
  .bg-blue-600  { background-color:#2563eb; }
  .bg-blue-700  { background-color:#1d4ed8; }
  .bg-green-600 { background-color:#16a34a; }
  .bg-green-700 { background-color:#15803d; }
  .bg-red-600   { background-color:#dc2626; }
  .bg-red-700   { background-color:#b91c1c; }
  .form-checkbox{ width:1rem; height:1rem; }
  .disabled\:opacity-50:disabled{ opacity:0.5; }
  </style>
  