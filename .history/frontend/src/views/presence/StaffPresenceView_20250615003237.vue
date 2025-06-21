<template>
    <div class="p-4 max-w-3xl mx-auto">
      <h1 class="text-2xl font-bold mb-4">Appel s – {{ todayLabel }}</h1>
  
      <!-- Loader -->
      <div v-if="loading" class="text-center py-8">Chargement…</div>
  
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
            <th class="px-4 py-2 text-center">Présent</th>appel 
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
              <input
                type="checkbox"
                :value="rec.childId"
                v-model="store.presentChildIds"
              />
            </td>
          </tr>
        </tbody>
      </table>
  a
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
  import { computed, ref, onMounted } from 'vue';
  import { usePresenceStore } from '@/stores/presenceStore';
  import { useNotificationStore } from '@/stores/notificationStore';
  
  /* stores */
  const store  = usePresenceStore();
  const notify = useNotificationStore();
  
  /* date du jour "YYYY-MM-DD" et label FR */
  const todayIso   = new Date().toISOString().substring(0, 10);
  const todayLabel = computed(() =>
    new Date(todayIso).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }),
  );
  
  /* computed / refs */
  const sheet      = computed(() => store.sheet);
  const loading    = computed(() => store.loading);
  const submitting = ref(false);
  
  /* validation */
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
      notify.showNotification(err?.message || 'Erreur lors de la validation', 'error');
    } finally {
      submitting.value = false;
    }
  }
  
  /* chargement initial : on force la date du jour */
  onMounted(async () => {
    store.setDate(todayIso);
    await store.fetchSheet();
  });
  </script>
  
  <style scoped>
  /* styles optionnels */
  </style>
  