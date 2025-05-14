<template>
    <div>
      <h1>Accueil</h1>
      <p v-if="$route.query.message">{{ $route.query.message }}</p>
      <p v-else>Bienvenue sur votre page d'accueil !</p>
    </div>
  </template>
  
  <script>
  export default {
    name: 'Home'
  }
  </script>
  