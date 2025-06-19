<template>
    <div class="p-4 max-w-3xl mx-auto">
      <h1 class="text-2xl font-bold mb-4">Appel des présences</h1>
  
      <!-- Sélecteur de date -->
      <div class="mb-4 flex items-center">
        <label for="date-picker" class="mr-2">Date :</label>
        <input
          id="date-picker"
          type="date"
          v-model="localDate"
          @change="onDateChange"
          class="border rounded px-2 py-1"
        />
      </div>
  
      <!-- Loader -->
      <div v-if="loading" class="text-center py-8">Chargement...</div>
  
      <!-- Table des enfants -->
      <table
        v-else
        class="w-full table-auto border-collapse"
        v-if="sheet && sheet.records.length"
      >
        <thead>
          <tr class="bg-gray-100">
            <th class="px-4 py-2 text-left">Nom</th>
            <th class="px-4 py-2 text-left">Prénom</th>
            <th class="px-4 py-2 text-center">Présent</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="rec in sheet.records"
            :key="rec.id"
            class="border-t"
          >
            <td class="px-4 py-2">{{ rec.child.lastName }}</td>
            <td class="px-4 py-2">{{ rec.child.firstName }}</td>
            <td class="px-4 py-2 text-center">
              <!-- lie directement au store -->
              <input
                type="checkbox"
                :value="rec.childId"
                v-model="store.presentChildIds"
              />
            </td>
          </tr>
        </tbody>
      </table>
  
      <!-- Bouton de validation -->
      <button
        class="mt-4 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        :disabled="submitting || !sheet"
        @click="onValidate"
      >
        {{ submitting ? 'Validation en cours…' : 'Valider l’appel' }}
      </button>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, computed, onMounted } from 'vue';
  import { usePresenceStore } from '@/stores/presenceStore';
  import { useNotificationStore } from '@/stores/notificationStore';
  
  /* stores */
  const store  = usePresenceStore();
  const notify = useNotificationStore();
  
  /* réactifs */
  const localDate   = ref(store.date);
  const sheet       = computed(() => store.sheet);
  const loading     = computed(() => store.loading);
  const submitting  = ref(false);
  
  /* changement de date */
  function onDateChange() {
    store.setDate(localDate.value);
    store.fetchSheet();
  }
  
  /* validation de la feuille */
  async function onValidate() {
    if (!sheet.value) return;
    if (
      !confirm(
        'Une fois validé, vous ne pourrez plus modifier la feuille. Continuer ?',
      )
    )
      return;
  
    submitting.value = true;
    try {
      await store.validateSheet();
      notify.showNotification('Appel validé avec succès', 'success');
    } catch (err: any) {
      notify.showNotification(
        err?.message || 'Erreur lors de la validation',
        'error',
      );
    } finally {
      submitting.value = false;
    }
  }
  
  /* chargement initial */
  onMounted(store.fetchSheet);
  </script>
  
  <style scoped>
  /* styles supplémentaires au besoin */
  </style>
  