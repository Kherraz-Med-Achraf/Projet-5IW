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
        <input type="checkbox" v-model="otpEnabled" @change="toggleOtp" />
        Activer OTP
      </label>
    </div>

    <!-- Affichage du QR code si OTP activé -->
    <div v-if="otpEnabled && qrCodeDataUrl">
      <h3>QR Code OTP</h3>
      <img :src="qrCodeDataUrl" alt="QR Code OTP" />
      <p><strong>Secret OTP :</strong> {{ secret }}</p>
    </div>

    <!-- Bouton visible uniquement pour les admins -->
    <button v-if="auth.user?.role === 'ADMIN'" @click="wouf">Wouf</button>
    <button @click="logout" :disabled="auth.loading">Déconnexion</button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'vue-toastification'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const toast = useToast()
const router = useRouter()

const otpEnabled = ref(false)
const qrCodeDataUrl = ref('')
const secret = ref('')
const loading = ref(false)

// Vérifie si l'OTP est activé dès le montage ou lorsque l'utilisateur change
onMounted(() => {
  if (auth.user && auth.user.otpSecret) {
    otpEnabled.value = true
  } else {
    otpEnabled.value = false
  }
})
watch(
  () => auth.user,
  (newUser) => {
    if (newUser && newUser.otpSecret) {
      otpEnabled.value = true
    } else {
      otpEnabled.value = false
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
    // Activation OTP
    loading.value = true
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:3000/auth/generate-otp', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        }
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la génération de l’OTP')
      }
      qrCodeDataUrl.value = data.qrCodeDataUrl
      secret.value = data.secret
      toast.success('OTP activé avec succès')
    } catch (err: any) {
      const errorMsg = err?.message || 'Erreur lors de la génération de l’OTP'
      toast.error(errorMsg)
      otpEnabled.value = false
    } finally {
      loading.value = false
    }
  } else {
    // Désactivation OTP
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
</script>

<style scoped>
img {
  max-width: 200px;
}
</style>
