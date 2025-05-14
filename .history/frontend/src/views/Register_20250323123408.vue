<template>
    <div>
      <h1>Inscription (front)</h1>
  
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
        <button type="submit">S'inscrire</button>
      </form>
    </div>
  </template>
  
  <script>
  export default {
    name: 'Register',
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
          const response = await fetch('http://localhost:3000/auth/register', {
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
  
          // Si le statut HTTP n'est pas OK (400, 401, 500, etc.), on gère l'erreur
          if (!response.ok) {
            console.error('Erreur inscription:', data.message)
            this.errorMessage = data.message || 'Une erreur est survenue.'
            return
          }
  
          console.log('Inscription réussie !', data)
          // Si un token est renvoyé, on peut le stocker
          if (data.access_token) {
            localStorage.setItem('token', data.access_token)
          }
  
          // On affiche le message de succès
          this.successMessage = 'Inscription réussie !'
        } catch (error) {
          console.error('Erreur fetch inscription:', error)
          this.errorMessage = 'Erreur de connexion au serveur.'
        }
      }
    }
  }
  </script>
  