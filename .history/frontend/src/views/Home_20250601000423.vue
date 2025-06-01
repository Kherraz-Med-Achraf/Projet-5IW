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
const toast = useToast()
const router = useRouter()

const otpEnabled = ref(false)
const qrCodeDataUrl = ref('')
const secret = ref('')
const loading = ref(false)

// Variables pour l’invitation
const inviteEmail = ref('')
const inviteLoading = ref(false)
const inviteMessage = ref('')
const inviteError = ref(false)

async function generateQRCodeFromSecret(otpSecret: string) {
  const label = encodeURIComponent("MyApp (ex: Google Auth Label)")
  const issuer = encodeURIComponent("MyApp Issuer")
  const otpauthUrl = `otpauth://totp/${label}?secret=${otpSecret}&issuer=${issuer}`
  try {
    const dataUrl = await QRCode.toDataURL(otpauthUrl)
    qrCodeDataUrl.value = dataUrl
    console.log("QR code généré avec URL:", otpauthUrl)
  } catch (error) {
    console.error("Erreur lors de la génération du QR code", error)
  }
}

onMounted(async () => {
  console.log("Hydratation terminée", auth.user)
  const storedUser = localStorage.getItem('user')
  if (storedUser) {
    const parsedUser = JSON.parse(storedUser)
    console.log("Utilisateur stocké dans localStorage :", parsedUser)
    if (parsedUser && parsedUser.otpSecret) {
      console.log("OTP secret trouvé :", parsedUser.otpSecret)
      otpEnabled.value = true
      secret.value = parsedUser.otpSecret
      await generateQRCodeFromSecret(parsedUser.otpSecret)
    } else {
      otpEnabled.value = false
    }
  } else {
    otpEnabled.value = false
  }
})

watch(
  () => auth.user,
  async (newUser) => {
    console.log("Changement de auth.user :", newUser)
    if (newUser && newUser.otpSecret) {
      console.log("OTP secret dans auth.user :", newUser.otpSecret)
      otpEnabled.value = true
      secret.value = newUser.otpSecret
      await generateQRCodeFromSecret(newUser.otpSecret)
    } else {
      otpEnabled.value = false
      qrCodeDataUrl.value = ''
      secret.value = ''
    }
  },
  { immediate: true }
)

function logout() {
  auth.logout()
  router.push('/login')
}

function wouf() {
  console.log('wouf 🐶')
}

async function toggleOtp() {
  if (otpEnabled.value) {
    loading.value = true
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:3000/auth/enable-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de l’activation OTP')
      }
      qrCodeDataUrl.value = data.qrCodeDataUrl || ''
      secret.value = data.secret || ''
      if (auth.user) {
        auth.user.otpSecret = data.secret
        localStorage.setItem('user', JSON.stringify(auth.user))
      }
      toast.success(data.message || 'OTP activé avec succès')
    } catch (err: any) {
      const errorMsg = err?.message || 'Erreur lors de l’activation OTP'
      toast.error(errorMsg)
      otpEnabled.value = false
    } finally {
      loading.value = false
    }
  } else {
    loading.value = true
    try {
      const result = await auth.disableOtp()
      toast.info(result.message || 'OTP désactivé avec succès')
      qrCodeDataUrl.value = ''
      secret.value = ''
    } catch (err: any) {
      const errorMsg = err?.message || 'Erreur lors de la désactivation de l’OTP'
      toast.error(errorMsg)
      otpEnabled.value = true
    } finally {
      loading.value = false
    }
  }
}

// Fonction pour envoyer l’invitation (utilisation de fetch)
async function sendInvitation() {
  if (!inviteEmail.value.trim()) {
    inviteError.value = true
    inviteMessage.value = 'Veuillez saisir une adresse e-mail.'
    return
  }

  inviteLoading.value = true
  inviteMessage.value = ''
  inviteError.value = false

  try {
    const token = localStorage.getItem('token') || ''
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const response = await fetch('http://localhost:3000/invitations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        email: inviteEmail.value.trim(),
        roleToAssign: 'PARENT',
        expiresAt,
      }),
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.message || 'Erreur lors de l’envoi de l’invitation.')
    }
    inviteLoading.value = false
    inviteError.value = false
    inviteMessage.value = 'Invitation envoyée avec succès !'
    inviteEmail.value = ''
  } catch (e: any) {
    inviteLoading.value = false
    inviteError.value = true
    inviteMessage.value = e.message || 'Erreur lors de l’envoi de l’invitation.'
    toast.error(inviteMessage.value)
  }
}
</script>

<style scoped>
img {
  max-width: 200px;
}
</style>
