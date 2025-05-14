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

    <!-- Checkbox pour activer/désactiver l'OTP -->
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

    <!-- Affichage du QR code si OTP activé -->
    <div v-if="otpEnabled && qrCodeDataUrl">
      <h3>QR Code OTP</h3>
      <img :src="qrCodeDataUrl" alt="QR Code OTP" />
      <p><strong>Secret OTP :</strong> {{ secret }}</p>
      <p style="font-style: italic; color: gray">
        Scannez ce QR code dans Google Authenticator, FreeOTP, etc.
      </p>
    </div>

    <!-- Bouton visible uniquement pour les admins -->
    <button v-if="auth.user?.role === 'ADMIN'" @click="wouf">
      Wouf
    </button>
    
    <button @click="logout" :disabled="auth.loading">Déconnexion</button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'vue-toastification'
import { useRouter } from 'vue-router'
import * as QRCode from 'qrcode'  // Pour générer le QR code côté navigateur

const auth = useAuthStore()
const toast = useToast()
const router = useRouter()

const otpEnabled = ref(false)
const qrCodeDataUrl = ref('')
const secret = ref('')
const loading = ref(false)

// Fonction pour générer le QR code à partir du secret OTP existant
async function generateQRCodeFromSecret(otpSecret: string) {
  // Ces valeurs doivent correspondre à celles définies dans ton backend
  const label = encodeURIComponent("MyApp (ex: Google Auth Label)")
  const issuer = encodeURIComponent("MyApp Issuer")
  const otpauthUrl = `otpauth://totp/${label}?secret=${otpSecret}&issuer=${issuer}`
  try {
    const dataUrl = await QRCode.toDataURL(otpauthUrl)
    qrCodeDataUrl.value = dataUrl
  } catch (error) {
    console.error("Erreur lors de la génération du QR code", error)
  }
}

// Au montage, si l'utilisateur a déjà activé l'OTP, on coche la case et on génère le QR code
onMounted(() => {
  if (auth.user && auth.user.otpSecret) {
    otpEnabled.value = true
    secret.value = auth.user.otpSecret
    generateQRCodeFromSecret(auth.user.otpSecret)
  } else {
    otpEnabled.value = false
  }
})

// Surveille les changements sur auth.user pour mettre à jour l'état OTP
watch(
  () => auth.user,
  (newUser) => {
    if (newUser && newUser.otpSecret) {
      otpEnabled.value = true
      secret.value = newUser.otpSecret
      generateQRCodeFromSecret(newUser.otpSecret)
    } else {
      otpEnabled.value = false
      qrCodeDataUrl.value = ''
      secret.value = ''
    }
  },
  { immediate: true }
)

async function toggleOtp() {
  if (otpEnabled.value) {
    // Si la case est cochée et que l'OTP n'est pas encore activé en base, on l'active
    if (!auth.user || !auth.user.otpSecret) {
      loading.value = true
      try {
        const token = localStorage.getItem('token')
        const response = await fetch('http://localhost:3000/auth/enable-otp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
          },
          credentials: 'include',
        })
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.message || 'Erreur lors de l’activation OTP')
        }
        // Met à jour le QR code et le secret depuis la réponse
        qrCodeDataUrl.value = data.qrCodeDataUrl || ''
        secret.value = data.secret || ''
        if (auth.user) {
          auth.user.otpSecret = data.secret
        }
        toast.success(data.message || 'OTP activé avec succès')
      } catch (err: any) {
        const errorMsg = err?.message || 'Erreur lors de l’activation OTP'
        toast.error(errorMsg)
        otpEnabled.value = false  // On réinitialise la checkbox en cas d'erreur
      } finally {
        loading.value = false
      }
    }
  } else {
    // Si la case est décochée, on désactive l'OTP
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

function logout() {
  auth.logout()
  router.push('/login')
}

function wouf() {
  console.log('wouf 🐶')
}
</script>

<style scoped>
img {
  max-width: 200px;
}
</style>
