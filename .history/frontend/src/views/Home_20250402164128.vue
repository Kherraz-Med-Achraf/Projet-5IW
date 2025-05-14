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
  
      <!-- ✅ Bouton visible uniquement pour les admins -->
      <button v-if="auth.user?.role === 'ADMIN'" @click="wouf">Wouf</button>
  
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
      },
      wouf() {
        console.log('wouf 🐶')
      }
    }
  }
  </script>
  