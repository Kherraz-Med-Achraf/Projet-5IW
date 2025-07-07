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
import { computed, onMounted, ref, watch, onUnmounted } from "vue";
import { useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useBlogStore } from "@/stores/blogStore";
import CreatePostForm from "@/components/blog/CreatePostForm.vue";
import BlogPost from "@/components/blog/BlogPost.vue";

// Routing
const route = useRoute();

// Stores
const authStore = useAuthStore();
const blogStore = useBlogStore();

// State
const showCreateModal = ref(false);

// Computed
const canCreatePost = computed(() => {
  const userRole = authStore.user?.role;
  return (
    userRole === "ADMIN" ||
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

// Fonction pour charger les données
const loadBlogData = async () => {
  // Attendre que l'utilisateur soit prêt
  if (!authStore.user) {
    console.log('BlogView: User not ready yet, skipping data load');
    return;
  }
  
  console.log('BlogView: Loading blog data...');
  try {
    await blogStore.fetchPosts();
    console.log('BlogView: Blog data loaded successfully');
  } catch (error) {
    console.error('BlogView: Error loading blog data:', error);
  }
};

// Lifecycle
onMounted(() => {
  console.log('BlogView: Component mounted');
  console.log('BlogView: Auth user:', authStore.user);
  console.log('BlogView: Route name:', route.name);
  console.log('BlogView: Route path:', route.path);
  loadBlogData();
});

onUnmounted(() => {
  console.log('BlogView: Component unmounted');
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
  transition: top 0.3s;

  &:focus {
    top: 6px;
  }
}

/* Structure principale identique aux autres pages */
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
  max-width: 900px;
  margin: 0 auto;
}

/* Section identique aux autres pages */
.profile-section {
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: var(--card-shadow);
  border: 1px solid var(--border-color);
  transition: all 0.3s ease;

  &:hover {
    box-shadow: var(--card-shadow-hover);
  }
}

/* En-tête de section identique */
.section-header {
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid var(--background-light);

  h1, h2 {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin: 0 0 1rem 0;
    color: var(--text-primary);
    font-size: 1.875rem;
    font-weight: 700;
    line-height: 1.2;

    i {
      color: var(--primary-color);
      font-size: 2rem;
    }
  }

  .post-count {
    color: var(--text-muted);
    font-weight: 500;
    font-size: 1rem;
  }
}

/* Note d'information */
.info-note {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border: 1px solid #bfdbfe;
  border-radius: 0.75rem;
  color: #1e40af;
  font-size: 0.875rem;
  font-weight: 500;

  i {
    color: #3b82f6;
    font-size: 1.25rem;
  }
}

/* Actions du blog */
.blog-actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1.5rem;
}

/* Bouton identique aux autres pages - correction du problème de couleur */
.edit-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 1.5rem;
  background: #4444ac !important; /* Couleur unie au lieu du gradient */
  color: white !important; /* Force la couleur blanche */
  border: none;
  border-radius: 0.75rem;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(68, 68, 172, 0.2);
  font-family: 'Satoshi', sans-serif;
  justify-content: center;

  &:hover {
    background: #3333a0 !important; /* Couleur hover plus foncée */
    color: white !important; /* Force la couleur blanche au hover aussi */
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(68, 68, 172, 0.3);
  }

  &:focus {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
    color: white !important; /* Force la couleur blanche au focus aussi */
  }

  &:active {
    transform: translateY(0);
    background: #2222a5 !important; /* Couleur active encore plus foncée */
    color: white !important; /* Force la couleur blanche à l'activation aussi */
  }

  i {
    font-size: 1.125rem;
    color: white !important; /* Force la couleur blanche pour l'icône aussi */
  }
}

/* Message d'information */
.info-message {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border: 1px solid #7dd3fc;
  border-radius: 0.75rem;
  color: var(--text-secondary);
  font-size: 0.875rem;

  i {
    color: #0284c7;
    font-size: 1.25rem;
    flex-shrink: 0;
  }

  p {
    margin: 0;
    line-height: 1.4;
  }
}

/* Grille des posts */
.posts-grid {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Indicateur de chargement */
.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 3rem;
  color: var(--text-secondary);
  font-size: 0.875rem;
  font-weight: 500;

  .spinning {
    animation: spin 1s linear infinite;
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* État d'erreur */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
  text-align: center;
  color: var(--error-color);

  i {
    font-size: 3rem;
    opacity: 0.7;
  }

  p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.875rem;
  }
}

/* État vide */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 3rem 2rem;
  text-align: center;
  color: var(--text-muted);

  .empty-icon {
    width: 4rem;
    height: 4rem;
    background: linear-gradient(135deg, var(--background-light) 0%, #e5e7eb 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 0.5rem;

    i {
      font-size: 2rem;
      color: var(--text-muted);
    }
  }

  h3 {
    margin: 0;
    color: var(--text-secondary);
    font-size: 1.125rem;
    font-weight: 600;
  }

  p {
    margin: 0;
    font-size: 0.875rem;
    max-width: 20rem;
    line-height: 1.5;
  }
}

/* Responsive design */
@media (max-width: 768px) {
  .profile-container {
    padding: 1rem 0;
  }

  .profile-content {
    padding: 0 0.5rem;
  }

  .profile-section {
    padding: 1.5rem;
    border-radius: 0.75rem;
  }

  .section-header {
    margin-bottom: 1.5rem;
    padding-bottom: 0.75rem;

    h1, h2 {
      font-size: 1.5rem;
      gap: 0.5rem;

      i {
        font-size: 1.75rem;
      }
    }
  }

  .content-grid {
    gap: 1.5rem;
  }

  .posts-grid {
    gap: 1rem;
  }

  .empty-state {
    padding: 2rem 1rem;

    .empty-icon {
      width: 3rem;
      height: 3rem;

      i {
        font-size: 1.5rem;
      }
    }
  }
}

@media (max-width: 480px) {
  .profile-section {
    padding: 1rem;
  }

  .section-header h1, .section-header h2 {
    font-size: 1.25rem;
    flex-direction: column;
    text-align: center;
    gap: 0.5rem;
  }

  .edit-btn {
    padding: 0.75rem 1.25rem;
    font-size: 0.8rem;
  }
}

/* Support du mode contraste élevé */
@media (prefers-contrast: high) {
  .profile-section {
    border-width: 2px;
    border-color: var(--text-primary);
  }

  .edit-btn {
    border: 2px solid white;
  }
}

/* Support pour les animations réduites */
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}

/* Focus visible pour l'accessibilité */
.profile-section:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}
</style> 