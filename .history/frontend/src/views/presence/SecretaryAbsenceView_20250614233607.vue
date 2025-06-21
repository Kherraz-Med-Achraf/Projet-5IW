<template>
    <div class="p-4 max-w-4xl mx-auto">
      <h1 class="text-2xl font-bold mb-4">Gestion des absences / retards</h1>
  
      <div class="mb-4 flex items-center">
        <label for="date-picker" class="mr-2">Date :</label>
        <input
          id="date-picker"
          type="date"
          v-model="date"
          @change="onDateChange"
          class="border rounded px-2 py-1"
        />
      </div>
  
      <div v-if="loading" class="text-center py-8">Chargement...</div>
  
      <table v-else class="w-full table-auto border-collapse">
        <thead>
          <tr class="bg-gray-100">
            <th class="px-4 py-2 text-left">Nom</th>
            <th class="px-4 py-2 text-left">Prénom</th>
            <th class="px-4 py-2 text-left">Statut</th>
            <th class="px-4 py-2 text-left">Téléphone</th>
            <th class="px-4 py-2 text-center">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="record in pendingRecords"
            :key="record.id"
            class="border-t"
          >
            <td class="px-4 py-2">{{ record.child.lastName }}</td>
            <td class="px-4 py-2">{{ record.child.firstName }}</td>
            <td class="px-4 py-2">Absent</td>
            <td class="px-4 py-2">{{ record.child.parent?.phone || 'N/A' }}</td>
            <td class="px-4 py-2 text-center">
              <button
                class="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                @click="openModal(record)"
              >Justifier</button>
            </td>
          </tr>
        </tbody>
      </table>
  
      <Modal v-if="modalOpen" @close="closeModal">
        <template #header>
          <h3 class="text-lg font-semibold">Justifier 
            {{ modalRecord.child.lastName }} {{ modalRecord.child.firstName }}
          </h3>
        </template>
        <div class="mt-2">
          <label class="block mb-1">Date de justificatif</label>
          <input
            type="date"
            v-model="form.justificationDate"
            :max="today"
            class="border rounded px-2 py-1 w-full"
          />
        </div>
        <div class="mt-2">
          <label class="block mb-1">Motif / Commentaire</label>
          <input
            type="text"
            v-model="form.motif"
            placeholder="Ex. certificat médical"
            class="border rounded px-2 py-1 w-full"
          />
        </div>
        <div class="mt-2">
          <label class="block mb-1">Upload justificatif (facultatif)</label>
          <input type="file" @change="onFileChange" />
        </div>
        <div class="mt-4 text-right">
          <button
            class="px-4 py-2 bg-gray-300 rounded mr-2"
            @click="closeModal"
          >Annuler</button>
          <button
            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            :disabled="submitting"
            @click="submitJustification"
          >
            {{ submitting ? 'Enregistrement...' : 'Enregistrer' }}
          </button>
        </div>
      </Modal>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, computed, onMounted } from 'vue';
  import { usePresenceStore } from '@/stores/presenceStore';
  import { useNotificationStore } from '@/stores/notificationStore';
  
  const store = usePresenceStore();
  const notify = useNotificationStore();
  
  const date = ref(store.date);
  const loading = computed(() => store.loading);
  const today = new Date().toISOString().substr(0, 10);
  
  const pendingRecords = computed(() =>
    store.sheet?.records.filter(r => !r.present && !r.justification) || []
  );
  
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
    if (target.files && target.files.length) {
      file = target.files[0];
    }
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
  });
  </script>
  