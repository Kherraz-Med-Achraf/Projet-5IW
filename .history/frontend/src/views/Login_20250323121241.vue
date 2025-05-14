<template>
    <div>
      <h2>Login</h2>
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
      };
    },
    methods: {
      async onSubmit() {
        try {
          const response = await fetch('http://localhost:3000/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: this.email,
              password: this.password,
            }),
          });
          const data = await response.json();
  
          if (!response.ok) {
            console.error('Erreur:', data.message);
            return;
          }
  
          // Stocker le token
          if (data && data.access_token) {
            localStorage.setItem('token', data.access_token);
          }
  
          alert('Connexion réussie');
        } catch (error) {
          console.error(error);
        }
      },
    },
  };
  </script>
  