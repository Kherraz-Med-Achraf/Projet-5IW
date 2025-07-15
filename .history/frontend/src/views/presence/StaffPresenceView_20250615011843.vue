<template>
  <div class="p-4 max-w-3xl mx-auto">
    <h1 class="text-2xl font-bold mb-4">
      Appels des présences – {{ todayLabel }}
    </h1>

    <!-- Loader -->
    <div v-if="loading" class="text-center py-8">Chargement…</div>

    <!-- Message + tableau si déjà validé -->
    <div v-else-if="sheet?.validatedAtStaff" class="mb-6">
      <div class="p-4 bg-green-100 rounded mb-4">
        <p>
          L’appel a déjà été validé par :
          <strong>{{ staffName }}</strong>
        </p>
        <p class="text-sm text-gray-600">
          Validé le {{ formatDate(sheet.validatedAtStaff) }}
        </p>
      </div>
      <!-- Tableau des présences/absences en lecture seule -->
      <table class="w-full table-auto border-collapse mb-4">
        <thead>
          <tr class="bg-gray-100">
            <th class="px-4 py-2 text-left">Nom</th>
            <th class="px-4 py-2 text-left">Prénom</th>
            <th class="px-4 py-2 text-center">Présent</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="rec in sheet.records" :key="rec.id" class="border-t">
            <td class="px-4 py-2">{{ rec.child.lastName }}</td>
            <td class="px-4 py-2">{{ rec.child.firstName }}</td>
            <td class="px-4 py-2 text-center">
              {{ rec.present ? 'Oui' : 'Non' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Phase STAFF : checkboxes + bouton -->
    <div v-else>
      <table
        class="w-full table-auto border-collapse mb-4"
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
          <tr v-for="rec in sheet.records" :key="rec.id" class="border-t">
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

      <button
        class="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        :disabled="submitting || !sheet"
        @click="onValidate"
      >
        {{ submitting ? 'Validation en cours…' : 'Valider l’appel' }}
      </button>
    </div>
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
    day   : '2-digit',
    month : 'long',
    year  : 'numeric',
  }),
);

/* state */
const sheet      = computed(() => store.sheet);
const loading    = computed(() => store.loading);
const submitting = ref(false);

/* nom complet du staff qui a validé */
const staffName = computed(() => {
  const user = sheet.value?.staff;
  const prof = user?.staffProfile;
  return prof
    ? `${prof.firstName} ${prof.lastName}`
    : user
      ? user.email
      : '';
});

/* formatage date de validation */
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day   : '2-digit',
    month : '2-digit',
    year  : 'numeric',
    hour  : '2-digit',
    minute: '2-digit',
  });
}

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
