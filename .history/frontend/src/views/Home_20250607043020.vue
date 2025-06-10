<template>
  <div>
    <h1>Accueil</h1>
    <p>Bienvenue sur votre page d'accueil !</p>
    <p>
      <strong>Adresse email :</strong> {{ auth.user?.email }}
    </p>
    <p>
      <strong>Rôle :</strong> {{ auth.user?.role }}
    </p>

    <div v-if="auth.user">
      <label>
        <input
          type="checkbox"
          v-model="otpEnabled"
          @change="toggleOtp"
          :disabled="loading"
        />
        Activer OTP
      </label>
    </div>

    <div v-if="otpEnabled && qrCodeDataUrl">
      <h3>QR Code OTP</h3>
      <img :src="qrCodeDataUrl" alt="QR Code OTP" />
      <p><strong>Secret OTP :</strong> {{ secret }}</p>
      <p style="font-style: italic; color: gray">
        Scannez ce QR code dans Google Authenticator, FreeOTP, etc.
      </p>
    </div>

    <button v-if="auth.user?.role === 'ADMIN'" @click="wouf">Wouf</button>
    <button @click="logout" :disabled="auth.loading">Déconnexion</button>

    <!-- Alerte STAFF -->
    <div v-if="auth.user?.role === 'STAFF'" class="mt-6 p-4 border rounded-lg">
      <h3 class="text-lg font-semibold mb-2">Jour d'alerte du journal</h3>
      <div class="flex items-center gap-2">
        <input
          type="number"
          v-model.number="alertDay"
          min="1"
          max="31"
          class="w-20 border rounded px-2 py-1"
        />
        <button
          class="bg-green-600 text-white px-4 py-1 rounded"
          @click="saveAlertDay"
        >
          Valider
        </button>
      </div>
      <p class="mt-2 text-sm text-gray-600">
        Le toast d'alerte apparaîtra le jour sélectionné de chaque mois si un journal est manquant.
      </p>
    </div>

    <!-- Invitation -->
    <div
      v-if="['SECRETARY','SERVICE_MANAGER','DIRECTOR','ADMIN'].includes(auth.user?.role)"
      class="mt-8 p-4 border rounded-lg"
    >
      <h3 class="text-lg font-semibold mb-4">Donner un lien d’invitation</h3>
      <div class="flex gap-4 items-end">
        <div class="flex-1">
          <label class="block mb-1 text-sm">Adresse e-mail du parent</label>
          <input
            v-model="inviteEmail"
            type="email"
            class="w-full border rounded px-3 py-2"
            placeholder="parent@example.com"
            required
          />
        </div>
        <button
          class="bg-blue-600 text-white px-4 py-2 rounded"
          @click="sendInvitation"
          :disabled="inviteLoading"
        >
          {{ inviteLoading ? 'Envoi…' : 'Envoyer' }}
        </button>
      </div>
      <p v-if="inviteMessage" :class="inviteError ? 'text-red-600' : 'text-green-600'" class="mt-2">
        {{ inviteMessage }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'vue-toastification'
import { useRouter } from 'vue-router'
import * as QRCode from 'qrcode'
import { useJournalStore } from '@/stores/journalStore'

const auth = useAuthStore()
const journalStore = useJournalStore()
const toast = useToast()
const router = useRouter()

const otpEnabled = ref(false)
const qrCodeDataUrl = ref<string>('')
const secret = ref<string>('')
const loading = ref(false)
const alertDay = ref<number>(25)
const inviteEmail = ref<string>('')
const inviteLoading = ref(false)
const inviteMessage = ref<string>('')
const inviteError = ref(false)

onMounted(async () => {
  // OTP
  const storedUser = localStorage.getItem('user')
  if (storedUser) {
    const parsed = JSON.parse(storedUser)
    if (parsed.otpSecret) {
      otpEnabled.value = true
      secret.value = parsed.otpSecret
      qrCodeDataUrl.value = await QRCode.toDataURL(
        `otpauth://totp/${encodeURIComponent('MyApp')}?secret=${secret.value}&issuer=${encodeURIComponent('MyApp')}`
      )
    }
  }

  // Alert day
  const saved = localStorage.getItem('alertDay')
  if (saved) {
    const day = Number(saved)
    if (day >= 1 && day <= 31) alertDay.value = day
  }

  // STAFF alert
  if (auth.user?.role === 'STAFF') {
    console.log('Fetching referent children')
    await journalStore.fetchReferentChildren()
    console.log('Children refered:', journalStore.childrenRefered)
    const today = new Date()
    if (today.getDate() === alertDay.value) {
      console.log('Today matches alertDay')
      const month = today.toISOString().slice(0, 7)
      await journalStore.fetchEntries(month)
      console.log('Entries:', journalStore.entries)
      const ids = journalStore.childrenRefered.map(c => c.id)
      const missing = ids.filter(id => !journalStore.entries.some(e => e.childId === id))
      if (missing.length) {
        toast.warning('Veuillez remplir le journal de bord de tous vos enfants référents pour ce mois.')
      }
    }
  }
})

function saveAlertDay() {
  if (alertDay.value < 1 || alertDay.value > 31) {
    return toast.error('Jour invalide')
  }
  localStorage.setItem('alertDay', alertDay.value.toString())
  toast.success(`Alerte : jour ${alertDay.value}`)
}

function logout() {
  auth.logout()
  router.push('/login')
}

function wouf() {
  console.log('wouf')
}

async function toggleOtp() {
  loading.value = true
  try {
    const endpoint = otpEnabled.value ? 'disable-otp' : 'enable-otp'
    const token = localStorage.getItem('token') || ''
    const res = await fetch(`http://localhost:3000/auth/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message)
    otpEnabled.value = !otpEnabled.value
    if (otpEnabled.value) {
      secret.value = data.secret
      qrCodeDataUrl.value = data.qrCodeDataUrl
      toast.success('OTP activé')
    } else {
      secret.value = ''
      qrCodeDataUrl.value = ''
      toast.info('OTP désactivé')
    }
  } catch (e) {
    toast.error((e as Error).message)
  } finally {
    loading.value = false
  }
}

async function sendInvitation() {
  if (!inviteEmail.value) return (inviteError.value = true, inviteMessage.value = 'Email?')
  inviteLoading.value = true
  try {
    const token = localStorage.getItem('token') || ''
    const res = await fetch('http://localhost:3000/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email: inviteEmail.value.trim(), roleToAssign: 'PARENT' })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message)
    inviteMessage.value = 'Invit envoyé'
    inviteEmail.value = ''
    toast.success(inviteMessage.value)
  } catch (e) {
    inviteError.value = true
    inviteMessage.value = (e as Error).message
    toast.error(inviteMessage.value)
  } finally {
    inviteLoading.value = false
  }
}
</script>

<style scoped>
img { max-width: 200px; }
</style>
