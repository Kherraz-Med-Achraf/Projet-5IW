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
        <div class="mb-6">
          <label for="contenu" class="block font-medium mb-1">Observations :</label>
          <textarea
            id="contenu"
            v-model="form.contenu"
            :disabled="isSubmitted"
            rows="5"
            class="w-full border px-2 py-1 rounded"
          ></textarea>
  
          <!-- IA helper pour observations -->
          <div v-if="!isSubmitted" class="mt-1 flex items-center space-x-2">
            <input
              type="checkbox"
              id="obs-ai"
              v-model="obsPropose"
              @change="onProposeObservation"
              class="form-checkbox"
            />
            <label for="obs-ai" class="text-sm">Proposer une amélioration via IA</label>
            <span v-if="obsGenerating" class="text-xs text-gray-500">(génération…)</span>
          </div>
  
          <div
            v-if="obsProposal && !obsGenerating"
            class="mt-2 bg-gray-100 p-3 rounded border text-sm"
          >
            <p class="mb-2 text-gray-700">
              <strong>Proposition :</strong> {{ obsProposal }}
            </p>
            <button
              @click="acceptObsProposal"
              class="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-xs"
            >
              Utiliser cette proposition
            </button>
          </div>
        </div>
  
        <!-- Progression sur chaque mission -->
        <div v-if="missions.length" class="mb-6">
          <h2 class="text-xl font-medium mb-2">Progression sur les missions :</h2>
          <div v-for="m in missions" :key="m.id" class="mb-4">
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
  
            <!-- IA helper pour progression -->
            <div v-if="!isSubmitted" class="mt-1 flex items-center space-x-2">
              <input
                type="checkbox"
                :id="`prog-ai-${m.id}`"
                v-model="m.aiPropose"
                @change="() => onProposeProgress(m)"
                class="form-checkbox"
              />
              <label :for="`prog-ai-${m.id}`" class="text-sm">Amélioration IA</label>
              <span v-if="m.aiGenerating" class="text-xs text-gray-500">(génération…)</span>
            </div>
  
            <div
              v-if="m.aiProposal && !m.aiGenerating"
              class="mt-1 bg-gray-100 p-2 rounded border text-xs"
            >
              <p class="mb-1 text-gray-700">
                <strong>Proposition :</strong> {{ m.aiProposal }}
              </p>
              <button
                @click="acceptMissionProposal(m)"
                class="bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
              >
                Utiliser
              </button>
            </div>
          </div>
        </div>
  
        <!-- Upload et liste des pièces jointes -->
        <div class="mb-4">
          <label class="block font-medium mb-1">Pièces jointes :</label>
          <div v-if="attachments.length === 0" class="text-gray-500 mb-2">
            Aucune pièce jointe.
          </div>
          <ul class="list-disc list-inside mb-2">
            <li v-for="att in attachments" :key="att.id" class="flex items-center justify-between py-1">
              <div v-if="!isSubmitted" class="flex items-center space-x-2">
                <input
                  type="checkbox"
                  :id="'cb-'+att.id"
                  :value="att.id"
                  v-model="toDelete"
                  class="form-checkbox"
                />
                <label :for="'cb-'+att.id" class="underline text-blue-600">
                  <a :href="`http://localhost:3000/uploads/${att.filename}`" target="_blank">
                    {{ att.filepath }}
                  </a>
                </label>
              </div>
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
          <button
            v-if="attachments.length > 0 && !isSubmitted"
            :disabled="toDelete.length === 0"
            @click="deleteSelected"
            class="mb-2 bg-red-600 text-white px-4 py-1 rounded hover:bg-red-700 disabled:opacity-50"
          >
            Supprimer la/les sélectionnée(s)
          </button>
          <div v-if="!isSubmitted && attachments.length < 3" class="mt-2">
            <input type="file" @change="onFileChange" />
            <button
              :disabled="!selectedFile"
              @click="onUpload"
              class="mt-2 bg-blue-500 text-white px-4 py-1 rounded disabled:opacity-50"
            >
              Upload
            </button>
            <p class="text-sm text-gray-500 mt-1">(Vous pouvez au maximum avoir 3 pièces jointes)</p>
          </div>
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
            :disabled="!allMissionsFilled"
            @click="showSubmitModal = true"
            class="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            Soumettre
          </button>
          <p v-if="!isSubmitted && !allMissionsFilled" class="text-red-600 text-sm mt-1">
            Les missions annuelles n'ont pas été remplies, veuillez les remplir avant de remplir le journal de bord.
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
    </div>
  </template>
  
  
  

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
