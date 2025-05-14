// Projet-5IW/frontend/src/stores/notificationStore.ts
import { defineStore } from 'pinia'

export const useNotificationStore = defineStore('notification', {
  state: () => ({
    message: '',
    type: '', // 'success' ou 'error'
    visible: false,
  }),
  actions: {
    showNotification(message: string, type: string = 'success') {
      this.message = message
      this.type = type
      this.visible = true
      // Masquer automatiquement après 3 secondes
      setTimeout(() => {
        this.visible = false
      }, 3000)
    },
    hideNotification() {
      this.visible = false
    },
  },
})
