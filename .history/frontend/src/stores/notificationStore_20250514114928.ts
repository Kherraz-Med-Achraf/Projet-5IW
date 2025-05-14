
import { defineStore } from 'pinia'

export const useNotificationStore = defineStore('notification', {
  state: () => ({
    message: '',
    type: '', 
    visible: false,
  }),
  actions: {
    showNotification(message: string, type: string = 'success') {
      this.message = message
      this.type = type
      this.visible = true
      setTimeout(() => {
        this.visible = false
      }, 3000)
    },
    hideNotification() {
      this.visible = false
    },
  },
})
