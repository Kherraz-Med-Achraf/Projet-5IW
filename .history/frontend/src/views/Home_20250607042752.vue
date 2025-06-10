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

    <!-- ───────── Configuration de l'alerte pour STAFF ───────── -->
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
    <!-- ──────────────────────────────────────────────────────── -->

    <!-- ───────── Invitation d’un parent ───────── -->
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
    <!-- ──────────────────────────────────── -->
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'vue-toastification'
import { useRouter } from 'vue-router'
import * as QRCode from 'qrcode'


const auth = useAuthStore()
const journalStore = useJournalStore()
const toast = useToast()
const router = useRouter()

const otpEnabled = ref(false)
const qrCodeDataUrl = ref('')
const secret = ref('')
const loading = ref(false)

// Alert day for STAFF
const alertDay = ref<number>(25) // default to 25

// Variables pour l’invitation
const inviteEmail = ref('')
const inviteLoading = ref(false)
const inviteMessage = ref('')
const inviteError = ref(false)

// Load saved alert day
onMounted(async () => {
  const saved = localStorage.getItem('alertDay')
  if (saved) {
    const day = Number(saved)
    if (!isNaN(day) && day >= 1 && day <= 31) {
      alertDay.value = day
    }
  }

  if (auth.user?.role === 'STAFF') {
    // Charger enfants référents
    await journalStore.fetchReferentChildren()
    const today = new Date()
    if (today.getDate() === alertDay.value) {
      const currentMonth = today.toISOString().slice(0, 7)
      await journalStore.fetchEntries(currentMonth)
      const entries = journalStore.entries
      const childIds = journalStore.childrenRefered.map(c => c.id)
      const missing = childIds.filter(id => !entries.some(e => e.childId === id))
      if (missing.length > 0) {
        toast.warning(
          "Veuillez remplir le journal de bord de tous vos enfants référents pour ce mois."
        )
      }
    }
  }
})

watch(
  () => auth.user,
  async (newUser) => {
    if (newUser?.otpSecret) {
      otpEnabled.value = true
      secret.value = newUser.otpSecret
      const dataUrl = await QRCode.toDataURL(
        `otpauth://totp/${encodeURIComponent("MyApp")}?secret=${secret.value}&issuer=${encodeURIComponent("MyApp")}`
      )
      qrCodeDataUrl.value = dataUrl
    } else {
      otpEnabled.value = false
      qrCodeDataUrl.value = ''
      secret.value = ''
    }
  },
  { immediate: true }
)

function saveAlertDay() {
  if (alertDay.value < 1 || alertDay.value > 31) {
    toast.error("Veuillez saisir un jour valide entre 1 et 31.")
    return
  }
  localStorage.setItem('alertDay', alertDay.value.toString())
  toast.success(`Alerte configurée pour le jour ${alertDay.value} de chaque mois.`)
}

function logout() {
  auth.logout()
  router.push('/login')
}

function wouf() {
  console.log('wouf 🐶')
}

async function toggleOtp() {
  loading.value = true
  try {
    const token = localStorage.getItem('token') || ''
    const endpoint = otpEnabled.value ? 'disable-otp' : 'enable-otp'
    const res = await fetch(`http://localhost:3000/auth/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || res.statusText)
    otpEnabled.value = !otpEnabled.value
    if (otpEnabled.value) {
      qrCodeDataUrl.value = data.qrCodeDataUrl
      secret.value = data.secret
      toast.success(data.message || 'OTP activé avec succès')
    } else {
      qrCodeDataUrl.value = ''
      secret.value = ''
      toast.info(data.message || 'OTP désactivé avec succès')
    }
  } catch (err: any) {
    toast.error(err.message || 'Erreur lors de la mise à jour de l’OTP')
  } finally {
    loading.value = false
  }
}

async function sendInvitation() {
  if (!inviteEmail.value.trim()) {
    inviteError.value = true
    inviteMessage.value = 'Veuillez saisir une adresse e-mail.'
    return
  }
  inviteLoading.value = true
  inviteError.value = false
  try {
    const token = localStorage.getItem('token') || ''
    const res = await fetch('http://localhost:3000/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ email: inviteEmail.value.trim(), roleToAssign: 'PARENT' })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || res.statusText)
    inviteMessage.value = 'Invitation envoyée avec succès !'
    inviteEmail.value = ''
    toast.success(inviteMessage.value)
  } catch (e: any) {
    inviteError.value = true
    inviteMessage.value = e.message
    toast.error(inviteMessage.value)
  } finally {
    inviteLoading.value = false
  }
}
</script>

<style scoped>
img { max-width: 200px; }
</style>
