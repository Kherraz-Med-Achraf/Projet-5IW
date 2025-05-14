<template>
    <div>
      <h1>Accueil</h1>
      <p>Bienvenue sur votre page d'accueil !</p>
      <button @click="logout" :disabled="auth.loading">Déconnexion</button>
    </div>
  </template>
  
  <script>
  import { useAuthStore } from '@/stores/auth'
  
  export default {
    name: 'Home',
    computed: {
      auth() {
        return useAuthStore()
      }
    },
    methods: {
      logout() {
        this.auth.logout()
        this.$router.push('/login')
      }
    }
  }
  </script>
  