<template>
  <div>
    <h1>Connexion (front)</h1>

    <!-- Affichage d'une erreur (si présente) -->
    <div v-if="auth.error" style="color: red;">{{ auth.error }}</div>

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
      password: ''
    }
  },
  computed: {
    auth() {
      return useAuthStore()
    }
  },
  methods: {
    async onSubmit() {
      // Réinitialiser l'erreur
      this.auth.error = ''

      // Appel de l'action login dans le store d'authentification
      await this.auth.login({ email: this.email, password: this.password })

      // Si un token est récupéré, rediriger vers /home
      if (this.auth.token) {
        this.$router.push('/home')
      }
    }
  }
}
</script>
