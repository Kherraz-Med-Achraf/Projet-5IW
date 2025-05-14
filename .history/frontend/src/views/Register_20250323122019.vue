<template>
    <div>
      <h1>Inscription (front)</h1>
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
        password: ''
      }
    },
    methods: {
      async onSubmit() {
        try {
          // On appelle le back Nest, qui tourne sur http://localhost:3000
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
  
          if (!response.ok) {
            console.error('Erreur inscription:', data.message)
            return
          }
  
          console.log('Inscription réussie !', data)
          // Option : stocker le token si tu l'as
          if (data.access_token) {
            localStorage.setItem('token', data.access_token)
          }
        } catch (error) {
          console.error('Erreur fetch inscription:', error)
        }
      }
    }
  }
  </script>
  