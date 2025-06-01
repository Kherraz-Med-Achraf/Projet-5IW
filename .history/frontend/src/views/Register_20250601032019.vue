<!-- src/views/Register.vue -->
<template>
  <div class="max-w-3xl mx-auto p-6 space-y-8">
    <!-- Loader -->
    <div v-if="loadingInvite" class="text-center py-10">
      <p>Chargement…</p>
    </div>

    <!-- Formulaire complet -->
    <div v-else>
      <!-- ────────── ÉTAPE 1 : infos parent ────────── -->
      <h2 class="text-xl font-bold">Étape 1 : Informations du parent</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BaseInput v-model="form.firstName" label="Prénom" />
        <BaseInput v-model="form.lastName"  label="Nom"    />
        <BaseInput v-model="form.phone"     label="Téléphone (+33)" />

        <BaseInput v-model="form.address.number"  type="number" label="N° de rue" />
        <BaseInput v-model="form.address.street"  label="Rue" class="md:col-span-2" />
        <BaseInput v-model="form.address.postal"  label="Code postal" />
        <BaseInput v-model="form.address.city"    label="Ville" />
        <BaseInput v-model="form.address.country" label="Pays"  />

        <!-- Responsabilité légale -->
        <div class="flex flex-col md:col-span-2">
          <label class="mb-1 text-sm">Responsabilité légale</label>
          <select v-model="form.legalResponsibility" class="border rounded px-3 py-2">
            <option disabled value="">Choisir…</option>
            <option>Mère</option><option>Père</option>
            <option>Tuteurs légaux</option><option>Service d’aide sociale</option>
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

      <!-- ────────── Contacts d’urgence ────────── -->
      <h3 class="text-lg font-semibold mt-6">Contacts d’urgence</h3>
      <div
        v-for="(c, i) in form.emergencyContacts"
        :key="`ec-${i}`"
        class="border p-4 rounded-lg mb-4 relative"
      >
        <BaseInput v-model="c.firstName" label="Prénom" />
        <BaseInput v-model="c.lastName"  label="Nom"    />

        <div class="flex flex-col">
          <label class="mb-1 text-sm">Lien</label>
          <select v-model="c.relation" class="border rounded px-3 py-2">
            <option disabled value="">Relation…</option>
            <option>Mère</option><option>Père</option><option>Sœur</option><option>Frère</option>
            <option>Grand-parent</option><option>Oncle / Tante</option><option>Cousin·e</option>
            <option>Ami·e de la famille</option><option>Voisin·e</option><option>Autre</option>
          </select>
          <BaseInput
            v-if="c.relation === 'Autre'"
            v-model="c.relationOther"
            label="Précisez"
            class="mt-2"
          />
        </div>

        <BaseInput v-model="c.phone" label="Téléphone" />
        <button class="absolute top-1 right-1" @click="removeEmergency(i)">✕</button>
      </div>
      <button class="btn" @click="addEmergency">+ Ajouter un contact</button>

      <!-- ────────── ÉTAPE 2 : infos enfant ────────── -->
      <h2 class="text-xl font-bold mt-10">Étape 2 : Informations de l’enfant</h2>
      <div
        v-for="(child, i) in form.children"
        :key="`ch-${i}`"
        class="border p-4 rounded-lg mb-4 relative"
      >
        <BaseInput v-model="child.firstName" label="Prénom" />
        <BaseInput v-model="child.lastName"  label="Nom"    />
        <BaseInput v-model="child.birthDate" label="Date de naissance" type="date" />
        <button class="absolute top-1 right-1" @click="removeChild(i)">✕</button>
      </div>
      <button class="btn" @click="addChild">+ Ajouter un enfant</button>

      <!-- ────────── ÉTAPE 3 : création du compte ────────── -->
      <h2 class="text-xl font-bold mt-10">Étape 3 : Création du compte</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BaseInput
          v-model="form.email"
          label="Email"
          type="email"
          class="md:col-span-2"
          :disabled="!!inviteToken"
        />
        <BaseInput v-model="form.password"         label="Mot de passe" type="password" />
        <BaseInput v-model="form.passwordConfirm" label="Confirmation"  type="password" />
      </div>

      <button class="btn-primary mt-8" @click="submit" :disabled="auth.loading">
        Créer le compte
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, defineComponent, h, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'vue-toastification'
import { useRouter, useRoute } from 'vue-router'

/* ---------- Input basique ---------- */
const BaseInput = defineComponent({
  props: { modelValue: String, label: String, type: { default: 'text' }, disabled: Boolean },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const onInput = (e: Event) => emit('update:modelValue', (e.target as HTMLInputElement).value)
    return () =>
      h('div', { class: 'flex flex-col' }, [
        h('label', { class: 'mb-1 text-sm' }, props.label),
        h('input', {
          class: 'border rounded px-3 py-2',
          type: props.type,
          value: props.modelValue,
          disabled: props.disabled,
          onInput,
          required: !props.disabled,
        }),
      ])
  },
})
/* ----------------------------------- */

const auth   = useAuthStore()
const toast  = useToast()
const router = useRouter()
const route  = useRoute()

/* --- état --- */
const inviteToken   = ref<string | null>(null)
const loadingInvite = ref(true)

const form = reactive<any>({
  firstName:'', lastName:'', phone:'',
  address:{ number:'', street:'', postal:'', city:'', country:'' },
  legalResponsibility:'', legalResponsibilityOther:'',
  emergencyContacts: [],  // ← plus de placeholder vide
  children:          [],  // ← idem
  email:'', password:'', passwordConfirm:'',
})
/* ------------ */

/* --- helpers pour ajouter / retirer --- */
function addEmergency(){
  form.emergencyContacts.push({ firstName:'', lastName:'', relation:'', relationOther:'', phone:'' })
}
function removeEmergency(i:number){ form.emergencyContacts.splice(i,1) }
function addChild(){ form.children.push({ firstName:'', lastName:'', birthDate:'' }) }
function removeChild(i:number){ form.children.splice(i,1) }

function allChildrenOldEnough(){
  const today = new Date()
  return form.children.every((c:any)=>
    c.birthDate && (today.getTime() - new Date(c.birthDate).getTime()) / 3.15576e10 >= 9
  )
}
/* -------------------------------------- */

/* --- validation du token d’invitation --- */
onMounted(async ()=>{
  const token = route.query.token as string | undefined
  if (token) {
    inviteToken.value = token
    try{
      const res  = await fetch(`http://localhost:3000/invitations/validate/${token}`)
      const data = await res.json()
      if(!res.ok) throw new Error(data.message || 'Invitation invalide')
      form.email = data.email        // email verrouillé
    }catch(e:any){
      toast.error(e.message || 'Lien d’invitation invalide ou expiré')
      return router.push({ name:'Login' })
    }
  }
  loadingInvite.value = false
})
/* --------------------------------------- */

async function submit(){
  if(form.password !== form.passwordConfirm){
    return toast.error('Les mots de passe ne correspondent pas')
  }

  /* ---- construction des blocs uniquement s’ils sont remplis ---- */
  const contactsClean = form.emergencyContacts.filter(
    (c:any)=>c.firstName && c.lastName && c.phone
  )
  const childrenClean = form.children.filter(
    (c:any)=>c.firstName && c.lastName && c.birthDate
  )
  /* -------------------------------------------------------------- */

  const fullAddress =
    `${form.address.number.trim()} ${form.address.street.trim()}, `+
    `${form.address.postal.trim()} ${form.address.city.trim()}, ${form.address.country.trim()}`
  const legalResp = form.legalResponsibility === 'Autre'
    ? `Autre: ${form.legalResponsibilityOther.trim()}`
    : form.legalResponsibility

  /* ---------- Mode INVITATION ---------- */
  if(inviteToken.value){
    const payload:any = {
      token: inviteToken.value,
      email: form.email,
      password: form.password,
      passwordConfirm: form.passwordConfirm,
      firstName: form.firstName,
      lastName:  form.lastName,
      phone:     form.phone,
      address:   fullAddress,
      legalResponsibility: legalResp,
    }
    if (contactsClean.length) payload.emergencyContacts = contactsClean
    if (childrenClean.length)  payload.children          = childrenClean

    try{
      const res  = await fetch('http://localhost:3000/auth/register-by-invite',{
        method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)
      })
      const data = await res.json()
      if(!res.ok) throw new Error(data.message)
      toast.success('Inscription réussie ! Vous pouvez vous connecter.')
      router.push({ name:'Login' })
    }catch(e:any){
      toast.error(e.message || 'Erreur lors de l’inscription')
    }
  }
  /* ---------- Mode CLASSIQUE ---------- */
  else{
    if(!allChildrenOldEnough()){
      return toast.error('Chaque enfant doit avoir au moins 9 ans')
    }
    const payload:any = {
      firstName:form.firstName, lastName:form.lastName, phone:form.phone,
      address:fullAddress, legalResponsibility:legalResp,
      email:form.email, password:form.password, passwordConfirm:form.passwordConfirm,
    }
    if (contactsClean.length) payload.emergencyContacts = contactsClean
    if (childrenClean.length) payload.children          = childrenClean

    try{
      await auth.registerParent(payload)
      toast.success('Inscription réussie ! Vous pouvez vous connecter.')
      router.push({ name:'Login' })
    }catch(e:any){
      toast.error(auth.error || e.response?.data?.message || 'Erreur d’inscription')
    }
  }
}
</script>

<style scoped>
.btn{ @apply mt-2 px-4 py-2 border rounded; }
.btn-primary{ @apply bg-blue-600 text-white px-6 py-3 rounded-lg; }
</style>
