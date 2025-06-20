<template>
  <div class="event-admin">
    <h1>Gestion des événements du samedi</h1>

    <!-- ─── Formulaire création / édition ─────────────────────────────── -->
    <form class="form" @submit.prevent="onSubmit">
      <input v-model="form.title" placeholder="Titre" required />
      <textarea v-model="form.description" placeholder="Description (option)" rows="2" />

      <label>
        Date (samedi)
        <input type="date" v-model="form.date" required />
      </label>
      <label>
        Début
        <input type="time" v-model="form.startTime" required />
      </label>
      <label>
        Fin
        <input type="time" v-model="form.endTime" required />
      </label>

      <label>
        Prix (€ – 0 = gratuit)
        <input type="number" min="0" step="0.01" v-model.number="form.price" />
      </label>
      <label>
        Capacité (option)
        <input type="number" min="1" v-model.number="form.capacity" />
      </label>

      <input type="file" accept="image/*" @change="onFile" />

      <div class="actions">
        <button type="submit">{{ editingId ? 'Mettre à jour' : 'Créer' }}</button>
        <button v-if="editingId" type="button" @click="cancelEdit">Annuler</button>
      </div>
    </form>

    <p v-if="eventStore.error" class="error">{{ eventStore.error }}</p>

    <!-- ─── Liste des événements ─────────────────────────────────────── -->
    <table v-if="eventStore.events.length" class="table">
      <thead>
        <tr>
          <th>Titre</th><th>Date</th><th>Horaire</th><th>Prix</th><th>Capacité</th><th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="ev in eventStore.events" :key="ev.id">
          <td>{{ ev.title }}</td>
          <td>{{ formatDate(ev.date) }}</td>
          <td>{{ ev.startTime.slice(11,16) }} – {{ ev.endTime.slice(11,16) }}</td>
          <td>{{ ev.priceCt === 0 ? 'Gratuit' : (ev.priceCt/100).toFixed(2)+' €' }}</td>
          <td>{{ ev.capacity ?? '—' }}</td>
          <td>
            <button @click="edit(ev)" :disabled="ev.isLocked">Éditer</button>
            <button @click="remove(ev.id)">Supprimer</button>
            <router-link :to="`/events/${ev.id}/registrations`">Inscriptions</router-link>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import { useEventStore } from '@/stores/eventStore'
import { useToast } from 'vue-toastification'

const eventStore = useEventStore()
const toast      = useToast()

interface Form {
  title: string
  description: string
  date: string
  startTime: string
  endTime: string
  price: number
  capacity?: number
}

const form = reactive<Form>({
  title:'', description:'', date:'', startTime:'10:00', endTime:'12:00', price:0,
})
const file       = ref<File|null>(null)
const editingId  = ref<string>('')

function reset(){
  Object.assign(form,{ title:'', description:'', date:'', startTime:'10:00', endTime:'12:00', price:0, capacity:undefined })
  file.value=null
}

function onFile(e:Event){
  file.value = (e.target as HTMLInputElement).files?.[0] ?? null
}

async function onSubmit(){
  if(!form.date){ toast.error('Date requise'); return }
  const fd=new FormData()
  Object.entries(form).forEach(([k,v])=> v!==undefined && fd.append(k,String(v)))
  if(file.value) fd.append('image',file.value)

  if(editingId.value){
    await eventStore.updateEvent(editingId.value, fd)
    toast.success('Événement mis à jour')
  }else{
    await eventStore.createEvent(fd)
    toast.success('Événement créé')
  }
  editingId.value=''
  reset()
}

function edit(ev:any){
  editingId.value = ev.id
  Object.assign(form,{ title:ev.title, description:ev.description||'', date:ev.date.substring(0,10), startTime:ev.startTime.substring(11,16), endTime:ev.endTime.substring(11,16), price:ev.priceCt/100, capacity:ev.capacity })
}
function cancelEdit(){ editingId.value=''; reset() }
async function remove(id:string){
  if(confirm('Supprimer cet événement ?')){
    await eventStore.deleteEvent(id)
    toast.info('Événement supprimé')
  }
}
function formatDate(d:string){ return new Date(d).toLocaleDateString('fr-FR') }

onMounted(()=> eventStore.fetchEvents())
</script>

<style scoped>
.event-admin{ max-width:900px; margin:auto }
.form{ display:flex; flex-wrap:wrap; gap:0.5rem; margin-bottom:1rem }
.form input,.form textarea{ flex:1 1 200px; padding:0.4rem }
.actions{ width:100%; display:flex; gap:0.5rem }
.error{ color:red }
.table{ width:100%; border-collapse:collapse }
.table th,.table td{ border:1px solid #ddd; padding:0.4rem; text-align:center }
</style>