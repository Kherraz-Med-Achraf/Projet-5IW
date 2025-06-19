<template>
  <div class="my-events">
    <h1>Mes inscriptions aux événements</h1>

    <p v-if="eventStore.loading">Chargement…</p>
    <p v-if="eventStore.error" class="error">{{ eventStore.error }}</p>

    <table v-if="eventStore.myRegistrations.length" class="table">
      <thead>
        <tr>
          <th>Événement</th><th>Date</th><th>Enfants inscrits</th><th>Statut paiement</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="reg in eventStore.myRegistrations" :key="reg.eventId">
          <td>{{ reg.eventTitle }}</td>
          <td>{{ formatDate(reg.eventDate) }}</td>
          <td>{{ reg.children.join(', ') }}</td>
          <td>{{ reg.paymentStatus }}</td>
        </tr>
      </tbody>
    </table>

    <p v-else-if="!eventStore.loading">Aucune inscription pour le moment.</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useEventStore } from '@/stores/eventStore'

const eventStore = useEventStore()

function formatDate(d: string){ return new Date(d).toLocaleDateString('fr-FR') }

onMounted(()=>{ eventStore.fetchMyEvents() })
</script>

<style scoped>
.table{ width:100%; border-collapse:collapse }
.table th,.table td{ border:1px solid #ccc; padding:0.4rem; text-align:center }
.error{ color:red }
</style> 