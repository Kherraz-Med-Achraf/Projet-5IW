<template>
    <div>
      <h1>Connexion (front)</h1>
  
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
        <button type="submit" :disabled="auth.loading">Se connecter</button>
      </form>
    </div>
  </template>
  
  <script>
  import { useAuthStore } from '@/stores/auth'
  
  export default {
    name: 'Login',
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
        // Réinitialiser le message de succès et l'erreur du store
        this.successMessage = ''
        this.auth.error = ''
  
        // Appel de l'action login dans le store
        await this.auth.login({ email: this.email, password: this.password })
  
        // Si un token a été récupéré, afficher un message de succès
        if (this.auth.token) {
          this.successMessage = 'Connexion réussie !'
        }
      }
    }
  }
  </script>
  