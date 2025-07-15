<template>
  <div class="max-w-3xl mx-auto p-6 space-y-8">
    <!-- ─────── ÉTAPE 1 ───────── -->
    <h2 class="text-xl font-bold">Étape 1 : Informations du parent</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <BaseInput v-model="form.firstName" label="Prénom" />
      <BaseInput v-model="form.lastName" label="Nom" />
      <BaseInput v-model="form.phone" label="Téléphone (+33)" />

      <BaseInput
        v-model="form.address.number"
        type="number"
        label="N° de rue"
      />
      <BaseInput
        v-model="form.address.street"
        label="Rue"
        class="md:col-span-2"
      />
      <BaseInput v-model="form.address.postal" label="Code postal" />
      <BaseInput v-model="form.address.city" label="Ville" />
      <BaseInput v-model="form.address.country" label="Pays" />

      <!-- Responsabilité légale -->
      <div class="flex flex-col md:col-span-2">
        <label class="mb-1 text-sm">Responsabilité légale</label>
        <select
          v-model="form.legalResponsibility"
          class="border rounded px-3 py-2"
        >
          <option disabled value="">Choisir…</option>
          <option>Mère</option>
          <option>Père</option>
          <option>Tuteurs légaux</option>
          <option>Service d'aide sociale</option>
          <option>Autre</option>
        </select>
        <BaseInput
          v-if="form.legalResponsibility === 'Autre'"
          v-model="form.legalResponsibilityOther"
          label="Précisez"
          class="mt-2"
        />
      </div>
    </div>

    <!-- ─────── Contacts d'urgence ─────── -->
    <h3 class="text-lg font-semibold mt-6">Contacts d'urgence</h3>
    <div
      v-for="(c, i) in form.emergencyContacts"
      :key="`ec-${i}`"
      class="border p-4 rounded-lg mb-4 relative"
    >
      <BaseInput v-model="c.firstName" label="Prénom" />
      <BaseInput v-model="c.lastName" label="Nom" />

      <div class="flex flex-col">
        <label class="mb-1 text-sm">Lien</label>
        <select v-model="c.relation" class="border rounded px-3 py-2">
          <option disabled value="">Relation…</option>
          <option>Mère</option>
          <option>Père</option>
          <option>Sœur</option>
          <option>Frère</option>
          <option>Grand-parent</option>
          <option>Oncle / Tante</option>
          <option>Cousin·e</option>
          <option>Ami·e de la famille</option>
          <option>Voisin·e</option>
          <option>Autre</option>
        </select>
        <BaseInput
          v-if="c.relation === 'Autre'"
          v-model="c.relationOther"
          label="Précisez"
          class="mt-2"
        />
      </div>

      <BaseInput v-model="c.phone" label="Téléphone" />
      <button class="absolute top-1 right-1" @click="removeEmergency(i)">
        ✕
      </button>
    </div>
    <button class="btn" @click="addEmergency">+ Ajouter un contact</button>

    <!-- ─────── ÉTAPE 2 ───────── -->
    <h2 class="text-xl font-bold mt-10">Étape 2 : Informations de l'enfant</h2>
    <div
      v-for="(child, i) in form.children"
      :key="`ch-${i}`"
      class="border p-4 rounded-lg mb-4 relative"
    >
      <BaseInput v-model="child.firstName" label="Prénom" />
      <BaseInput v-model="child.lastName" label="Nom" />
      <BaseInput
        v-model="child.birthDate"
        label="Date de naissance"
        type="date"
      />
      <button class="absolute top-1 right-1" @click="removeChild(i)">✕</button>
    </div>
    <button class="btn" @click="addChild">+ Ajouter un enfant</button -->

    <!-- ─────── ÉTAPE 3 ───────── -->
    <h2 class="text-xl font-bold mt-10">Étape 3 : Création du compte</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <BaseInput
        v-model="form.email"
        label="Email"
        type="email"
        class="md:col-span-2"
        :disabled="!!inviteToken"
      />
      <BaseInput v-model="form.password" label="Mot de passe" type="password" />
      <BaseInput
        v-model="form.passwordConfirm"
        label="Confirmation"
        type="password"
      />
    </div>

    <button class="btn-primary mt-8" @click="submit" :disabled="auth.loading">
      Créer le compte
    </button>
    -->
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, defineComponent, h, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'vue-toastification'
import { useRouter, useRoute } from 'vue-router'
import { API_BASE_URL } from '@/utils/api'

/* input simple */
const BaseInput = defineComponent({
  props: { modelValue:String, label:String, type:{default:'text'}, disabled:Boolean },
  emits:['update:modelValue'],
  setup(p,{emit}){
    const onI=e=>emit('update:modelValue',(e.target as HTMLInputElement).value)
    return ()=>h('div',{class:'flex flex-col'},[
      h('label',{class:'mb-1 text-sm'},p.label),
      h('input',{class:'border rounded px-3 py-2',type:p.type,value:p.modelValue,disabled:p.disabled,onInput:onI,required:!p.disabled})
    ])
  }
})

const auth   = useAuthStore()
const toast  = useToast()
const router = useRouter()
const route  = useRoute()

const inviteToken = ref<string|null>(null)

/* état */
const form = reactive<any>({
  firstName:'', lastName:'', phone:'',
  address:{number:'',street:'',postal:'',city:'',country:''},
  legalResponsibility:'', legalResponsibilityOther:'',
  emergencyContacts:[],  // démarre vide
  children:[],           // idem
  email:'', password:'', passwordConfirm:''
})

/* helpers tableau */
const addEmergency = () => form.emergencyContacts.push({ firstName:'', lastName:'', relation:'', relationOther:'', phone:'' })
const removeEmergency = (i:number)=>form.emergencyContacts.splice(i,1)
const addChild = () => form.children.push({ firstName:'', lastName:'', birthDate:'' })
const removeChild = (i:number)=>form.children.splice(i,1)

/* token invitation */
onMounted(async ()=>{
  const tok = route.query.token as string|undefined
  if(tok){
    inviteToken.value = tok
    try{
      const res = await fetch(`${API_BASE_URL}/invitations/validate/${tok}`)
      const data = await res.json()
      if(!res.ok) throw new Error(data.message)
      form.email = data.email   // verrouille l'email
    }catch(e:any){
      toast.error(e.message || "Lien d'invitation invalide ou expiré")
      router.push({name:'Login'})
    }
  }
})

function validKids(){
  const now = Date.now()
  return form.children.every((c:any)=>{
    if(!c.birthDate) return false
    return (now - new Date(c.birthDate).getTime())/3.15576e10 >= 9
  })
}

async function submit(){
  /* mots de passe */
  if(form.password !== form.passwordConfirm){
    toast.error('Les mots de passe ne correspondent pas'); return
  }
  /* âge des enfants */
  if(form.children.length && !validKids()){
    toast.error('Chaque enfant doit avoir au moins 9 ans'); return
  }

  /* nettoyages */
  const contactsClean = form.emergencyContacts.filter((c:any)=>c.firstName&&c.lastName&&c.phone)
  const kidsClean     = form.children.filter((c:any)=>c.firstName&&c.lastName&&c.birthDate)

  /* adresse / responsabilité */
  const address =
    `${form.address.number.trim()} ${form.address.street.trim()}, ${form.address.postal.trim()} ${form.address.city.trim()}, ${form.address.country.trim()}`
  const legalR = form.legalResponsibility==='Autre'
      ? `Autre: ${form.legalResponsibilityOther.trim()}`
      : form.legalResponsibility

  /* payload */
  const payload:any = {
    email: form.email,
    password: form.password,
    passwordConfirm: form.passwordConfirm,
    firstName: form.firstName,
    lastName:  form.lastName,
    phone:     form.phone,
    address,
    legalResponsibility: legalR,
  }
  if(contactsClean.length) payload.emergencyContacts = contactsClean
  if(kidsClean.length)     payload.children          = kidsClean

  /* endpoint selon présence de token */
  if(inviteToken.value){
    payload.token = inviteToken.value
    try{
      const res = await fetch(`${API_BASE_URL}/auth/register-by-invite`,{
        method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)
      })
      const data = await res.json()
      if(!res.ok) throw new Error(data.message)
      toast.success('Compte créé ! Connectez-vous.')
      router.push({name:'Login'})
    }catch(e:any){ toast.error(e.message || "Erreur d'inscription") }
  }else{
    /* inscription classique via store */
    try{
      await auth.registerParent(payload)
      toast.success('Compte créé ! Connectez-vous.')
      router.push({name:'Login'})
    }catch(e:any){
      toast.error(auth.error || e.response?.data?.message || "Erreur d'inscription")
    }
  }
}
</script>

<style scoped>
.btn {
  @apply mt-2 px-4 py-2 border rounded;
}
.btn-primary {
  @apply bg-blue-600 text-white px-6 py-3 rounded-lg;
}
</style>
