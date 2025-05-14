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

<script>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'vue-toastification'

export default {
  name: 'Home',
  data() {
    return {
      otpEnabled: false,
      qrCodeDataUrl: '',
      secret: '',
      loading: false,
    }
  },
  computed: {
    auth() {
      return useAuthStore()
    }
  },
  methods: {
    logout() {
      this.auth.logout()
      this.$router.push('/login')
    },
    wouf() {
      console.log('wouf 🐶')
    },
    async toggleOtp() {
      if (this.otpEnabled) {
        // Activation OTP : Génération du QR code et affichage du secret
        this.loading = true
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
          this.qrCodeDataUrl = data.qrCodeDataUrl
          this.secret = data.secret
          this.$toast.success('OTP activé avec succès')
        } catch (error) {
          this.$toast.error(error.message || 'Erreur lors de la génération de l’OTP')
          // En cas d'erreur, réinitialiser la checkbox
          this.otpEnabled = false
        } finally {
          this.loading = false
        }
      } else {
        // Désactivation OTP : appel à l'endpoint disableOtp du store
        this.loading = true
        try {
          const result = await this.auth.disableOtp()
          if (result.message) {
            this.$toast.info(result.message)
          }
          // Réinitialiser l'affichage du QR code et du secret
          this.qrCodeDataUrl = ''
          this.secret = ''
        } catch (error) {
          this.$toast.error(error.message || 'Erreur lors de la désactivation de l’OTP')
          // En cas d'erreur, garder la checkbox cochée
          this.otpEnabled = true
        } finally {
          this.loading = false
        }
      }
    }
  }
}
</script>

<style scoped>
img {
  max-width: 200px;
}
</style>
