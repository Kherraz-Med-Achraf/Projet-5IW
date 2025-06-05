<!-- src/views/journal/JournalHomeParent.vue -->
<template>
    <div class="p-4 max-w-4xl mx-auto">
      <h1 class="text-3xl font-semibold mb-6">Journal de bord des enfants</h1>
  
      <!-- Sélection de l’enfant -->
      <div class="mb-4">
        <label for="child-select" class="block font-medium mb-1">Sélectionnez un enfant :</label>
        <select
          id="child-select"
          v-model="selectedChildId"
          @change="onChildChange"
          class="w-full border px-2 py-1 rounded"
        >
          <option disabled value="">-- Choisir un enfant --</option>
          <option
            v-for="child in children"
            :key="child.id"
            :value="child.id"
          >
            {{ child.firstName }} {{ child.lastName }}
          </option>
        </select>
      </div>
  
      <!-- Sélection de l’année scolaire -->
      <div v-if="selectedChildId" class="mb-6">
        <label for="year-select" class="block font-medium mb-1">Sélectionnez une année scolaire :</label>
        <select
          id="year-select"
          v-model="selectedYearId"
          @change="onYearChange"
          class="w-full border px-2 py-1 rounded"
        >
          <option disabled value="">-- Choisir une année --</option>
          <option
            v-for="year in academicYears"
            :key="year.id"
            :value="year.id"
          >
            {{ year.label }}
          </option>
        </select>
      </div>
  
      <!-- Grille des mois -->
      <div v-if="selectedChildId && selectedYearId" class="grid grid-cols-3 gap-4">
        <div
          v-for="monthNum in 12"
          :key="monthNum"
          class="border rounded-lg p-4 flex flex-col items-center justify-between"
        >
          <span class="font-medium">{{ monthNames[monthNum - 1] }}</span>
          <div class="mt-2">
            <template v-if="journalExists(monthNum)">
              <button
                @click="viewReport(monthNum)"
                class="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
              >
                Rapport dispo
              </button>
            </template>
            <template v-else>
              <span class="text-gray-500">Non disponible</span>
            </template>
          </div>
        </div>
      </div>
  
      <!-- Message si aucun enfant ou année non sélectionnée -->
      <div v-if="!selectedChildId || !selectedYearId" class="text-gray-500 mt-6">
        Veuillez sélectionner un enfant et une année scolaire pour afficher les rapports.
      </div>
    </div>
  </template>
  
  <script lang="ts" setup>
  import { ref, computed, onMounted } from 'vue'
  import { useChildStore } from '@/stores/childStore'
  import { useJournalStore } from '@/stores/journalStore'
  import { useAuthStore } from '@/stores/auth'
  import { useRouter } from 'vue-router'
  
  const childStore = useChildStore()
  const journalStore = useJournalStore()
  const authStore = useAuthStore()
  const router = useRouter()
  
  // Listes et sélections réactives
  const children = ref<Array<{ id: number; firstName: string; lastName: string }>>([])
  const academicYears = ref<Array<{ id: number; label: string }>>([])
  const selectedChildId = ref<number | ''>('')
  const selectedYearId = ref<number | ''>('')
  
  // Journaux récupérés pour l’enfant + année
  const journals = computed(() => journalStore.journals)
  
  // Tableau des noms de mois
  const monthNames = [
    'Janvier','Février','Mars','Avril','Mai','Juin',
    'Juillet','Août','Septembre','Octobre','Novembre','Décembre'
  ]
  
  // Au montage, charger la liste des enfants du parent et des années
  onMounted(async () => {
    // Récupération des enfants du parent connecté
    if (!childStore.referentChildren.length) {
      await childStore.fetchReferentChildren()
    }
    children.value = childStore.referentChildren.map(c => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
    }))
  
    // Récupération des années scolaires
    if (!journalStore.academicYears.length) {
      await journalStore.fetchAcademicYears()
    }
    academicYears.value = journalStore.academicYears.map(y => ({
      id: y.id,
      label: y.label,
    }))
  })
  
  // Quand l’enfant change, on efface l’année sélectionnée et la grille
  function onChildChange() {
    selectedYearId.value = ''
    journals.value.length = 0
  }
  
  // Quand l’année change, on va chercher les journaux correspondants
  async function onYearChange() {
    if (selectedChildId.value && selectedYearId.value) {
      await journalStore.fetchJournals(selectedChildId.value, selectedYearId.value)
    }
  }
  
  // Vérifie si un journal existe ET est soumis pour un mois donné
  function journalExists(month: number): boolean {
    return journals.value.some(j => j.month === month && j.isSubmitted)
  }
  
  // Redirection vers la page de consultation du journal de bord
  function viewReport(month: number) {
    router.push({
      name: 'JournalMonth',
      params: {
        childId: selectedChildId,
        yearId: selectedYearId,
        month: month
      }
    })
  }
  </script>
  
  <style scoped>
  /* Ajustements mineurs */
  .border {
    border-color: #e5e7eb;
  }
  .hover\:bg-green-700:hover {
    background-color: #065f46;
  }
  </style>
