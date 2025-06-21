<template>
  <div class="p-4 max-w-5xl mx-auto">
    <h1 class="text-2xl font-bold mb-4">Rapport de présence</h1>

    <!-- Statut de la feuille -->
    <div v-if="sheet" class="mb-4 p-3 rounded text-white" :class="statusClass">
      {{ statusText }}
    </div>

    <!-- Sélecteur de date -->
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

    <!-- Actions d'export -->
    <div class="mb-4 space-x-2">
      <button
        @click="exportCSV"
        class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
      >
        Exporter CSV
      </button>
      <button
        @click="exportPDF"
        class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Exporter PDF
      </button>
    </div>

    <!-- KPI & Alertes -->
    <div v-if="sheet" class="mb-6 space-y-4">
      <!-- Alertes seuil -->
      <div
        v-if="attendanceRate < 90"
        class="p-3 text-white rounded bg-red-600"
      >
        ⚠️ Alerte : taux de présence inférieur à 90 % ({{ attendanceRate }} %)
      </div>
      <div
        v-if="unjustAbsenceRate > 10"
        class="p-3 text-white rounded bg-red-600"
      >
        ⚠️ Alerte : taux d’absences non justifiées > 10 % ({{ unjustAbsenceRate }} %)
      </div>

      <!-- KPI boxes -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <div class="bg-gray-100 p-4 rounded">
          <p class="font-semibold">Taux de présence</p>
          <p class="text-xl">{{ attendanceRate }} %</p>
        </div>
        <div class="bg-gray-100 p-4 rounded">
          <p class="font-semibold">Absences injustifiées</p>
          <p class="text-xl">{{ unjustAbsenceRate }} %</p>
        </div>
        <div class="bg-gray-100 p-4 rounded">
          <p class="font-semibold">Retards justifiés</p>
          <p class="text-xl">{{ justifiedLatenessRate }} %</p>
        </div>
        <div class="bg-gray-100 p-4 rounded">
          <p class="font-semibold">Ratio abs. just./injust.</p>
          <p class="text-xl">{{ absJustifiedToUnjustRatio }}</p>
        </div>
      </div>
    </div>

    <!-- Tableau -->
    <table
      v-if="sheet"
      class="w-full table-auto border-collapse"
    >
      <thead>
        <tr class="bg-gray-100">
          <th class="px-4 py-2 text-left">Nom</th>
          <th class="px-4 py-2 text-left">Prénom</th>
          <th class="px-4 py-2 text-center">Présent</th>
          <th class="px-4 py-2 text-left">Justification</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="record in sheet.records"
          :key="record.id"
          class="border-t"
        >
          <td class="px-4 py-2">{{ record.child.lastName }}</td>
          <td class="px-4 py-2">{{ record.child.firstName }}</td>
          <td class="px-4 py-2 text-center">
            {{ record.present ? 'Oui' : 'Non' }}
          </td>
          <td class="px-4 py-2">
            <span v-if="record.justification">
              {{ record.justification.motif }}<br />
              <small>{{ record.justification.justificationDate }}</small>
            </span>
            <span v-else>–</span>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-else class="text-center py-8">Chargement...</div>
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

// Statut de la feuille
const statusText = computed(() => {
  if (!sheet.value) return '';
  switch (sheet.value.status) {
    case 'PENDING_STAFF':
      return "En cours de validation par l'éducateur";
    case 'PENDING_SECRETARY':
      return "En attente de saisie par la secrétaire";
    case 'VALIDATED':
      return "Feuille entièrement validée";
    default:
      return '';
  }
});
const statusClass = computed(() => {
  if (!sheet.value) return '';
  switch (sheet.value.status) {
    case 'PENDING_STAFF':
      return 'bg-yellow-500';
    case 'PENDING_SECRETARY':
      return 'bg-orange-500';
    case 'VALIDATED':
      return 'bg-green-600';
    default:
      return '';
  }
});

// Filtrages et comptes
const totalCount = computed(() => sheet.value?.records.length || 0);
const presentCount = computed(() =>
  sheet.value?.records.filter(r => r.present).length || 0
);
const unjustAbsCount = computed(() =>
  sheet.value?.records.filter(r => !r.present && !r.justification).length ||
  0
);
const latenessCount = computed(() =>
  sheet.value?.records.filter(r => r.justification?.type === 'LATENESS').length ||
  0
);
const justifiedAbsCount = computed(() =>
  sheet.value?.records.filter(r => r.justification?.type === 'ABSENCE').length ||
  0
);

// KPIs
const attendanceRate = computed(() =>
  totalCount.value
    ? Number(((presentCount.value / totalCount.value) * 100).toFixed(0))
    : 0
);
const unjustAbsenceRate = computed(() =>
  totalCount.value
    ? Number(((unjustAbsCount.value / totalCount.value) * 100).toFixed(0))
    : 0
);
const justifiedLatenessRate = computed(() =>
  totalCount.value
    ? Number(((latenessCount.value / totalCount.value) * 100).toFixed(0))
    : 0
);
const absJustifiedToUnjustRatio = computed(() => {
  if (unjustAbsCount.value === 0) return '–';
  return (justifiedAbsCount.value / unjustAbsCount.value).toFixed(2);
});

// Handlers
function onDateChange() {
  store.setDate(date.value);
  store.fetchSheet();
}
async function exportCSV() {
  try {
    const resp = await fetch(
      `${import.meta.env.VITE_API_URL}/presences/report?date=${date.value}&format=csv`,
      { headers: { Authorization: `Bearer ${store.$state.sheet ? '' : ''}` } }
    );
    if (!resp.ok) throw new Error('Erreur export CSV');
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `presence-${date.value}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err: any) {
    notify.showNotification(err.message, 'error');
  }
}
async function exportPDF() {
  try {
    const resp = await fetch(
      `${import.meta.env.VITE_API_URL}/presences/report?date=${date.value}&format=pdf`,
      { headers: { Authorization: `Bearer ${store.$state.sheet ? '' : ''}` } }
    );
    if (!resp.ok) throw new Error('Erreur export PDF');
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    URL.revokeObjectURL(url);
  } catch (err: any) {
    notify.showNotification(err.message, 'error');
  }
}

onMounted(() => {
  store.fetchSheet();
});
</script>

<style scoped>
/* tu peux adapter l’espacement ou les couleurs si besoin */
</style>
