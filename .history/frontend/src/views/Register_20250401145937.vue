<template>
    <div>
      <h1>Inscription (front)</h1>
  
      <!-- Messages d’alerte -->
      <div v-if="auth.error" style="color: red;">{{ auth.error }}</div>
      <div v-if="successMessage" style="color: green;">{{ successMessage }}</div>
  
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
  
  export default {
    name: 'Register',
    data() {
      return {
        email: '',
        password: '',
        successMessage: ''
      }
    },
    computed: {
      auth() {
        return useAuthStore()
      }
    },
    methods: {
      async onSubmit() {
        // Réinitialiser les messages
        this.successMessage = ''
        this.auth.error = ''
  
        // Appeler l'action register du store
        await this.auth.register({ email: this.email, password: this.password })
  
        // Vérifier si le token a été stocké, indiquant une inscription réussie
        if (this.auth.token) {
          this.successMessage = 'Inscription réussie !'
        }
      }
    }
  }
  </script>
  