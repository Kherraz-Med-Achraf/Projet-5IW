<!-- src/views/journal/JournalMissions.vue -->
<template>
    <div class="p-4 max-w-3xl mx-auto">
      <h1 class="text-2xl font-semibold mb-4">
        Missions annuelles – {{ childName }} – {{ yearLabel }}
      </h1>
  
      <div v-if="!loaded" class="text-center text-gray-500">Chargement…</div>
  
      <div v-else>
        <!-- Liste des missions existantes / édition -->
        <div
          v-for="(mission, index) in missionsList"
          :key="mission.id ?? index"
          class="mb-4 flex items-center space-x-2"
        >
          <input
            v-model="mission.description"
            :placeholder="`Mission ${index + 1}`"
            class="flex-1 border px-2 py-1 rounded"
            type="text"
          />
          <button
            @click="removeMission(index)"
            class="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
          >
            Supprimer
          </button>
        </div>
  
        <!-- Bouton pour ajouter une nouvelle mission -->
        <button
          @click="addMission"
          class="mb-6 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Ajouter une mission
        </button>
  
        <!-- Boutons Enregistrer / Retour -->
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
  
  interface Mission {
    id?: number
    description: string
  }
  
  /* liste éditable */
  const missionsList = reactive<Mission[]>([])
  
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
        ...journalStore.missions.map(m => ({ id: m.id, description: m.description }))
      )
    } catch (e: any) {
      error.value = e.message
    } finally {
      loaded.value = true
    }
  })
  
  /* ajout / suppression */
  function addMission() {
    missionsList.push({ description: '' })
  }
  function removeMission(index: number) {
    missionsList.splice(index, 1)
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
  
      /* resynchronise la liste locale avec les IDs fraîchement créés */
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
  .bg-blue-600 { background-color: #2563eb; }
  .bg-blue-700 { background-color: #1d4ed8; }
  .bg-green-600 { background-color: #16a34a; }
  .bg-green-700 { background-color: #15803d; }
  .bg-red-600 { background-color: #dc2626; }
  .bg-red-700 { background-color: #b91c1c; }
  .disabled\:opacity-50:disabled { opacity: 0.5; }
  </style>
  