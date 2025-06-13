<!-- src/views/journal/JournalMissions.vue -->
<template>
    <div class="p-4 max-w-3xl mx-auto">
      <h1 class="text-2xl font-semibold mb-4">
        Missions annuelles –
        {{ childName }} –
        {{ yearLabel }}
      </h1>
  
      <div v-if="!loaded" class="text-center text-gray-500">Chargement…</div>
  
      <div v-else>
        <!-- Liste des missions existantes / édition -->
        <div v-for="(mission, index) in missionsList" :key="mission.id ?? index" class="mb-4 flex items-center space-x-2">
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
  import { useAuthStore } from '@/stores/auth'
  
  const journalStore = useJournalStore()
  const childStore = useChildStore()
  const authStore = useAuthStore()
  
  const route = useRoute()
  const router = useRouter()
  
  const childId = Number(route.params.childId)
  const yearId = Number(route.params.yearId)
  
  const loaded = ref(false)
  const saving = ref(false)
  const error = ref<string>('')
  
  interface Mission {
    id?: number
    description: string
  }
  
  // Liste éditable des missions pour l’année
  const missionsList = reactive<Mission[]>([])
  
  const childName = computed(() => {
    const c = childStore.referentChildren.find(c => c.id === childId)
    return c ? `${c.firstName} ${c.lastName}` : ''
  })
  const yearLabel = computed(() => {
    const y = journalStore.academicYears.find(y => y.id === yearId)
    return y?.label || ''
  })
  
  onMounted(async () => {
    try {
      // Charger missions existantes pour cet enfant + année
      await journalStore.fetchMissions(childId, yearId)
      // Copier dans missionsList
      missionsList.splice(0, missionsList.length, 
        ...journalStore.missions.map(m => ({ id: m.id, description: m.description }))
      )
    } catch (e: any) {
      error.value = e.message
    } finally {
      loaded.value = true
    }
  })
  
  /**
   * Ajoute une nouvelle mission vide
   */
  function addMission() {
    missionsList.push({ description: '' })
  }
  
  /**
   * Supprime une mission à l’index donné
   */
  function removeMission(index: number) {
    missionsList.splice(index, 1)
  }
  
  /**
   * Enregistre les missions (création ou mise à jour)
   */
  async function onSave() {
    error.value = ''
    saving.value = true
    try {
      // Préparer payload : tableau de descriptions (et id si existant)
      const payload = missionsList.map(m => ({
        id: m.id,
        description: m.description.trim(),
      }))
      // Appeler l’action du store
      await journalStore.saveMissions(childId, yearId, payload)
      // Récupérer à nouveau pour s’assurer de l’ID
      await journalStore.fetchMissions(childId, yearId)
      missionsList.splice(0, missionsList.length,
        ...journalStore.missions.map(m => ({ id: m.id, description: m.description }))
      )
    } catch (e: any) {
      error.value = e.message
    } finally {
      saving.value = false
    }
  }
  
  /**
   * Retour à la page principale du journal
   */
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
  .disabled\:opacity-50:disabled {
    opacity: 0.5;
  }
  </style>
  