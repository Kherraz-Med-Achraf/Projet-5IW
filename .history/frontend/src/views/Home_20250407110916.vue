<template>
  <div>
    <h1>Accueil</h1>
    <p>Bienvenue sur votre page d'accueil !</p>
    <p>
      <strong>Voici ton adresse email :</strong> {{ auth.user?.email }}
    </p>
    <p>
      <strong>Ton rôle :</strong> {{ auth.user?.role }}
    </p>
    <!-- Bouton pour activer l'OTP si l'utilisateur est connecté et OTP non activé -->
    <button v-if="auth.user && !auth.user.otpSecret" @click="generateOtp" :disabled="loading">
      Activer OTP
    </button>
    <!-- Afficher le QR code si généré -->
    <div v-if="qrCodeDataUrl">
      <h3>QR Code OTP</h3>
      <img :src="qrCodeDataUrl" alt="QR Code OTP" />
      <p>Secret OTP : {{ secret }}</p>
    </div>
    <!-- Bouton visible uniquement pour les admins -->
    <button v-if="auth.user?.role === 'ADMIN'" @click="wouf">Wouf</button>
    <button @click="logout" :disabled="auth.loading">Déconnexion</button>
  </div>
</template>

<script>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

export default {
  name: 'Home',
  data() {
    return {
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
    async generateOtp() {
      this.loading = true
      try {
        // Récupérer le token depuis le localStorage
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
      } catch (error) {
        console.error('Erreur:', error)
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
img {
  max-width: 200px;
}
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-content {
  background: #fff;
  padding: 2rem;
  border-radius: 4px;
  text-align: center;
}
</style>
