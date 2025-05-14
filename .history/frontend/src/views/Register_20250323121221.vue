<template>
    <div>
      <h2>Register</h2>
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
      };
    },
    methods: {
      async onSubmit() {
        try {
          const response = await fetch('http://localhost:3000/auth/register', {
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
  
          // Stocker le token si tu le souhaites
          if (data && data.access_token) {
            localStorage.setItem('token', data.access_token);
          }
  
          alert('Inscription réussie');
        } catch (error) {
          console.error(error);
        }
      },
    },
  };
  </script>
  