<template>
  <div class="not-found">
    <div class="container">
      <div class="error-code">404</div>
      <h1 class="title">Page non trouvée</h1>
      <p class="description">
        Désolé, la page que vous recherchez n'existe pas ou a été déplacée.
      </p>

      <router-link to="/home" class="home-button">
        Retour à l'accueil
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
// Aucun script nécessaire pour cette page statique
</script>

<style scoped>
.not-found {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
}

.container {
  text-align: center;
  padding: 2rem;
  max-width: 500px;
}

.error-code {
  font-size: 8rem;
  font-weight: 900;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1;
  margin-bottom: 1rem;
  text-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.title {
  font-size: 2rem;
  font-weight: 700;
  color: white;
  margin-bottom: 1rem;
  letter-spacing: -0.02em;
}

.description {
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 2.5rem;
  line-height: 1.6;
}

.home-button {
  display: inline-block;
  padding: 1rem 2rem;
  background: white;
  color: #667eea;
  text-decoration: none;
  border-radius: 50px;
  font-weight: 600;
  font-size: 1rem;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.home-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 25px rgba(0, 0, 0, 0.3);
  background: #f8f9ff;
}

.home-button:active {
  transform: translateY(0);
}

@media (max-width: 768px) {
  .error-code {
    font-size: 6rem;
  }

  .title {
    font-size: 1.5rem;
  }

  .description {
    font-size: 1rem;
  }

  .container {
    padding: 1rem;
  }
}
</style>
