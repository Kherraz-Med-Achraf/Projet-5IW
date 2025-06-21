<template>
  <div class="p-4 max-w-4xl mx-auto space-y-6">
    <h1 class="text-2xl font-bold">Gestion des absences / retards</h1>

    <!-- Sélecteur de date -->
    <div class="flex items-center gap-2">
      <label for="date-picker" class="font-medium">Date :</label>
      <input
        id="date-picker"
        type="date"
        v-model="date"
        @change="onDateChange"
        class="border rounded px-2 py-1"
      />
    </div>

    <!-- Loader -->
    <div v-if="loading" class="text-center py-8">Chargement…</div>

    <!-- Statistiques -->
    <div v-else class="grid grid-cols-3 gap-4 text-center">
      <div class="bg-green-100 p-4 rounded">
        <p class="text-lg font-semibold">{{ presentCount }}</p>
        <p class="text-sm text-gray-600">Présents</p>
      </div>
      <div class="bg-red-100 p-4 rounded">
        <p class="text-lg font-semibold">{{ absentCount }}</p>
        <p class="text-sm text-gray-600">Absents non justifiés</p>
      </div>
      <div class="bg-yellow-100 p-4 rounded">
        <p class="text-lg font-semibold">{{ justifiedCount }}</p>
        <p class="text-sm text-gray-600">Absences justifiées</p>
      </div>
    </div>

    <!-- Tableau des absences pendantes -->
    <table v-if="pendingRecords.length" class="w-full table-auto border-collapse">
      <thead class="bg-gray-100">
        <tr>
          <th class="px-4 py-2 text-left">Nom</th>
          <th class="px-4 py-2 text-left">Prénom</th>
          <th class="px-4 py-2 text-left">Statut</th>
          <th class="px-4 py-2 text-left">Téléphone</th>
          <th class="px-4 py-2 text-center">Action</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="rec in pendingRecords" :key="rec.id" class="border-t">
          <td class="px-4 py-2">{{ rec.child.lastName }}</td>
          <td class="px-4 py-2">{{ rec.child.firstName }}</td>
          <td class="px-4 py-2">Absent</td>
          <td class="px-4 py-2">{{ rec.child.parent?.phone || 'N/A' }}</td>
          <td class="px-4 py-2 text-center">
            <button
              class="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
              @click="openModal(rec)"
            >
              Justifier
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-else class="text-center text-gray-500">
      Toutes les absences sont déjà justifiées.
    </div>

    <!-- Modal de justification -->
    <JustifyModal
      v-if="modalOpen"
      :record="modalRecord"
      @close="closeModal"
    >
      <template #header>
        <h3 class="text-lg font-semibold">
          Justifier {{ modalRecord.child.lastName }} {{ modalRecord.child.firstName }}
        </h3>
      </template>
      <div class="mt-4 space-y-4">
        <div>
          <label class="block mb-1 font-medium">Date de justificatif</label>
          <input
            type="date"
            v-model="form.justificationDate"
            :max="today"
            class="border rounded px-2 py-1 w-full"
          />
        </div>
        <div>
          <label class="block mb-1 font-medium">Motif / Commentaire</label>
          <input
            type="text"
            v-model="form.motif"
            placeholder="Ex. certificat médical"
            class="border rounded px-2 py-1 w-full"
          />
        </div>
        <div>
          <label class="block mb-1 font-medium">Upload justificatif (facultatif)</label>
          <input type="file" @change="onFileChange" />
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end space-x-2 mt-4">
          <button
            class="px-4 py-2 bg-gray-300 rounded"
            @click="closeModal"
          >
            Annuler
          </button>
          <button
            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            :disabled="submitting"
            @click="submitJustification"
          >
            {{ submitting ? 'Enregistrement...' : 'Enregistrer' }}
          </button>
        </div>
      </template>
    </JustifyModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { usePresenceStore } from '@/stores/presenceStore';
import { useNotificationStore } from '@/stores/notificationStore';
import JustifyModal from '@/components/presence/JustifyModal.vue';

const store = usePresenceStore();
const notify = useNotificationStore();

const date = ref(store.date);
const loading = computed(() => store.loading);
const today = new Date().toISOString().substring(0, 10);

// Filtrage des enregistrements
const presentRecords   = computed(() => store.sheet?.records.filter(r => r.present) || []);
const justifiedRecords = computed(() => store.sheet?.records.filter(r => !r.present && r.justification) || []);
const pendingRecords   = computed(() => store.sheet?.records.filter(r => !r.present && !r.justification) || []);

// Compteurs dynamiques
const presentCount   = computed(() => presentRecords.value.length);
const justifiedCount = computed(() => justifiedRecords.value.length);
const absentCount    = computed(() => pendingRecords.value.length);

const modalOpen = ref(false);
const modalRecord = ref<any>(null);
const form = ref({ justificationDate: today, motif: '' });
let file: File | null = null;
const submitting = ref(false);

function onDateChange() {
  store.setDate(date.value);
  store.fetchSheet();
}

function openModal(record: any) {
  modalRecord.value = record;
  form.value = { justificationDate: today, motif: '' };
  file = null;
  modalOpen.value = true;
}

function closeModal() {
  modalOpen.value = false;
}

function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement;
  file = target.files?.[0] ?? null;
}

async function submitJustification() {
  if (!modalRecord.value) return;
  submitting.value = true;
  try {
    await store.justifyRecord(
      modalRecord.value.id,
      form.value.justificationDate,
      form.value.motif,
      file || undefined
    );
    notify.showNotification('Justification enregistrée', 'success');
    closeModal();
  } catch (e: any) {
    notify.showNotification(e.message || 'Erreur lors de la justification', 'error');
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  store.fetchSheet();
  date.value = store.date;
});

// Synchronisation si la date change ailleurs
watch(() => store.date, d => date.value = d);
</script>

<style scoped>
/* Styles optionnels */
</style>
