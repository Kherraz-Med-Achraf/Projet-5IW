<template>
    <div class="p-4 max-w-3xl mx-auto">
      <h1 class="text-2xl font-bold mb-4">Appel des présences</h1>
  
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
            <th class="px-4 py-2 text-center">Présent</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="child in sheet?.records" :key="child.id" class="border-t">
            <td class="px-4 py-2">{{ child.child.lastName }}</td>
            <td class="px-4 py-2">{{ child.child.firstName }}</td>
            <td class="px-4 py-2 text-center">
              <input type="checkbox" :value="child.child.id" v-model="presentChildIds" />
            </td>
          </tr>
        </tbody>
      </table>
  
      <button
        class="mt-4 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        :disabled="submitting"
        @click="onValidate"
      >
        {{ submitting ? 'Validation en cours...' : 'Valider l’appel' }}
      </button>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, computed, onMounted } from 'vue';
  import { usePresenceStore } from '@/stores/presenceStore';
  import { useNotificationStore } from '@/stores/notificationStore';
  
  const store = usePresenceStore();
  const notify = useNotificationStore();
  
  const date = ref(store.date);
  const sheet = computed(() => store.sheet);
  const presentChildIds = ref<number[]>([]);
  const loading = computed(() => store.loading);
  const submitting = ref(false);
  
  function onDateChange() {
    store.setDate(date.value);
    store.fetchSheet();
  }
  
  async function onValidate() {
    if (!sheet.value) return;
    if (!confirm('Une fois validé, vous ne pourrez plus modifier la feuille. Continuer ?')) {
      return;
    }
    submitting.value = true;
    try {
      await store.validateSheet();
      notify.showNotification('Appel validé avec succès', 'success');
    } catch (err: any) {
      notify.showNotification(err.message || 'Erreur lors de la validation', 'error');
    } finally {
      submitting.value = false;
    }
  }
  
  onMounted(async () => {
    await store.fetchSheet();
    presentChildIds.value = store.presentChildIds;
  });
  </script>
  
  <style scoped>
  /* Styles spécifiques si nécessaire */
  </style>
  