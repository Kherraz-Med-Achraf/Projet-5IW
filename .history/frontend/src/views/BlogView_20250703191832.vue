<template>
  <main class="profile-container" role="main" lang="fr">
    <!-- Skip links pour navigation rapide -->
    <div class="skip-links">
      <a href="#main-content" class="skip-link">Aller au contenu principal</a>
      <a href="#blog-actions" class="skip-link">Aller aux actions</a>
      <a href="#blog-posts" class="skip-link">Aller aux articles</a>
    </div>

    <!-- Content -->
    <div class="profile-content" id="main-content">
      <div class="content-grid">
        <!-- En-tête du blog -->
        <div class="profile-section">
          <div class="section-header">
            <h1 id="blog-title">
              <i class="material-icons" aria-hidden="true">article</i>
              Blog de l'école
            </h1>
            <div class="info-note" role="note">
              <i class="material-icons" aria-hidden="true">info</i>
              <span>Suivez l'actualité et les moments forts de notre établissement</span>
            </div>
          </div>

          <!-- Actions du blog -->
          <div id="blog-actions" class="blog-actions">
            <!-- Bouton pour créer un post -->
            <button
              v-if="canCreatePost"
              class="edit-btn"
              @click="showCreateModal = true"
              type="button"
              aria-label="Créer un nouvel article de blog"
            >
              <i class="material-icons" aria-hidden="true">add</i>
              Créer un article
            </button>

            <!-- Message d'information pour les autres rôles -->
            <div v-if="!canCreatePost && authStore.user" class="info-message">
              <i class="material-icons" aria-hidden="true">visibility</i>
              <p>Vous pouvez consulter les articles et laisser des réactions</p>
            </div>
          </div>
        </div>

        <!-- Section des articles -->
        <div class="profile-section" id="blog-posts">
          <div class="section-header">
            <h2>
              <i class="material-icons" aria-hidden="true">feed</i>
              Articles récents
              <span v-if="posts.length > 0" class="post-count">({{ posts.length }})</span>
            </h2>
          </div>

          <!-- États de chargement et erreur -->
          <div v-if="blogStore.loading" class="loading-indicator">
            <i class="material-icons spinning" aria-hidden="true">hourglass_empty</i>
            <span>Chargement des articles...</span>
          </div>

          <div v-else-if="blogStore.error" class="error-state">
            <i class="material-icons" aria-hidden="true">error</i>
            <p>{{ blogStore.error }}</p>
            <button @click="reloadPosts" class="edit-btn">
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
            <div class="empty-icon">
              <i class="material-icons" aria-hidden="true">article</i>
            </div>
            <h3>Aucun article pour le moment</h3>
            <p v-if="canCreatePost">Soyez le premier à publier un article !</p>
            <p v-else>Les articles apparaîtront ici dès qu'ils seront publiés.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de création de post -->
    <CreatePostForm
      :visible="showCreateModal"
      @close="showCreateModal = false"
      @post-created="handlePostCreatedModal"
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
  // Le post est déjà ajouté au store, on peut faire un scroll vers le haut
  window.scrollTo({ top: 0, behavior: "smooth" });
};

const handlePostCreatedModal = () => {
  handlePostCreated();
  showCreateModal.value = false;
};

// Lifecycle
onMounted(() => {
  // Charger les posts au montage du composant
  blogStore.fetchPosts();
});
</script>

<style scoped lang="scss">
/* Variables CSS pour cohérence avec les autres pages */
:root {
  --primary-color: #4444ac;
  --primary-hover: #3333a0;
  --primary-focus: #2222a5;
  --success-color: #10b981;
  --warning-color: #f59e0b;
  --error-color: #ef4444;
  --danger-color: #dc2626;
  --text-primary: #1f2937;
  --text-secondary: #6b7280;
  --text-muted: #9ca3af;
  --border-color: #e5e7eb;
  --background-light: #f9fafb;
  --card-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  --card-shadow-hover: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

/* Classes d'accessibilité */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Skip links */
.skip-links {
  position: absolute;
  top: -40px;
  left: 6px;
  z-index: 1000;
}

.skip-link {
  position: absolute;
  top: -40px;
  left: 6px;
  background: var(--primary-color);
  color: white;
  padding: 8px 16px;
  text-decoration: none;
  border-radius: 4px;
  font-weight: 600;
  transition: top 0.3s ease;
}

.skip-link:focus {
  top: 0;
}

/* Container principal - même style que les autres pages */
.profile-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 2rem 0;
  font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
}

.profile-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

.content-grid {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* Sections - même style que les autres pages */
.profile-section {
  background: white;
  border-radius: 1rem;
  border: 1px solid var(--border-color);
  box-shadow: var(--card-shadow);
  overflow: hidden;
  transition: box-shadow 0.3s ease;
}

.profile-section:hover {
  box-shadow: var(--card-shadow-hover);
}

/* Headers de section */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2rem;
  border-bottom: 1px solid var(--border-color);
  background: linear-gradient(135deg, #fafbfc 0%, #f1f5f9 100%);
}

.section-header h1,
.section-header h2 {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.section-header h2 {
  font-size: 1.5rem;
}

.section-header h1 i,
.section-header h2 i {
  color: var(--primary-color);
  font-size: 1.75rem;
}

.post-count {
  font-size: 1rem;
  color: var(--text-secondary);
  font-weight: 400;
}

/* Note d'information */
.info-note {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(68, 68, 172, 0.1);
  color: var(--primary-color);
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.info-note i {
  font-size: 1rem;
}

/* Actions du blog */
.blog-actions {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.info-message {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: var(--background-light);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  padding: 1rem;
  color: var(--text-secondary);
}

.info-message i {
  color: var(--primary-color);
  font-size: 1.25rem;
}

.info-message p {
  margin: 0;
  font-size: 0.875rem;
}

/* Boutons - style réseau social */
.edit-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  text-decoration: none;
  min-height: 44px;
  box-shadow: 0 2px 4px rgba(68, 68, 172, 0.2);
}

.edit-btn:hover {
  background: var(--primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(68, 68, 172, 0.3);
}

.edit-btn:focus {
  outline: 2px solid var(--primary-focus);
  outline-offset: 2px;
}

.edit-btn:active {
  transform: translateY(0);
}

.edit-btn i {
  font-size: 1.125rem;
}

/* Grille des posts - style réseau social */
.posts-grid {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 2rem;
  max-width: 600px;
  margin: 0 auto;
}

.blog-post-card {
  background: white;
  border-radius: 1rem;
  border: 1px solid var(--border-color);
  box-shadow: var(--card-shadow);
  transition: all 0.3s ease;
  overflow: hidden;
}

.blog-post-card:hover {
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  border-color: rgba(68, 68, 172, 0.2);
}

/* États de chargement et erreur */
.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 4rem 2rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.loading-indicator i {
  font-size: 1.5rem;
  color: var(--primary-color);
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 4rem 2rem;
  text-align: center;
  color: var(--error-color);
}

.error-state i {
  font-size: 3rem;
  color: var(--error-color);
}

.error-state p {
  margin: 0;
  font-size: 1rem;
  font-weight: 500;
}

/* État vide */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 4rem 2rem;
  text-align: center;
  color: var(--text-secondary);
}

.empty-icon {
  width: 80px;
  height: 80px;
  background: var(--background-light);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
}

.empty-icon i {
  font-size: 2.5rem;
  color: var(--text-muted);
}

.empty-state h3 {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
}

.empty-state p {
  margin: 0;
  font-size: 1rem;
  color: var(--text-secondary);
  max-width: 400px;
}

/* Responsive design */
@media (max-width: 768px) {
  .profile-container {
    padding: 1rem 0;
  }
  
  .profile-content {
    padding: 0 0.5rem;
  }
  
  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
    padding: 1.5rem;
  }
  
  .section-header h1,
  .section-header h2 {
    font-size: 1.5rem;
  }
  
  .posts-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
    padding: 1.5rem;
  }
  
  .blog-actions {
    padding: 1.5rem;
  }
}

/* Support du mode contraste élevé */
@media (prefers-contrast: high) {
  .edit-btn {
    border: 2px solid white;
  }
  
  .profile-section {
    border-width: 2px;
  }
  
  .info-note {
    border: 2px solid var(--primary-color);
  }
}

/* Support pour les animations réduites */
@media (prefers-reduced-motion: reduce) {
  .profile-section,
  .blog-post-card,
  .edit-btn {
    transition: none;
  }
  
  .loading-indicator i.spinning {
    animation: none;
  }
  
  .blog-post-card:hover,
  .edit-btn:hover {
    transform: none;
  }
}
</style>
