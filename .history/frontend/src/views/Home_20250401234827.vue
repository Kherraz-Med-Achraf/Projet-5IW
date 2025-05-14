<template>
    <div>
      <h1>Accueil</h1>
      <!-- Notification globale -->
      <div
        v-if="notification.visible"
        :class="notification.type"
        style="position: fixed; top: 20px; right: 20px; padding: 10px; border-radius: 4px; color: white;"
      >
        {{ notification.message }}
      </div>
      <p>Bienvenue sur votre page d'accueil !</p>
      <button @click="logout" :disabled="auth.loading">Déconnexion</button>
    </div>
  </template>
  
  <script>
  import { useNotificationStore } from '@/stores/notificationStore'
  import { useAuthStore } from '@/stores/auth'
  
  export default {
    name: 'Home',
    computed: {
      notification() {
        return useNotificationStore()
      },
      auth() {
        return useAuthStore()
      }
    },
    methods: {
      logout() {
        this.auth.logout()
        this.$router.push('/login
        ')
      }
    }
  }
  </script>
  