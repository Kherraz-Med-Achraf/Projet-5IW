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

    <!-- ───────── OTP ───────── -->
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
    <!-- ──────────────────────── -->

    <!-- ───────── Bouton admin ───────── -->
    <button v-if="auth.user?.role === 'ADMIN'" @click="wouf">Wouf</button>
    
    <button @click="logout" :disabled="auth.loading">Déconnexion</button>
    <!-- ──────────────────────────────────── -->

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
      <p
        v-if="inviteMessage"
        :class="inviteError ? 'text-red-600' : 'text-green-600'"
        class="mt-2"
      >
        {{ inviteMessage }}
      </p>
    </div>
    <!-- ──────────────────────────────────── -->

    <!-- ───────── Notification mensuelle (seulement STAFF avec enfants référés) ───────── -->
    <div
      v-if="auth.user?.role === 'STAFF' && childStore.referentChildren.length > 0"
      class="mt-8 p-4 border rounded-lg bg-yellow-50"
    >
      <h3 class="text-lg font-semibold mb-4">Notification mensuelle</h3>
      <p class="mb-2 text-sm text-gray-700">
        Vous recevrez chaque mois un rappel si vous n'avez pas soumis tous les rapports de vos enfants référés.
      </p>
      <div class="flex items-center gap-2">
        <label class="text-sm">Jour de notification :</label>
        <input
          type="number"
          v-model.number="notifyDay"
          min="1"
          max="28"
          class="w-16 border rounded px-2 py-1"
        />
        <button
          @click="saveNotifyDay"
          class="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm"
        >
          Sauvegarder
        </button>
      </div>
    </div>
    <!-- ──────────────────────────────────────────────────────────────────── -->
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useJournalStore } from '@/stores/journalStore'
import { useChildStore } from '@/stores/childStore'
import { useToast } from 'vue-toastification'
import { useRouter } from 'vue-router'
import * as QRCode from 'qrcode'

const auth = useAuthStore()
const journalStore = useJournalStore()
const childStore = useChildStore()
const toast = useToast()
const router = useRouter()

// OTP
const otpEnabled = ref(false)
const qrCodeDataUrl = ref('')
const secret = ref('')
const loading = ref(false)

// Invitation
const inviteEmail = ref('')
const inviteLoading = ref(false)
const inviteMessage = ref('')
const inviteError = ref(false)

// Notification mensuelle
const notifyDay = ref<number>(
  Number(localStorage.getItem('notifyDay')) || 25
)

// Génére le QR code OTP
async function generateQRCodeFromSecret(otpSecret: string) {
  const label = encodeURIComponent("MyApp (ex: Google Auth Label)")
  const issuer = encodeURIComponent("MyApp Issuer")
  const otpauthUrl = `otpauth://totp/${label}?secret=${otpSecret}&issuer=${issuer}`
  try {
    qrCodeDataUrl.value = await QRCode.toDataURL(otpauthUrl)
  } catch (error) {
    console.error("Erreur génération QR code", error)
  }
}

// Sauvegarde la date de notification dans localStorage
function saveNotifyDay() {
  localStorage.setItem('notifyDay', notifyDay.value.toString())
  toast.success(`Jour de notification enregistré : ${notifyDay.value}`)
}

// À la montée du composant
onMounted(async () => {
  // Hydratation OTP
  const storedUser = localStorage.getItem('user')
  if (storedUser) {
    const parsed = JSON.parse(storedUser)
    if (parsed.otpSecret) {
      otpEnabled.value = true
      secret.value = parsed.otpSecret
      await generateQRCodeFromSecret(parsed.otpSecret)
    }
  }

  // Pour STAFF référents uniquement : rappel mensuel si rapports manquants
  if (auth.user?.role === 'STAFF') {
    await childStore.fetchReferentChildren()
    if (childStore.referentChildren.length > 0) {
      const today = new Date().getDate()
      const lastDay = new Date().getFullYear() === new Date().getFullYear()
        ? new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
        : 31
      if (today >= notifyDay.value && today <= lastDay) {
        const yearId = new Date().getFullYear() // adapter si besoin
        for (const child of childStore.referentChildren) {
          await journalStore.fetchJournals(child.id, yearId)
          const hasSubmitted = journalStore.journals.some(
            j => j.month === new Date().getMonth() + 1 && j.isSubmitted
          )
          if (!hasSubmitted) {
            toast.warning(
              `Vous n'avez pas encore soumis le rapport du mois pour ${child.firstName} ${child.lastName}.`
            )
          }
        }
      }
    }
  }
})

// ... reste de vos fonctions OTP, invitation, logout, etc.
// (toggleOtp, sendInvitation, logout, etc.)
function logout() {
  auth.logout()
  router.push('/login')
}

// (implémentation de toggleOtp et sendInvitation inchangées)
</script>

<style scoped>
img {
  max-width: 200px;
}
</style>
