<template>
  <div class="blog-view">
    <!-- En-tête du blog -->
    <header class="blog-header">
      <div class="header-content">
        <h1>📝 Blog de l'école</h1>
        <p class="header-subtitle">Suivez l'actualité et les moments forts de notre établissement</p>
      </div>
    </header>

    <div class="blog-container">
      <!-- Formulaire de création pour les secrétaires -->
      <CreatePostForm
        v-if="canCreatePost"
        @post-created="handlePostCreated"
      />

      <!-- Message d'information pour les autres rôles -->
      <div v-else-if="authStore.user" class="info-message">
        <p>👋 Bienvenue sur le blog ! Vous pouvez consulter les posts et laisser des réactions.</p>
      </div>

      <!-- États de chargement et erreur -->
      <div v-if="blogStore.loading" class="loading-state">
        <div class="spinner"></div>
        <p>Chargement des posts...</p>
      </div>

      <div v-else-if="blogStore.error" class="error-state">
        <p>❌ {{ blogStore.error }}</p>
        <button @click="reloadPosts" class="retry-btn">Réessayer</button>
      </div>

      <!-- Liste des posts -->
      <div v-else-if="posts.length > 0" class="posts-list">
        <BlogPost
          v-for="post in posts"
          :key="post.id"
          :post="post"
        />
      </div>

      <!-- Message si aucun post -->
      <div v-else class="empty-state">
        <div class="empty-icon">📰</div>
        <h3>Aucun post pour le moment</h3>
        <p v-if="canCreatePost">Soyez le premier à publier un post !</p>
        <p v-else>Les posts apparaîtront ici dès qu'ils seront publiés.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useBlogStore } from '@/stores/blogStore'
import CreatePostForm from '@/components/blog/CreatePostForm.vue'
import BlogPost from '@/components/blog/BlogPost.vue'

// Stores
const authStore = useAuthStore()
const blogStore = useBlogStore()

// Computed
const canCreatePost = computed(() => {
  return authStore.user?.role === 'SECRETARY'
})

const posts = computed(() => {
  return blogStore.sortedPosts
})

// Méthodes
const reloadPosts = async () => {
  await blogStore.fetchPosts()
}

const handlePostCreated = () => {
  // Le post est déjà ajouté au store, on peut faire un scroll vers le haut
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// Lifecycle
onMounted(() => {
  // Charger les posts au montage du composant
  blogStore.fetchPosts()
})
</script>

<style scoped lang="scss">
.blog-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.blog-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 60px 0 80px;
  text-align: center;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 20"><defs><radialGradient id="a" cx="50%" cy="50%"><stop offset="0%" stop-color="rgba(255,255,255,.1)"/><stop offset="100%" stop-color="rgba(255,255,255,0)"/></radialGradient></defs><circle fill="url(%23a)" cx="10" cy="10" r="10"/><circle fill="url(%23a)" cx="30" cy="5" r="8"/><circle fill="url(%23a)" cx="60" cy="15" r="6"/><circle fill="url(%23a)" cx="80" cy="8" r="7"/></svg>');
    opacity: 0.1;
  }

  .header-content {
    position: relative;
    z-index: 1;

    h1 {
      font-size: 3rem;
      font-weight: 700;
      margin-bottom: 16px;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }

    .header-subtitle {
      font-size: 1.2rem;
      opacity: 0.9;
      max-width: 600px;
      margin: 0 auto;
    }
  }
}

.blog-container {
  max-width: 800px;
  margin: -60px auto 0;
  padding: 0 20px 40px;
  position: relative;
  z-index: 2;
}

.info-message {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-left: 4px solid #3498db;

  p {
    margin: 0;
    color: #2c3e50;
    font-size: 16px;
  }
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #e1e8ed;
    border-top: 4px solid #3498db;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
  }

  p {
    color: #7f8c8d;
    margin: 0;
  }
}

.error-state {
  text-align: center;
  padding: 40px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-left: 4px solid #e74c3c;

  p {
    color: #e74c3c;
    margin-bottom: 16px;
    font-size: 16px;
  }

  .retry-btn {
    padding: 10px 20px;
    background: #3498db;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    transition: background-color 0.3s;

    &:hover {
      background: #2980b9;
    }
  }
}

.posts-list {
  margin-top: 0;
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  .empty-icon {
    font-size: 4rem;
    margin-bottom: 20px;
    opacity: 0.7;
  }

  h3 {
    color: #2c3e50;
    font-size: 1.5rem;
    margin-bottom: 12px;
  }

  p {
    color: #7f8c8d;
    font-size: 16px;
    margin: 0;
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

// Responsive
@media (max-width: 768px) {
  .blog-header {
    padding: 40px 0 60px;

    .header-content h1 {
      font-size: 2.2rem;
    }

    .header-content .header-subtitle {
      font-size: 1rem;
    }
  }

  .blog-container {
    margin-top: -40px;
    padding: 0 16px 40px;
  }

  .loading-state,
  .error-state,
  .empty-state {
    padding: 40px 16px;
  }
}
</style> 