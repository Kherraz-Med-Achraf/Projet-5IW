<template>
    <div>
      <h1>Activation OTP</h1>
      <div v-if="loading">Chargement...</div>
      <div v-else>
        <div v-if="qrCodeDataUrl">
          <p>Scannez ce QR code avec votre application (Google Authenticator, etc.).</p>
          <img :src="qrCodeDataUrl" alt="QR Code OTP" />
          <p>Secret OTP : {{ secret }}</p>
        </div>
        <div v-else>
          <button @click="generateOtp" :disabled="loading">Générer OTP</button>
        </div>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref } from 'vue'
  import { useNotificationStore } from '@/stores/notificationStore'
  
  const loading = ref(false)
  const qrCodeDataUrl = ref('')
  const secret = ref('')
  const notification = useNotificationStore()
  
  async function generateOtp() {
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
        throw new Error(data.message || 'Erreur lors de la génération de OTP')
      }
      qrCodeDataUrl.value = data.qrCodeDataUrl
      secret.value = data.secret
      notification.showNotification('OTP activé avec succès', 'success')
    } catch (error: any) {
      notification.showNotification(error.message || 'Erreur lors de la génération de OTP', 'error')
    } finally {
      loading.value = false
    }
  }
  </script>
  
  <style scoped>
  img {
    max-width: 200px;
  }
  </style>
  