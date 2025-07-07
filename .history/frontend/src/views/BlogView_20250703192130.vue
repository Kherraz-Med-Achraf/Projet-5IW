<template>
  <main class="blog-container" role="main" lang="fr">
    <div class="blog-content">
      <div class="content-grid">
        <!-- En-tête moderne -->
        <div class="blog-header">
          <h1 class="blog-title">Blog de l'école</h1>
          <p class="blog-subtitle">Suivez l'actualité et les moments forts de notre établissement</p>
        </div>

        <!-- Section créer article -->
        <div class="create-post-section">
          <button
            v-if="canCreatePost"
            class="create-post-btn"
            @click="showCreateModal = true"
            type="button"
            aria-label="Créer un nouvel article de blog"
          >
            <i class="material-icons" aria-hidden="true">add</i>
            <span>Créer un article</span>
          </button>

          <div v-if="!canCreatePost && authStore.user" class="info-message">
            <i class="material-icons" aria-hidden="true">visibility</i>
            <p>Vous pouvez consulter les articles et laisser des réactions</p>
          </div>
        </div>

        <!-- Section des articles -->
        <div class="posts-section">
          <!-- États de chargement et erreur -->
          <div v-if="blogStore.loading" class="loading-state">
            <div class="spinner"></div>
            <span>Chargement des articles...</span>
          </div>

          <div v-else-if="blogStore.error" class="error-state">
            <i class="material-icons" aria-hidden="true">error</i>
            <p>{{ blogStore.error }}</p>
            <button @click="reloadPosts" class="retry-btn">
              <i class="material-icons" aria-hidden="true">refresh</i>
              Réessayer
            </button>
          </div>

          <!-- Liste des posts -->
          <div v-else-if="posts.length > 0" class="posts-grid">
            <BlogPost 
              v-for="post in posts" 
              :key="post.id" 
              :post="post"
              class="blog-post-card"
            />
          </div>

          <!-- État vide -->
          <div v-else class="empty-state">
            <i class="material-icons empty-icon" aria-hidden="true">article</i>
            <h3 class="empty-title">Aucun article pour le moment</h3>
            <p class="empty-description" v-if="canCreatePost">
              Soyez le premier à publier un article !
            </p>
            <p class="empty-description" v-else>
              Les articles apparaîtront ici dès qu'ils seront publiés.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de création de post -->
    <CreatePostForm
      :visible="showCreateModal"
      @close="showCreateModal = false"
      @post-created="handlePostCreated"
    />
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useAuthStore } from "@/stores/auth";
import { useBlogStore } from "@/stores/blogStore";
import CreatePostForm from "@/components/blog/CreatePostForm.vue";
import BlogPost from "@/components/blog/BlogPost.vue";

// Stores
const authStore = useAuthStore();
const blogStore = useBlogStore();

// State
const showCreateModal = ref(false);

// Computed
const canCreatePost = computed(() => {
  const userRole = authStore.user?.role;
  return (
    userRole === "SECRETARY" ||
    userRole === "DIRECTOR" ||
    userRole === "SERVICE_MANAGER"
  );
});

const posts = computed(() => {
  return blogStore.sortedPosts;
});

// Méthodes
const reloadPosts = async () => {
  await blogStore.fetchPosts();
};

const handlePostCreated = () => {
  showCreateModal.value = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
};

// Lifecycle
onMounted(() => {
  blogStore.fetchPosts();
});
</script>

<style scoped lang="scss">
/* Variables CSS modernes */
:root {
  --primary-color: #6366f1;
  --primary-hover: #4338ca;
  --purple-color: #8b5cf6;
  --text-primary: #0f172a;
  --text-secondary: #64748b;
  --text-muted: #94a3b8;
  --border-color: #e2e8f0;
  --background-light: #f8fafc;
  --error-color: #ef4444;
  --success-color: #10b981;
}

/* Container principal */
.blog-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  font-family: 'Inter', 'Satoshi', -apple-system, BlinkMacSystemFont, sans-serif;
  position: relative;
  overflow-x: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.05) 0%, transparent 50%),
      radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.05) 0%, transparent 50%),
      radial-gradient(circle at 40% 60%, rgba(236, 72, 153, 0.03) 0%, transparent 50%);
    pointer-events: none;
    z-index: 0;
  }
}

.blog-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 24px;
  position: relative;
  z-index: 1;
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 40px;
  max-width: 680px;
  margin: 0 auto;
}

/* En-tête moderne */
.blog-header {
  text-align: center;
  margin-bottom: 48px;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 200px;
    height: 200px;
    background: radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%);
    border-radius: 50%;
    z-index: -1;
  }
}

.blog-title {
  font-size: 3rem;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0 0 16px 0;
  background: linear-gradient(135deg, #1e293b 0%, #4338ca 50%, #7c3aed 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.02em;
  line-height: 1.1;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    bottom: -8px;
    left: 50%;
    transform: translateX(-50%);
    width: 60px;
    height: 4px;
    background: linear-gradient(90deg, #6366f1, #8b5cf6);
    border-radius: 2px;
    opacity: 0.8;
  }
}

.blog-subtitle {
  font-size: 1.125rem;
  color: var(--text-secondary);
  margin: 0;
  max-width: 480px;
  margin: 0 auto;
  line-height: 1.6;
  font-weight: 400;
}

/* Section créer article */
.create-post-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  margin-bottom: 48px;
  position: relative;
}

.create-post-btn {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 16px 32px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
  box-shadow: 
    0 8px 24px rgba(99, 102, 241, 0.25),
    0 0 0 1px rgba(255, 255, 255, 0.1) inset;
  position: relative;
  overflow: hidden;
  font-family: inherit;
  letter-spacing: -0.01em;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.2) 50%,
      transparent 100%
    );
    transition: left 0.6s ease;
  }
  
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.2) 0%,
      transparent 50%,
      rgba(255, 255, 255, 0.1) 100%
    );
    border-radius: inherit;
    pointer-events: none;
  }

  &:hover {
    transform: translateY(-4px) scale(1.05);
    box-shadow: 
      0 20px 40px rgba(99, 102, 241, 0.35),
      0 0 0 1px rgba(255, 255, 255, 0.2) inset;
    
    &::before {
      left: 100%;
    }
  }

  &:active {
    transform: translateY(-2px) scale(1.02);
  }

  i {
    font-size: 20px;
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  &:hover i {
    transform: rotate(10deg) scale(1.1);
  }

  span {
    font-family: inherit;
    font-weight: 600;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }
}

.info-message {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  background: rgba(99, 102, 241, 0.08);
  border: 1px solid rgba(99, 102, 241, 0.15);
  border-radius: 16px;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  backdrop-filter: blur(10px);
  
  i {
    color: var(--primary-color);
    font-size: 18px;
  }
  
  p {
    margin: 0;
    line-height: 1.4;
  }
}

/* Section des articles */
.posts-section {
  position: relative;
}

.posts-grid {
  display: flex;
  flex-direction: column;
  gap: 32px;
  position: relative;
  
  > * {
    animation: fadeInUp 0.6s cubic-bezier(0.165, 0.84, 0.44, 1) forwards;
    opacity: 0;
    transform: translateY(20px);
    
    &:nth-child(1) { animation-delay: 0.1s; }
    &:nth-child(2) { animation-delay: 0.2s; }
    &:nth-child(3) { animation-delay: 0.3s; }
    &:nth-child(4) { animation-delay: 0.4s; }
    &:nth-child(5) { animation-delay: 0.5s; }
  }
}

@keyframes fadeInUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* État de chargement */
.loading-state {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 16px;
  height: 200px;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  
  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(99, 102, 241, 0.1);
    border-top: 3px solid #6366f1;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* État d'erreur */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 40px 24px;
  background: rgba(239, 68, 68, 0.05);
  border: 1px solid rgba(239, 68, 68, 0.15);
  border-radius: 20px;
  text-align: center;
  
  i {
    font-size: 48px;
    color: var(--error-color);
    opacity: 0.7;
  }
  
  p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 16px;
    line-height: 1.5;
  }
}

.retry-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: var(--error-color);
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
  font-family: inherit;
  
  &:hover {
    background: #dc2626;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
  }
  
  i {
    font-size: 18px;
  }
}

/* État vide */
.empty-state {
  text-align: center;
  padding: 80px 24px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.06),
    0 1px 0 rgba(255, 255, 255, 0.8) inset;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 150px;
    height: 150px;
    background: radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%);
    border-radius: 50%;
    z-index: -1;
  }
}

.empty-icon {
  font-size: 4rem;
  color: #cbd5e1;
  margin-bottom: 24px;
  background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

.empty-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #475569;
  margin: 0 0 12px 0;
  letter-spacing: -0.02em;
}

.empty-description {
  font-size: 1rem;
  color: var(--text-secondary);
  margin: 0;
  max-width: 400px;
  margin: 0 auto;
  line-height: 1.6;
}

/* Responsive */
@media (max-width: 1024px) {
  .blog-content {
    padding: 32px 20px;
  }
  
  .content-grid {
    max-width: 100%;
    gap: 32px;
  }
}

@media (max-width: 768px) {
  .blog-title {
    font-size: 2.5rem;
  }
  
  .blog-subtitle {
    font-size: 1rem;
  }
  
  .create-post-btn {
    padding: 14px 28px;
    font-size: 15px;
    gap: 10px;
    
    i {
      font-size: 18px;
    }
  }
  
  .posts-grid {
    gap: 24px;
  }
  
  .empty-state {
    padding: 60px 20px;
  }
  
  .empty-icon {
    font-size: 3rem;
  }
  
  .empty-title {
    font-size: 1.25rem;
  }
}

@media (max-width: 480px) {
  .blog-content {
    padding: 24px 16px;
  }
  
  .blog-title {
    font-size: 2rem;
  }
  
  .create-post-btn {
    padding: 12px 24px;
    font-size: 14px;
    border-radius: 16px;
  }
  
  .blog-header {
    margin-bottom: 32px;
  }
  
  .create-post-section {
    margin-bottom: 32px;
  }
  
  .info-message {
    padding: 12px 16px;
    font-size: 13px;
  }
}

/* Accessibilité */
@media (prefers-contrast: high) {
  .blog-container {
    background: white;
  }
  
  .blog-title {
    background: none;
    -webkit-text-fill-color: var(--text-primary);
    color: var(--text-primary);
  }
  
  .create-post-btn {
    background: #4338ca;
    border: 2px solid #3730a3;
  }
  
  .empty-state {
    background: white;
    border: 2px solid var(--border-color);
  }
}

@media (prefers-reduced-motion: reduce) {
  * {
    transition: none !important;
    animation: none !important;
  }
  
  .create-post-btn:hover {
    transform: none;
  }
  
  .spinner {
    animation: none;
    border-top-color: #6366f1;
  }
  
  .posts-grid > * {
    animation: none;
    opacity: 1;
    transform: none;
  }
}

/* Focus states */
.create-post-btn:focus-visible,
.retry-btn:focus-visible {
  outline: 2px solid #6366f1;
  outline-offset: 2px;
}
</style> 