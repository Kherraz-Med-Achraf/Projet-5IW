<template>
  <div class="event-list">
    <h1>Événements à venir</h1>

    <p v-if="eventStore.loading">Chargement…</p>
    <p v-if="eventStore.error" class="error">{{ eventStore.error }}</p>

    <div v-for="ev in eventStore.events" :key="ev.id" class="card">
      <img v-if="ev.imageUrl" :src="API + ev.imageUrl" class="thumb" />
      <div class="content">
        <h3>{{ ev.title }}</h3>
        <p>{{ ev.description }}</p>
        <p><strong>Date :</strong> {{ formatDate(ev.date) }} de {{ ev.startTime.substring(11,16) }} à {{ ev.endTime.substring(11,16) }}</p>
        <p><strong>Prix :</strong> {{ ev.priceCt === 0 ? 'Gratuit' : (ev.priceCt/100).toFixed(2)+' € par enfant' }}</p>
        <p v-if="registeredChildren(ev).length" class="already">
          Déjà inscrit: {{ registeredChildren(ev).join(', ') }}
        </p>
        <button @click="openModal(ev)" :disabled="registeredChildren(ev).length===children.length">S'inscrire</button>
      </div>
    </div>

    <!-- Modal inscription -->
    <div v-if="selected" class="modal">
      <div class="box">
        <h2>Inscription – {{ selected.title }}</h2>
        <label>Enfants à inscrire :</label>
        <select multiple v-model="childIds">
          <option v-for="c in children" :key="c.id" :value="c.id">{{ c.firstName }} {{ c.lastName }}</option>
        </select>

        <label>Mode de paiement :</label>
        <div>
          <label><input type="radio" value="CHEQUE" v-model="paymentMethod" /> Chèque</label>
          <label v-if="selected.priceCt>0"><input type="radio" value="STRIPE" v-model="paymentMethod" /> Carte bancaire</label>
        </div>

        <button @click="register">Valider</button>
        <button @click="closeModal">Annuler</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useEventStore } from '@/stores/eventStore'
import { useToast } from 'vue-toastification'

const eventStore = useEventStore()
const toast = useToast()
const API = import.meta.env.VITE_NEST_API_URL ?? ''

const selected = ref<any|null>(null)
const childIds = ref<number[]>([])
const paymentMethod = ref<'CHEQUE'|'STRIPE'>('CHEQUE')

const children = ref<any[]>([])
async function fetchChildren(){
  try{
    const token = localStorage.getItem('token') || ''
    const res = await fetch(`${API}/children`, { headers:{ Authorization:`Bearer ${token}` }})
    if(res.ok) children.value = await res.json()
  }catch{}
}

function formatDate(d:string){ return new Date(d).toLocaleDateString('fr-FR') }

function openModal(ev:any){ selected.value = ev; childIds.value=[]; paymentMethod.value='CHEQUE' }
function closeModal(){ selected.value=null }

async function register(){
  if (!childIds.value.length){ toast.error('Sélectionnez au moins un enfant'); return }
  const res = await eventStore.register(selected.value.id, childIds.value, paymentMethod.value)
  if (res){
    closeModal()
    if(res.stripeUrl){ window.location.href = res.stripeUrl }
    else toast.success('Inscription enregistrée')
  }
}

function registeredChildren(ev:any){
  const reg = eventStore.myRegistrations.find(r=>r.eventId===ev.id)
  return reg ? reg.children : []
}

onMounted(()=>{ eventStore.fetchEvents(); eventStore.fetchMyEvents(); fetchChildren() })
</script>

<style scoped>
.card{ display:flex;gap:1rem;border:1px solid #ddd;padding:1rem;margin-bottom:1rem }
.thumb{ width:120px;height:80px;object-fit:cover }
.error{ color:red }
.modal{ position:fixed;top:0;left:0;right:0;bottom:0;background:#0008;display:flex;align-items:center;justify-content:center }
.box{ background:#fff;padding:1rem;width:400px }
</style> 