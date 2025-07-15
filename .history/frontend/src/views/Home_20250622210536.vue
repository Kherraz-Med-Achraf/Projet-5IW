<template>
  <div>
    <h1>Accueil</h1>
    <p>Bienvenue sur votre page d'accueil !</p>

    <p><strong>Adresse email :</strong> {{ auth.user?.email }}</p>
    <p><strong>Rôle :</strong> {{ auth.user?.role }}</p>

    <!-- ───────── OTP ───────── -->
    <div v-if="auth.user">
      <label>
        <input type="checkbox" v-model="otpEnabled" @change="toggleOtp" :disabled="loading" />
        Activer OTP
      </label>
    </div>

    <div v-if="otpEnabled && qrCodeDataUrl">
      <h3>QR Code OTP</h3>
      <img :src="qrCodeDataUrl" alt="QR Code OTP" />
      <p><strong>Secret OTP :</strong> {{ secret }}</p>
      <p class="italic text-gray-500">Scannez le QR code dans Google Authenticator, FreeOTP…</p>
    </div>
    <!-- ──────────────────────── -->

    <button v-if="auth.user?.role === 'ADMIN'" @click="wouf">Wouf</button>
    <button @click="logout" :disabled="auth.loading">Déconnexion</button>

    <!-- ───────── Alerte STAFF ───────── -->
    <div v-if="auth.user?.role === 'STAFF'" class="mt-6 p-4 border rounded-lg">
      <h3 class="text-lg font-semibold mb-2">Jour d'alerte du journal</h3>
      <div class="flex items-center gap-2">
        <input type="number" v-model.number="alertDay" min="1" max="31"
               class="w-20 border rounded px-2 py-1" />
        <button class="bg-green-600 text-white px-4 py-1 rounded" @click="saveAlertDay">Valider</button>
      </div>
      <p class="mt-2 text-sm text-gray-600">
        Le toast apparaîtra le jour choisi si un journal manque pour l'un de vos enfants référents.
      </p>
    </div>
    <!-- ──────────────────────────────── -->

    <!-- ───────── Invitation d'un parent ───────── -->
    <div v-if="['SECRETARY','SERVICE_MANAGER','DIRECTOR','ADMIN'].includes(auth.user?.role)"
         class="mt-8 p-4 border rounded-lg">
      <h3 class="text-lg font-semibold mb-4">Donner un lien d'invitation</h3>

      <div class="flex gap-4 items-end">
        <div class="flex-1">
          <label class="block mb-1 text-sm">Adresse e-mail du parent</label>
          <input v-model="inviteEmail" type="email" placeholder="parent@example.com"
                 class="w-full border rounded px-3 py-2" required />
        </div>
        <button class="bg-blue-600 text-white px-4 py-2 rounded"
                @click="sendInvitation" :disabled="inviteLoading">
          {{ inviteLoading ? 'Envoi…' : 'Envoyer' }}
        </button>
      </div>

      <p v-if="inviteMessage"
         :class="inviteError ? 'text-red-600' : 'text-green-600'"
         class="mt-2">
        {{ inviteMessage }}
      </p>
    </div>
    <!-- ────────────────────────────────────────── -->
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useAuthStore }          from '@/stores/auth'
import { useJournalStore }       from '@/stores/journalStore'
import { useToast }              from 'vue-toastification'
import { useRouter }             from 'vue-router'
import * as QRCode               from 'qrcode'

/* ───── Stores & helpers ───── */
const auth         = useAuthStore()
const journalStore = useJournalStore()
const toast        = useToast()
const router       = useRouter()

/* ───── Reactive state ───── */
const otpEnabled      = ref(false)
const qrCodeDataUrl   = ref('')
const secret          = ref('')
const loading         = ref(false)

const alertDay        = ref<number>(25)

const inviteEmail     = ref('')
const inviteLoading   = ref(false)
const inviteMessage   = ref('')
const inviteError     = ref(false)

/* ───── Init OTP & alertDay ───── */
onMounted(async () => {
  // OTP (stocké dans localStorage après login)
  const storedUser = localStorage.getItem('user')
  if (storedUser) {
    const u = JSON.parse(storedUser)
    if (u?.otpEnabled) {
      otpEnabled.value = true
      // Le back ne renvoie pas le secret après reconnexion ; on laisse vide
    }
  }
  // Jour d'alerte
  const saved = localStorage.getItem('alertDay')
  if (saved) {
    const d = Number(saved)
    if (d >= 1 && d <= 31) alertDay.value = d
  }
})

/* ───── Alerte STAFF déclenchée dès que auth.user est dispo ───── */
watch(
  () => auth.user,
  async (user) => {
    if (user?.role !== 'STAFF') return        // seul le STAFF est concerné

    /* 1) enfants référents ------------------------------------------------ */
    await journalStore.fetchReferentChildren()

    /* 2) on ne vérifie qu'à partir du jour paramétré ---------------------- */
    const today = new Date()
    if (today.getDate() < alertDay.value) return

    /* 3) récupération des journaux du mois en cours ----------------------- */
    const monthStr = today.toISOString().slice(0, 7)    // "YYYY-MM"
    await journalStore.fetchEntries(monthStr)

    /* 4) on dresse la liste des childId qui SONT déjà soumis -------------- */
    const submittedIds = new Set(
      journalStore.entries
        .filter(e => e.isSubmitted)          // on ne garde que les validés
        .map(e => e.childId)                 // puis on récupère l'id de l'enfant
    )

    /* 5) il manque un journal si le childId n'est pas dans le Set ---------- */
    const missing = journalStore.childrenRefered
      .filter(c => !submittedIds.has(c.id))

    /* 6) toast si besoin --------------------------------------------------- */
    if (missing.length) {
      const names = missing
        .map(c => `${c.firstName} ${c.lastName}`)
        .join(', ')
      toast.warning(`Journaux manquants pour : ${names}`)
    }
  },
  { immediate: true }
)


/* ───── Actions UI ───── */
function saveAlertDay() {
  if (alertDay.value < 1 || alertDay.value > 31) {
    return toast.error('Jour invalide (1-31)')
  }
  localStorage.setItem('alertDay', alertDay.value.toString())
  toast.success(`Alerte configurée pour le ${alertDay.value} de chaque mois`)
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
    const endpoint = otpEnabled.value ? 'disable-otp' : 'enable-otp'
    const token    = localStorage.getItem('token') || ''
    const res      = await fetch(`http://localhost:3000/auth/${endpoint}`, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message)

    otpEnabled.value = !otpEnabled.value
    if (otpEnabled.value) {
      secret.value       = data.secret
      qrCodeDataUrl.value = data.qrCodeDataUrl
      toast.success('OTP activé')
    } else {
      secret.value       = ''
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
  if (!inviteEmail.value.trim()) {
    inviteError.value   = true
    inviteMessage.value = 'Veuillez saisir une adresse e-mail.'
    return
  }
  inviteLoading.value = true
  try {
    const token = localStorage.getItem('token') || ''
    const res = await fetch('http://localhost:3000/invitations', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body   : JSON.stringify({ email: inviteEmail.value.trim(), roleToAssign: 'PARENT' })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message)

    inviteMessage.value = 'Invitation envoyée avec succès !'
    inviteEmail.value   = ''
    toast.success(inviteMessage.value)
  } catch (e) {
    inviteError.value   = true
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
