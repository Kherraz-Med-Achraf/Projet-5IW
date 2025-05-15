<template>
  <div class="max-w-3xl mx-auto p-6 space-y-8">
    <!-- ÉTAPE 1 -->
    <h2 class="text-xl font-bold">Étape 1 : Informations du parent</h2>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <BaseInput v-model="form.firstName" label="Prénom" :error="e.firstName" />
      <BaseInput v-model="form.lastName"  label="Nom"     :error="e.lastName" />
      <BaseInput v-model="form.phone"     label="Téléphone (+33)" :error="e.phone" />

      <BaseInput v-model="form.address.number" type="number" label="N°"        :error="e.address" />
      <BaseInput v-model="form.address.street"             label="Rue" class="md:col-span-2" :error="e.address" />
      <BaseInput v-model="form.address.postal"  label="Code postal"  :error="e.address" />
      <BaseInput v-model="form.address.city"    label="Ville"        :error="e.address" />
      <BaseInput v-model="form.address.country" label="Pays"         :error="e.address" />

      <div class="flex flex-col md:col-span-2">
        <label class="mb-1 text-sm">Responsabilité légale</label>
        <select v-model="form.legalResponsibility" class="border rounded px-3 py-2"
                :class="e.legalResponsibility && 'border-red-500'">
          <option disabled value="">Choisir…</option>
          <option>Mère</option><option>Père</option>
          <option>Tuteurs légaux</option><option>Service d’aide sociale</option>
          <option>Autre</option>
        </select>
        <p v-if="e.legalResponsibility" class="text-red-500 text-xs mt-1">{{ e.legalResponsibility }}</p>
        <BaseInput
          v-if="form.legalResponsibility === 'Autre'"
          v-model="form.legalResponsibilityOther"
          label="Précisez"
          class="mt-2"
          :error="e.legalResponsibilityOther"
        />
      </div>
    </div>

    <!-- Contacts d’urgence -->
    <h3 class="text-lg font-semibold mt-6">Contacts d’urgence</h3>
    <div
      v-for="(c,i) in form.emergencyContacts"
      :key="`ec-${i}`"
      class="border p-4 rounded-lg mb-4 relative"
    >
      <BaseInput v-model="c.firstName" label="Prénom" :error="e[`ec${i}.name`]" />
      <BaseInput v-model="c.lastName"  label="Nom"    :error="e[`ec${i}.name`]" />

      <div class="flex flex-col">
        <label class="mb-1 text-sm">Lien</label>
        <select v-model="c.relation" class="border rounded px-3 py-2"
                :class="e[`ec${i}.relation`] && 'border-red-500'">
          <option disabled value="">Relation…</option>
          <option>Mère</option><option>Père</option>
          <option>Sœur</option><option>Frère</option><option>Grand-parent</option>
          <option>Oncle / Tante</option><option>Cousin / Cousine</option>
          <option>Ami·e de la famille</option><option>Voisin·e</option>
          <option>Autre</option>
        </select>
        <p v-if="e[`ec${i}.relation`]" class="text-red-500 text-xs mt-1">
          {{ e[`ec${i}.relation`] }}
        </p>
        <BaseInput
          v-if="c.relation==='Autre'"
          v-model="c.relationOther"
          label="Précisez"
          class="mt-2"
          :error="e[`ec${i}.relationOther`]"
        />
      </div>

      <BaseInput v-model="c.phone" label="Téléphone" :error="e[`ec${i}.phone`]" />
      <button class="absolute top-1 right-1" @click="removeEmergency(i)">✕</button>
    </div>
    <button class="btn" @click="addEmergency">+ Ajouter un contact</button>

    <!-- ÉTAPE 2 -->
    <h2 class="text-xl font-bold mt-10">Étape 2 : Informations de l’enfant</h2>
    <div
      v-for="(child,i) in form.children"
      :key="`ch-${i}`"
      class="border p-4 rounded-lg mb-4 relative"
    >
      <BaseInput v-model="child.firstName" label="Prénom" :error="e[`ch${i}.firstName`]" />
      <BaseInput v-model="child.lastName"  label="Nom"    :error="e[`ch${i}.lastName`]" />
      <BaseInput v-model="child.birthDate" label="Date de naissance" type="date"
                 :error="e[`ch${i}.birthDate`]" />
      <BaseInput v-model="child.condition" label="Pathologie (optionnel)" />
      <button class="absolute top-1 right-1" @click="removeChild(i)">✕</button>
    </div>
    <button class="btn" @click="addChild">+ Ajouter un enfant</button>

    <!-- ÉTAPE 3 -->
    <h2 class="text-xl font-bold mt-10">Étape 3 : Création du compte</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <BaseInput v-model="form.email" label="Email" type="email"
                 class="md:col-span-2" :error="e.email" />
      <BaseInput v-model="form.password" label="Mot de passe" type="password"
                 :error="e.password" />
      <BaseInput v-model="form.passwordConfirm" label="Confirmation" type="password"
                 :error="e.passwordConfirm" />
    </div>

    <button class="btn-primary mt-8" @click="submit" :disabled="auth.loading">
      Créer le compte
    </button>
  </div>
</template>

<script setup lang="ts">
import { reactive, defineComponent, h } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'vue-toastification'
import { useRouter } from 'vue-router'

/* ------------ Petit composant input réutilisable ------------ */
const BaseInput = defineComponent({
  props: { modelValue: String, label: String, type: { default: 'text' }, error: String },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const onI = (e: Event) => emit('update:modelValue', (e.target as HTMLInputElement).value)
    return () =>
      h('div', { class: 'flex flex-col' }, [
        h('label', { class: 'mb-1 text-sm' }, props.label),
        h('input', {
          class: ['border rounded px-3 py-2', props.error && 'border-red-500'],
          type: props.type, value: props.modelValue, onInput: onI,
        }),
        props.error && h('p', { class: 'text-red-500 text-xs mt-1' }, props.error),
      ])
  },
})
/* ------------------------------------------------------------ */

const auth   = useAuthStore()
const toast  = useToast()
const router = useRouter()

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[\\W_]).+$/

const form = reactive({
  firstName:'', lastName:'', phone:'',
  address:{ number:'', street:'', postal:'', city:'', country:'' },
  legalResponsibility:'', legalResponsibilityOther:'',
  emergencyContacts:[ { firstName:'', lastName:'', relation:'', relationOther:'', phone:'' } ],
  children:[ { firstName:'', lastName:'', birthDate:'', condition:'' } ],
  email:'', password:'', passwordConfirm:'', notificationPrefs:{},
})

/* erreurs locales */
const e = reactive<Record<string,string>>({})

function addEmergency(){ form.emergencyContacts.push({ firstName:'', lastName:'', relation:'', relationOther:'', phone:'' }) }
function removeEmergency(i:number){ form.emergencyContacts.splice(i,1) }
function addChild(){ form.children.push({ firstName:'', lastName:'', birthDate:'', condition:'' }) }
function removeChild(i:number){ form.children.splice(i,1) }

/* ---------------- Validation front légère ------------------ */
function validateFront(): boolean {
  Object.keys(e).forEach(k=>delete e[k])

  // parent
  if(!form.firstName.trim()) e.firstName='Champ requis'
  if(!form.lastName.trim())  e.lastName ='Champ requis'
  if(!form.phone.trim())     e.phone    ='Champ requis'
  const addrOk = Object.values(form.address).every(v=>v.trim())
  if(!addrOk) e.address='Adresse incomplète'
  if(!form.legalResponsibility) e.legalResponsibility='Champ requis'
  if(form.legalResponsibility==='Autre' && !form.legalResponsibilityOther.trim())
    e.legalResponsibilityOther='Champ requis'

  // contacts
  form.emergencyContacts.forEach((c,i)=>{
    if(!(c.firstName.trim()&&c.lastName.trim()))
      e[`ec${i}.name`]='Champ requis'
    if(!c.relation) e[`ec${i}.relation`]='Champ requis'
    if(c.relation==='Autre' && !c.relationOther.trim())
      e[`ec${i}.relationOther`]='Champ requis'
    if(!c.phone.trim()) e[`ec${i}.phone`]='Champ requis'
  })

  // children + âge
  const today=new Date()
  form.children.forEach((ch,i)=>{
    if(!ch.firstName.trim()) e[`ch${i}.firstName`]='Champ requis'
    if(!ch.lastName.trim())  e[`ch${i}.lastName`]='Champ requis'
    if(!ch.birthDate){ e[`ch${i}.birthDate`]='Champ requis'; return }
    const age=(today.getTime()-new Date(ch.birthDate).getTime())/(1000*3600*24*365.25)
    if(age<9) e[`ch${i}.birthDate`]='Âge < 9 ans'
  })

  // compte
  if(!form.email.trim())        e.email='Champ requis'
  if(!PASSWORD_REGEX.test(form.password))
    e.password='Mot de passe trop faible'
  if(form.password.length<12)
    e.password='12 caractères minimum'
  if(form.passwordConfirm!==form.password)
    e.passwordConfirm='Ne correspond pas'

  return Object.keys(e).length===0
}
/* ----------------------------------------------------------- */

async function submit(){
  if(!validateFront()){
    toast.error('Veuillez corriger les champs en rouge')
    return
  }

  const fullAddress=`${form.address.number} ${form.address.street}, ${form.address.postal} ${form.address.city}, ${form.address.country}`
  const legalResp=form.legalResponsibility==='Autre'
    ? `Autre: ${form.legalResponsibilityOther.trim()}`
    : form.legalResponsibility

  const contacts=form.emergencyContacts.map(c=>({
    name:`${c.firstName.trim()} ${c.lastName.trim()}`.trim(),
    phone:c.phone.trim(),
    relation:c.relation==='Autre' ? `Autre: ${c.relationOther.trim()}` : c.relation,
  }))

  try{
    await auth.registerParent({
      firstName:form.firstName, lastName:form.lastName, phone:form.phone,
      address:fullAddress, legalResponsibility:legalResp,
      emergencyContacts:contacts, children:form.children,
      email:form.email, password:form.password, passwordConfirm:form.passwordConfirm,
      notificationPrefs:form.notificationPrefs,
    })
    toast.success('Inscription réussie !')
    router.push('/login')
  }catch(err:any){
    toast.error(err.response?.data?.message || 'Erreur')
  }
}
</script>

<style scoped>
.btn{ @apply mt-2 px-4 py-2 border rounded; }
.btn-primary{ @apply bg-blue-600 text-white px-6 py-3 rounded-lg; }
</style>
