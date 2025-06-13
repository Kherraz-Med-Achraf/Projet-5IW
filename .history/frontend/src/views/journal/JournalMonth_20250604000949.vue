<!-- src/views/JournalMonth.vue -->
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
  
          <!-- Liste des pièces avec case à cocher -->
          <ul class="list-disc list-inside mb-2">
            <li
              v-for="att in attachments"
              :key="att.id"
              class="flex items-center justify-between py-1"
            >
              <div class="flex items-center space-x-2">
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
                  <a :href="`http://localhost:3000/${att.filepath}`" target="_blank">
                    {{ att.filename }}
                  </a>
                </label>
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
            @click="onSubmit"
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
  const month = Number(route.params.month)
  
  const loaded = ref(false)
  const error = ref<string>('')
  
  const form = reactive({
    contenu: '',
    progressionMissions: {} as Record<number, string>,
  })
  
  const selectedFile = ref<File | null>(null)
  const existingJournal = ref<any>(null)
  const missions = ref<Array<any>>([])
  const attachments = ref<Array<any>>([])
  
  // Tableau des IDs sélectionnés pour suppression
  const toDelete = ref<number[]>([])
  
  const isSubmitted = ref(false)
  const isDraft = ref(false)
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
      // 1) Récupérer missions
      await journalStore.fetchMissions(childId, yearId)
      missions.value = journalStore.missions
  
      // 2) Récupérer éventuellement le journal existant
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
  
  /**
   * Enregistrer (brouillon) – création ou mise à jour
   */
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
  
  /**
   * Soumettre définitivement
   */
  async function onSubmit() {
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
  
  /**
   * Réouvrir (ADMIN only)
   */
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
  
  /**
   * Lorsqu’on sélectionne un fichier dans l’input
   */
  function onFileChange(e: Event) {
    const input = e.target as HTMLInputElement
    if (input.files?.length) {
      selectedFile.value = input.files[0]
    }
  }
  
  /**
   * Upload d’une nouvelle pièce jointe (tant qu’on n’a pas 3 pièces jointes)
   */
  async function onUpload() {
    if (!selectedFile.value || !existingJournal.value) return
    error.value = ''
    try {
      const newAtt = await journalStore.uploadAttachment(existingJournal.value.id, selectedFile.value)
      attachments.value.push(newAtt)
      selectedFile.value = null
    } catch (e: any) {
      error.value = e.message
    }
  }
  
  /**
   * Supprime une ou plusieurs pièces jointes cochées
   */
  async function deleteSelected() {
    if (toDelete.value.length === 0) return
    error.value = ''
    try {
      // Pour chaque ID sélectionné, on appelle deleteAttachment puis on met à jour le tableau local
      for (const attId of toDelete.value) {
        await journalStore.deleteAttachment(attId)
        attachments.value = attachments.value.filter(a => a.id !== attId)
      }
      // Vider la sélection
      toDelete.value = []
    } catch (e: any) {
      error.value = e.message
    }
  }
  
  /**
   * Bouton “Retour”
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
  .bg-yellow-500 { background-color: #eab308; }
  .bg-yellow-600 { background-color: #ca8a04; }
  /* Form-checkbox natif Tailwind */
  .form-checkbox {
    width: 1rem;
    height: 1rem;
  }
  /* Désactive le focus/outline blanc sur les cellules si besoin */
  .month-cell:focus,
  .month-cell::selection {
    background-color: transparent !important;
    outline: none !important;
    color: white; /* Assure que le texte reste blanc */
  }
  </style>
  