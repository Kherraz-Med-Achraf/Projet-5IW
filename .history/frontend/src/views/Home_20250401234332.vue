<template>
    <div>
      <h1>Accueil</h1>
      <!-- Affichage de la notification globale -->
      <div
        v-if="notification.visible"
        :class="notification.type"
        style="position: fixed; top: 20px; right: 20px; padding: 10px; border-radius: 4px; color: white;"
      >
        {{ notification.message }}
      </div>
      <p>Bienvenue sur votre page d'accueil !</p>
    </div>
  </template>
  
  <script>
  import { useNotificationStore } from '@/stores/notificationStore'
  
  export default {
    name: 'Home',
    computed: {
      notification() {
        return useNotificationStore()
      }
    }
  }
  </script>
  