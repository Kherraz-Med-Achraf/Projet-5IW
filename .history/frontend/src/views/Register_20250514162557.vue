<template>
  <div class="max-w-3xl mx-auto p-6 space-y-8">
    <h2 class="text-xl font-bold">Étape 1 : Informations du parent</h2>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <BaseInput v-model="form.firstName" label="Prénom" />
      <BaseInput v-model="form.lastName" label="Nom" />
      <BaseInput v-model="form.phone" label="Téléphone (+33)" />
      <BaseInput v-model="form.address" label="Adresse" class="md:col-span-2" />
      <BaseInput v-model="form.legalResponsibility" label="Responsabilité légale" class="md:col-span-2" />
    </div>

    <h3 class="text-lg font-semibold mt-6">Contacts d’urgence</h3>
    <div
      v-for="(c, i) in form.emergencyContacts"
      :key="`ec-${i}`"
      class="border p-4 rounded-lg mb-4 relative"
    >
      <BaseInput v-model="c.name" label="Nom" />
      <BaseInput v-model="c.relation" label="Lien" />
      <BaseInput v-model="c.phone" label="Téléphone" />
      <button class="absolute top-1 right-1" @click="removeEmergency(i)">✕</button>
    </div>
    <button class="btn" @click="addEmergency">+ Ajouter un contact</button>

    <h2 class="text-xl font-bold mt-10">Étape 2 : Informations de l’enfant</h2>
    <div
      v-for="(child, i) in form.children"
      :key="`ch-${i}`"
      class="border p-4 rounded-lg mb-4 relative"
    >
      <BaseInput v-model="child.firstName" label="Prénom" />
      <BaseInput v-model="child.lastName" label="Nom" />
      <BaseInput v-model="child.birthDate" label="Date de naissance" type="date" />
      <BaseInput v-model="child.condition" label="Pathologie (optionnel)" />
      <button class="absolute top-1 right-1" @click="removeChild(i)">✕</button>
    </div>
    <button class="btn" @click="addChild">+ Ajouter un enfant</button>

    <h2 class="text-xl font-bold mt-10">Étape 3 : Création du compte</h2>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <BaseInput v-model="form.email" label="Email" type="email" class="md:col-span-2" />
      <BaseInput v-model="form.password" label="Mot de passe" type="password" />
      <BaseInput v-model="form.passwordConfirm" label="Confirmation" type="password" />
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
    type: { type: String, default: 'text' },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const update = (e: Event) =>
      emit('update:modelValue', (e.target as HTMLInputElement).value)
    return () =>
      h('div', { class: 'flex flex-col' }, [
        h('label', { class: 'mb-1 text-sm' }, props.label),
        h('input', {
          class: 'border rounded px-3 py-2',
          type: props.type,
          value: props.modelValue,
          onInput: update,
          required: true,
        }),
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
  address: '',
  legalResponsibility: '',
  emergencyContacts: [{ name: '', relation: '', phone: '' }],
  children: [{ firstName: '', lastName: '', birthDate: '', condition: '' }],
  email: '',
  password: '',
  passwordConfirm: '',
  notificationPrefs: {},
})

function addEmergency() {
  form.emergencyContacts.push({ name: '', relation: '', phone: '' })
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

async function submit() {
  try {
    await auth.registerParent(form)
    toast.success('Inscription réussie !')
    router.push('/login')
  } catch (e: any) {
    toast.error(auth.error || e.response?.data?.message || 'Erreur')
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
