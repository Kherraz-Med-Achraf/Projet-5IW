<template>
    <div>
      <h1>Connexion (front)</h1>
  
      <!-- Messages d’alerte -->
      <div v-if="errorMessage" style="color: red;">{{ errorMessage }}</div>
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
        <button type="submit">Se connecter</button>
      </form>
    </div>
  </template>
  
  <script>
  export default {
    name: 'Login',
    data() {
      return {
        email: '',
        password: '',
        errorMessage: '',
        successMessage: ''
      }
    },
    methods: {
      async onSubmit() {
        // On réinitialise nos messages
        this.errorMessage = ''
        this.successMessage = ''
  
        try {
          const response = await fetch('http://localhost:3000/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              email: this.email,
              password: this.password
            })
          })
  
          const data = await response.json()
  
          if (!response.ok) {
            console.error('Erreur connexion:', data.message)
            this.errorMessage = data.message || 'Une erreur est survenue.'
            return
          }
  
          console.log('Connexion réussie !', data)
          // Stocker le token si besoin
          if (data.access_token) {
            localStorage.setItem('token', data.access_token)
          }
  
          this.successMessage = 'Connexion réussie !'
        } catch (error) {
          console.error('Erreur fetch connexion:', error)
          this.errorMessage = 'Erreur de connexion au serveur.'
        }
      }
    }
  }
  </script>
  