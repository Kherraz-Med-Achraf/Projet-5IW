<template>
  <div class="registrations">
    <h1>Inscriptions – {{ title }}</h1>

    <p v-if="eventStore.loading">Chargement…</p>
    <p v-if="eventStore.error" class="error">{{ eventStore.error }}</p>

    <table v-if="rows.length" class="table">
      <thead>
        <tr>
          <th>Parent</th><th>Enfants</th><th>Mode</th><th>Statut</th><th>Action</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in rows" :key="r.id">
          <td>{{ r.parent }}</td>
          <td>{{ r.children.join(', ') }}</td>
          <td>{{ r.paymentMethod }}</td>
          <td>{{ r.paymentStatus }}</td>
          <td>
            <button v-if="r.paymentMethod==='CHEQUE' && r.paymentStatus==='PENDING'" @click="markPaid(r)">Paiement reçu</button>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else-if="!eventStore.loading">Aucune inscription.</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useEventStore } from '@/stores/eventStore'
import { useToast } from 'vue-toastification'

const route = useRoute()
const eventStore = useEventStore()
const toast = useToast()

const eventId = route.params.eventId as string
const title   = ref('')
const rows    = ref<any[]>([])

async function load(){
  const regs = await eventStore.fetchRegistrations(eventId)
  rows.value = regs.map((r:any)=>({
    id: r.id,
    parent: r.parentProfile.user.email,
    children: r.children.map((c:any)=>c.child.firstName+' '+c.child.lastName),
    paymentMethod: r.paymentMethod,
    paymentStatus: r.paymentStatus,
  }))
  if (regs.length) title.value = regs[0].event.title
}

async function markPaid(r:any){
  await eventStore.validateCheque(r.id)
  toast.success('Paiement enregistré')
  await load()
}

onMounted(load)
</script>

<style scoped>
.table{ width:100%; border-collapse:collapse }
.table th,.table td{ border:1px solid #ccc; padding:0.4rem; text-align:center }
.error{ color:red }
</style> 