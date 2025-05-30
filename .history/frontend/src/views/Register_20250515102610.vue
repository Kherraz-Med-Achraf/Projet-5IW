<template>
  <div class="max-w-3xl mx-auto p-6 space-y-8">
    <!-- ÉTAPE 1 -->
    <h2 class="text-xl font-bold">Étape 1 : Informations du parent</h2>
    <div v-if="stepErrors.parent.length" class="text-red-600 mb-2">
      Veuillez remplir toutes les informations du parent.
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <BaseInput
        v-model="form.firstName"
        label="Prénom"
        :error="fieldErrors.firstName"
      />
      <BaseInput
        v-model="form.lastName"
        label="Nom"
        :error="fieldErrors.lastName"
      />
      <BaseInput
        v-model="form.phone"
        label="Téléphone (+33)"
        :error="fieldErrors.phone"
      />

      <!-- Adresse détaillée -->
      <BaseInput
        v-model="form.address.number"
        type="number"
        label="N° de rue"
        :error="fieldErrors.address"
      />
      <BaseInput
        v-model="form.address.street"
        label="Rue"
        class="md:col-span-2"
        :error="fieldErrors.address"
      />
      <BaseInput
        v-model="form.address.postal"
        label="Code postal"
        :error="fieldErrors.address"
      />
      <BaseInput
        v-model="form.address.city"
        label="Ville"
        :error="fieldErrors.address"
      />
      <BaseInput
        v-model="form.address.country"
        label="Pays"
        :error="fieldErrors.address"
      />

      <!-- Responsabilité légale -->
      <div class="flex flex-col md:col-span-2">
        <label class="mb-1 text-sm">Responsabilité légale</label>
        <select
          v-model="form.legalResponsibility"
          class="border rounded px-3 py-2"
        >
          <option disabled value="">Choisir…</option>
          <option>Mère</option><option>Père</option>
          <option>Tuteurs légaux</option><option>Service d’aide sociale</option>
          <option>Autre</option>
        </select>
        <p
          v-if="fieldErrors.legalResponsibility"
          class="text-red-500 text-xs mt-1"
        >
          {{ fieldErrors.legalResponsibility }}
        </p>
        <BaseInput
          v-if="form.legalResponsibility === 'Autre'"
          v-model="form.legalResponsibilityOther"
          label="Précisez"
          class="mt-2"
          :error="fieldErrors.legalResponsibilityOther"
        />
      </div>
    </div>

    <!-- Contacts d’urgence -->
    <h3 class="text-lg font-semibold mt-6">Contacts d’urgence</h3>
    <div v-if="stepErrors.contacts.length" class="text-red-600 mb-2">
      Veuillez compléter les contacts d’urgence.
    </div>
    <div
      v-for="(c, i) in form.emergencyContacts"
      :key="`ec-${i}`"
      class="border p-4 rounded-lg mb-4 relative"
    >
      <BaseInput
        v-model="c.firstName"
        label="Prénom"
        :error="getFieldError(`emergencyContacts.${i}.name`)"
      />
      <BaseInput
        v-model="c.lastName"
        label="Nom"
        :error="getFieldError(`emergencyContacts.${i}.name`)"
      />

      <div class="flex flex-col">
        <label class="mb-1 text-sm">Lien</label>
        <select v-model="c.relation" class="border rounded px-3 py-2">
          <option disabled value="">Relation…</option>
          <option>Mère</option><option>Père</option>
          <option>Sœur</option><option>Frère</option><option>Grand-parent</option>
          <option>Oncle / Tante</option><option>Cousin / Cousine</option>
          <option>Ami·e de la famille</option><option>Voisin·e</option>
          <option>Autre</option>
        </select>
        <p
          v-if="getFieldError(`emergencyContacts.${i}.relation`)"
          class="text-red-500 text-xs mt-1"
        >
          {{ getFieldError(`emergencyContacts.${i}.relation`) }}
        </p>
        <BaseInput
          v-if="c.relation === 'Autre'"
          v-model="c.relationOther"
          label="Précisez"
          class="mt-2"
          :error="getFieldError(`emergencyContacts.${i}.relationOther`)"
        />
      </div>

      <BaseInput
        v-model="c.phone"
        label="Téléphone"
        :error="getFieldError(`emergencyContacts.${i}.phone`)"
      />
      <button class="absolute top-1 right-1" @click="removeEmergency(i)">✕</button>
    </div>
    <button class="btn" @click="addEmergency">+ Ajouter un contact</button>

    <!-- ÉTAPE 2 -->
    <h2 class="text-xl font-bold mt-10">Étape 2 : Informations de l’enfant</h2>
    <div v-if="stepErrors.children.length" class="text-red-600 mb-2">
      Veuillez compléter les informations de tous les enfants.
    </div>
    <div
      v-for="(child, i) in form.children"
      :key="`ch-${i}`"
      class="border p-4 rounded-lg mb-4 relative"
    >
      <BaseInput
        v-model="child.firstName"
        label="Prénom"
        :error="getFieldError(`children.${i}.firstName`)"
      />
      <BaseInput
        v-model="child.lastName"
        label="Nom"
        :error="getFieldError(`children.${i}.lastName`)"
      />
      <BaseInput
        v-model="child.birthDate"
        label="Date de naissance"
        type="date"
        :error="getFieldError(`children.${i}.birthDate`)"
      />
      <BaseInput
        v-model="child.condition"
        label="Pathologie (optionnel)"
        :error="getFieldError(`children.${i}.condition`)"
      />
      <button class="absolute top-1 right-1" @click="removeChild(i)">✕</button>
    </div>
    <button class="btn" @click="addChild">+ Ajouter un enfant</button>

    <!-- ÉTAPE 3 -->
    <h2 class="text-xl font-bold mt-10">Étape 3 : Création du compte</h2>
    <div v-if="stepErrors.account.length" class="text-red-600 mb-2">
      Veuillez vérifier vos identifiants de connexion.
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <BaseInput
        v-model="form.email"
        label="Email"
        type="email"
        class="md:col-span-2"
        :error="fieldErrors.email"
      />
      <BaseInput
        v-model="form.password"
        label="Mot de passe"
        type="password"
        :error="fieldErrors.password"
      />
      <BaseInput
        v-model="form.passwordConfirm"
        label="Confirmation"
        type="password"
        :error="fieldErrors.passwordConfirm"
      />
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

const BaseInput = defineComponent({
  props: {
    modelValue: String,
    label: String,
    type: { default: 'text' },
    error: String
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const onI = (e: Event) =>
      emit('update:modelValue', (e.target as HTMLInputElement).value)
    return () =>
      h('div', { class: 'flex flex-col relative' }, [
        h('label', { class: 'mb-1 text-sm' }, props.label),
        h('input', {
          class: ['border rounded px-3 py-2', props.error ? 'border-red-500' : ''],
          type: props.type,
          value: props.modelValue,
          onInput: onI,
        }),
        props.error && h('p', { class: 'text-red-500 text-xs mt-1' }, props.error),
      ])
  },
})

const auth = useAuthStore()
const toast = useToast()
const router = useRouter()

const form = reactive({
  firstName: '',
  lastName: '',
  phone: '',
  address: { number: '', street: '', postal: '', city: '', country: '' },
  legalResponsibility: '',
  legalResponsibilityOther: '',
  emergencyContacts: [
    { firstName: '', lastName: '', relation: '', relationOther: '', phone: '' },
  ],
  children: [
    { firstName: '', lastName: '', birthDate: '', condition: '' },
  ],
  email: '',
  password: '',
  passwordConfirm: '',
  notificationPrefs: {},
})

const fieldErrors = reactive<Record<string, string>>({})
const stepErrors = reactive({
  parent: [] as string[],
  contacts: [] as string[],
  children: [] as string[],
  account: [] as string[],
})

function getFieldError(key: string) {
  return fieldErrors[key]
}

function addEmergency() {
  form.emergencyContacts.push({ firstName: '', lastName: '', relation: '', relationOther: '', phone: '' })
}
function removeEmergency(i: number) {
  form.emergencyContacts.splice(i, 1)
}
function addChild() {
  form.children.push({ firstName: '', lastName: '', birthDate: '', condition: '' })
}
function removeChild(i: number) {
  form.children.splice(i, 1)
}

function allChildrenOldEnough() {
  const today = new Date()
  return form.children.every(c => {
    if (!c.birthDate) return false
    const age = (today.getTime() - new Date(c.birthDate).getTime()) / (1000 * 3600 * 24 * 365.25)
    return age >= 9
  })
}

async function submit() {
  // reset errors
  Object.keys(fieldErrors).forEach(k => delete fieldErrors[k])
  stepErrors.parent = []
  stepErrors.contacts = []
  stepErrors.children = []
  stepErrors.account = []

  if (!allChildrenOldEnough()) {
    toast.error('Chaque enfant doit avoir au moins 9 ans')
    return
  }

  const fullAddress =
    `${form.address.number.trim()} ${form.address.street.trim()}, ` +
    `${form.address.postal.trim()} ${form.address.city.trim()}, ${form.address.country.trim()}`

  const legalResp =
    form.legalResponsibility === 'Autre'
      ? `Autre: ${form.legalResponsibilityOther.trim()}`
      : form.legalResponsibility

  const contacts = form.emergencyContacts.map((c, i) => ({
    name: `${c.firstName.trim()} ${c.lastName.trim()}`.trim(),
    phone: c.phone,
    relation:
      c.relation === 'Autre'
        ? `Autre: ${c.relationOther.trim()}`
        : c.relation,
  }))

  try {
    await auth.registerParent({
      firstName: form.firstName,
      lastName: form.lastName,
      phone: form.phone,
      address: fullAddress,
      legalResponsibility: legalResp,
      emergencyContacts: contacts,
      children: form.children,
      email: form.email,
      password: form.password,
      passwordConfirm: form.passwordConfirm,
      notificationPrefs: form.notificationPrefs,
    })
    toast.success('Inscription réussie !')
    router.push('/login')
  } catch (e: any) {
    const errors: Array<{ property: string; message: string }> =
      e.response?.data?.errors || []
    errors.forEach(err => {
      fieldErrors[err.property] = err.message
      if (['firstName','lastName','phone','address','legalResponsibility'].includes(err.property)) {
        stepErrors.parent.push(err.property)
      } else if (err.property.startsWith('emergencyContacts')) {
        stepErrors.contacts.push(err.property)
      } else if (err.property.startsWith('children')) {
        stepErrors.children.push(err.property)
      } else {
        stepErrors.account.push(err.property)
      }
    })
    toast.error('Des erreurs sont présentes, vérifiez les sections')
  }
}
</script>

<style scoped>
.btn { @apply mt-2 px-4 py-2 border rounded; }
.btn-primary { @apply bg-blue-600 text-white px-6 py-3 rounded-lg; }
</style>
