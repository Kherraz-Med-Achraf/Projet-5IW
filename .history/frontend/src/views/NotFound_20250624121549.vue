<template>
  <div class="not-found">
    <div class="not-found__container">
      <h1 class="not-found__title">404</h1>
      <h2 class="not-found__subtitle">Page non trouvée</h2>
      <p class="not-found__message">
        La page que vous recherchez n'existe pas ou a été déplacée.
      </p>
      <router-link to="/" class="not-found__button">
        Retour à l'accueil
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
// Page 404 simple
</script>

<style scoped lang="scss">
.not-found {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f8fafc;
  
  &__container {
    text-align: center;
    padding: 2rem;
  }
  
  &__title {
    font-size: 6rem;
    font-weight: bold;
    color: #e11d48;
    margin: 0;
  }
  
  &__subtitle {
    font-size: 2rem;
    color: #374151;
    margin: 1rem 0;
  }
  
  &__message {
    color: #6b7280;
    margin-bottom: 2rem;
  }
  
  &__button {
    background: #3b82f6;
    color: white;
    padding: 0.75rem 1.5rem;
    border-radius: 6px;
    text-decoration: none;
    font-weight: 500;
    
    &:hover {
      background: #1d4ed8;
    }
  }
}
</style>
