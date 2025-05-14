<template>
    <div>
      <h1>Inscription (front)</h1>
  
      <!-- Affichage de la notification via le store de notifications -->
      <div
        v-if="notification.visible"
        :class="notification.type"
        style="position: fixed; top: 20px; right: 20px; padding: 10px; border-radius: 4px; color: white;"
      >
        {{ notification.message }}
      </div>
  
      <form @submit.prevent="onSubmit">
        <div>
          <label>Email</label>
          <input v-model="email" type="email" required />
        </div>
        <div>
          <label>Password</label>
          <input v-model="password" type="password" required />
        </div>
        <button type="submit" :disabled="auth.loading">S'inscrire</button>
      </form>
    </div>
  </template>
  
  <script>
  import { useAuthStore } from '@/stores/auth'
  import { useNotificationStore } from '@/stores/notificationStore'
  
  export default {
    name: 'Register',
    data() {
      return {
        email: '',
        password: ''
      }
    },
    computed: {
      auth() {
        return useAuthStore()
      },
      notification() {
        return useNotificationStore()
      }
    },
    methods: {
      async onSubmit() {
        await this.auth.register({ email: this.email, password: this.password })
      }
    }
  }
  </script>
  