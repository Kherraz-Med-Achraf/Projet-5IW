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
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  font-family: 'Inter', 'Satoshi', -apple-system, BlinkMacSystemFont, sans-serif;
  position: relative;
  overflow-x: hidden;
}

.profile-content {
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

/* CSS moderne inspiré Behance/Dribbble */
.blog-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  font-family: 'Inter', 'Satoshi', -apple-system, BlinkMacSystemFont, sans-serif;
  position: relative;
  overflow-x: hidden;
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
  color: #0f172a;
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
  color: #64748b;
  margin: 0;
  max-width: 480px;
  margin: 0 auto;
  line-height: 1.6;
  font-weight: 400;
}

/* Bouton créer article moderne */
.create-post-section {
  display: flex;
  justify-content: center;
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
  text-decoration: none;
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

/* Section des articles */
.posts-section {
  position: relative;
}

.posts-grid {
  display: flex;
  flex-direction: column;
  gap: 32px;
  position: relative;
}

/* Animation de chargement moderne */
.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  position: relative;
  
  &::before {
    content: '';
    width: 40px;
    height: 40px;
    border: 3px solid rgba(99, 102, 241, 0.1);
    border-top: 3px solid #6366f1;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  &::after {
    content: 'Chargement des articles...';
    position: absolute;
    top: 70px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 14px;
    color: #64748b;
    font-weight: 500;
    white-space: nowrap;
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* État vide moderne */
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
  display: block;
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
  color: #64748b;
  margin: 0;
  max-width: 400px;
  margin: 0 auto;
  line-height: 1.6;
}

/* Responsive moderne */
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
}

/* Accessibilité et préférences utilisateur */
@media (prefers-contrast: high) {
  .blog-container {
    background: white;
  }
  
  .blog-title {
    background: none;
    -webkit-text-fill-color: #0f172a;
    color: #0f172a;
  }
  
  .create-post-btn {
    background: #4338ca;
    border: 2px solid #3730a3;
  }
  
  .empty-state {
    background: white;
    border: 2px solid #e2e8f0;
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
  
  .loading-state::before {
    animation: none;
    border-top-color: #6366f1;
  }
}

/* Focus states améliorés */
.create-post-btn:focus-visible {
  outline: 2px solid #6366f1;
  outline-offset: 2px;
}

/* Effet de parallaxe subtil pour le background */
.blog-container::before {
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

/* Amélioration des transitions de scroll */
.posts-grid > * {
  animation: fadeInUp 0.6s cubic-bezier(0.165, 0.84, 0.44, 1) forwards;
  opacity: 0;
  transform: translateY(20px);
}

.posts-grid > *:nth-child(1) { animation-delay: 0.1s; }
.posts-grid > *:nth-child(2) { animation-delay: 0.2s; }
.posts-grid > *:nth-child(3) { animation-delay: 0.3s; }
.posts-grid > *:nth-child(4) { animation-delay: 0.4s; }
.posts-grid > *:nth-child(5) { animation-delay: 0.5s; }

@keyframes fadeInUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .posts-grid > * {
    animation: none;
    opacity: 1;
    transform: none;
  }
}
</style>
