<!-- src/views/JournalHome.vue -->
<template>
    <div class="p-4 max-w-4xl mx-auto">
      <h1 class="text-2xl font-semibold mb-4">Journal de bord</h1>
  
      <!-- 1) Choix de l'enfant référé -->
      <div class="mb-6">
        <label for="child-select" class="block font-medium mb-1">Choisissez un enfant :</label>
        <select
          id="child-select"
          v-model="selectedChildId"
          @change="onChildChange"
          class="border rounded px-2 py-1 w-full"
        >
          <option value="" disabled>-- Sélectionner --</option>
          <option
            v-for="child in referentChildren"
            :key="child.id"
            :value="child.id"
          >
            {{ child.firstName }} {{ child.lastName }}
          </option>
        </select>
      </div>
  
      <!-- 2) Choix de l'année scolaire -->
      <div v-if="selectedChildId" class="mb-6">
        <label for="year-select" class="block font-medium mb-1">Année scolaire :</label>
        <select
          id="year-select"
          v-model="selectedYearId"
          @change="onYearChange"
          class="border rounded px-2 py-1 w-full"
        >
          <option value="" disabled>-- Sélectionner --</option>
          <option
            v-for="year in academicYears"
            :key="year.id"
            :value="year.id"
          >
            {{ year.label }}
          </option>
        </select>
      </div>
  
      <!-- 3) Missions annuelles (liste à puces) -->
      <div v-if="missions.length && selectedYearId" class="mb-6">
        <h2 class="text-xl font-medium mb-2">Missions de l’année :</h2>
        <ul class="list-disc list-inside">
          <li v-for="m in missions" :key="m.id">{{ m.description }}</li>
        </ul>
      </div>
  
      <!-- 4) Affichage de la grille des mois -->
      <div v-if="selectedYearId" class="mb-6">
        <h2 class="text-xl font-medium mb-2">Mois de l’année :</h2>
        <div class="grid grid-cols-3 gap-4">
          <div
            v-for="(label, index) in monthLabels"
            :key="index"
            tabindex="-1"
            :class="monthClass(index + 1) + ' rounded month-cell'"
            @click="onMonthClick(index + 1)"
          >
            <span class="block text-center py-2">
              {{ label }}
              <!-- ✔ pour mois soumis -->
              <span
                v-if="isMonthConsultable(index + 1)"
                class="text-green-600"
              >✔</span>
              <!-- 📋 pour mois ayant déjà un brouillon (non soumis) -->
              <span
                v-else-if="hasDraft(index + 1)"
                class="text-blue-600"
              >📋</span>
              <!-- ✎ pour tous les autres mois passés/en cours sans brouillon -->
              <span
                v-else-if="isMonthEditable(index + 1)"
                class="text-blue-600"
              >✎</span>
              <!-- ✎ grisé pour mois futurs -->
              <span
                v-else
                class="text-gray-400"
              >✎</span>
            </span>
          </div>
        </div>
      </div>
  
      <!-- 5) Affichage d’une erreur éventuelle -->
      <div v-if="error" class="text-red-600 mt-4">{{ error }}</div>
    </div>
  </template>
  
  <script lang="ts" setup>
  import { ref, computed, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { useJournalStore } from '@/stores/journalStore'
  
  const journalStore = useJournalStore()
  const router = useRouter()
  
  const selectedChildId = ref<number | null>(null)
  const selectedYearId = ref<number | null>(null)
  const error = ref<string>('')
  
  const monthLabels = [
    'Janvier','Février','Mars','Avril','Mai','Juin',
    'Juillet','Août','Septembre','Octobre','Novembre','Décembre'
  ]
  
  // Lecture des données depuis le store
  const referentChildren = computed(() => journalStore.childrenRefered)
  const academicYears   = computed(() => journalStore.academicYears)
  const missions        = computed(() => journalStore.missions)
  
  /**
   * Vérifie si un brouillon (non soumis) existe pour ce mois.
   */
  function hasDraft(month: number): boolean {
    return journalStore.journals.some(
      j => j.month === month && j.isDraft && !j.isSubmitted
    )
  }
  
  /**
   * Classe CSS à appliquer à chaque mois :
   * - mois déjà soumis → bg-gray-100 (case gris clair)
   * - mois futurs       → opacity-50 cursor-not-allowed (grisé, non cliquable)
   * - autres mois (passés/en cours, non soumis) → case normale (aucune couleur)
   */
  function monthClass(month: number) {
    if (!selectedYearId.value || !selectedChildId.value) {
      // Si l'année ou l'enfant n'est pas sélectionné, on grise toute la case
      return 'cursor-not-allowed opacity-50'
    }
  
    const journals = journalStore.journals
    const found = journals.find(j => j.month === month)
    const now = Date.now()
    const yearObj = academicYears.value.find(y => y.id === selectedYearId.value)!
    // Timestamp du premier jour du mois dans l'année scolaire
    const thisMonthStart = new Date(
      new Date(yearObj.startDate).getFullYear(),
      month - 1,
      1
    ).getTime()
  
    if (found?.isSubmitted) {
      // Mois déjà soumis → gris clair
      return 'cursor-pointer bg-gray-100'
    }
    // Si mois futur → grisé et non cliquable
    if (thisMonthStart > now) {
      return 'cursor-not-allowed opacity-50'
    }
    // Sinon (passé/en cours, non soumis) → case normale
    return 'cursor-pointer'
  }
  
  /**
   * Indique si le mois est consultable (déjà soumis).
   */
  function isMonthConsultable(month: number): boolean {
    return journalStore.journals.some(j => j.month === month && j.isSubmitted)
  }
  
  /**
   * Indique si le mois est éditable :
   * - mois futurs → faux
   * - sinon, on peut toujours éditer (brouillon à créer ou modifier)
   */
  function isMonthEditable(month: number): boolean {
    const now = Date.now()
    const yearObj = academicYears.value.find(y => y.id === selectedYearId.value)!
    const thisMonthStart = new Date(
      new Date(yearObj.startDate).getFullYear(),
      month - 1,
      1
    ).getTime()
  
    // Les mois futurs ne sont pas éditables
    if (thisMonthStart > now) return false
  
    // Sinon, on retourne vrai pour tous les mois passés/en cours
    return true
  }
  
  /**
   * Lorsque l’éducateur change d’enfant, on réinitialise l’année et les données.
   */
  async function onChildChange() {
    error.value = ''
    selectedYearId.value = null
    journalStore.journals = []
    journalStore.missions = []
  }
  
  /**
   * Lorsque l’éducateur change d’année, on va chercher missions + journaux.
   */
  async function onYearChange() {
    if (!selectedChildId.value || !selectedYearId.value) return
    error.value = ''
    journalStore.missions = []
    journalStore.journals = []
    try {
      await journalStore.fetchMissions(selectedChildId.value, selectedYearId.value)
      await journalStore.fetchJournals(selectedChildId.value, selectedYearId.value)
    } catch (e: any) {
      error.value = e.message
    }
  }
  
  /**
   * Au montage, on charge :
   * 1) la liste des enfants référés
   * 2) les années scolaires
   */
  onMounted(async () => {
    try {
      await journalStore.fetchReferentChildren()
      await journalStore.fetchAcademicYears()
    } catch (e: any) {
      error.value = e.message
    }
  })
  
  /**
   * Lorsqu’on clique sur un mois, on navigue vers la page de détail.
   */
  function onMonthClick(month: number) {
    if (!selectedChildId.value || !selectedYearId.value) return
    router.push({
      name: 'JournalMonth',
      params: {
        childId: selectedChildId.value,
        yearId: selectedYearId.value,
        month,
      },
    })
  }
  </script>
  
  <style scoped>
  /* Styles de fond et curseur */
  .bg-gray-100        { background-color: #f3f3f3; }
  .opacity-50         { opacity: 0.5; }
  .cursor-not-allowed { cursor: not-allowed; }
  .cursor-pointer     { cursor: pointer; }
  
  /* On supprime tout focus/outline blanc sur les cases */
  .month-cell:focus {
    background-color: transparent !important;
    outline: none !important;
  }
  </style>
  