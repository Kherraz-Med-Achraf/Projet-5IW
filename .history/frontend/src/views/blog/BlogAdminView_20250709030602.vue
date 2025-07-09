<template>
  <main class="profile-container" role="main" lang="fr">
    <!-- Skip links pour navigation rapide -->
    <div class="skip-links">
      <a href="#main-content" class="skip-link">Aller au contenu principal</a>
      <a href="#blog-management" class="skip-link">Aller à la gestion</a>
    </div>

    <!-- Content -->
    <div class="profile-content" id="main-content">
      <div class="content-grid">
        <!-- En-tête d'administration -->
        <PageHeader
          title="Gestion des Posts"
          subtitle="Administration du blog - Gérez, modifiez et suivez tous les articles"
          icon="admin_panel_settings"
        />

        <!-- Section des statistiques -->
        <div class="profile-section">
          <div class="section-header">
            <h3>
              <i class="material-icons" aria-hidden="true">analytics</i>
              Statistiques
            </h3>
          </div>
          
          <!-- Statistiques intégrées -->
          <div class="stats-section">
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-icon">
                  <i class="material-icons" aria-hidden="true">article</i>
                </div>
                <div class="stat-content">
                  <div class="stat-number">{{ posts.length }}</div>
                  <div class="stat-label">Posts totaux</div>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon">
                  <i class="material-icons" aria-hidden="true">favorite</i>
                </div>
                <div class="stat-content">
                  <div class="stat-number">{{ totalReactions }}</div>
                  <div class="stat-label">Réactions totales</div>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon">
                  <i class="material-icons" aria-hidden="true">person</i>
                </div>
                <div class="stat-content">
                  <div class="stat-number">{{ myPostsCount }}</div>
                  <div class="stat-label">Mes posts</div>
                </div>
              </div>
            </div>
            
            <!-- Actions d'administration -->
            <div class="admin-actions">
              <router-link to="/blog" class="edit-btn edit-btn-secondary">
                <i class="material-icons" aria-hidden="true">visibility</i>
                Voir le blog public
              </router-link>
              <button @click="showCreateModal = true" class="edit-btn" type="button">
                <i class="material-icons" aria-hidden="true">add</i>
                Nouveau post
              </button>
            </div>
          </div>
        </div>

        <!-- Section gestion des posts -->
        <div class="profile-section" id="blog-management">
          <div class="section-header">
            <h2>
              <i class="material-icons" aria-hidden="true">table_chart</i>
              Gestion des Posts
            </h2>
          </div>

          <!-- États de chargement et erreur -->
          <div v-if="blogStore.loading" class="loading-indicator">
            <i class="material-icons spinning" aria-hidden="true">hourglass_empty</i>
            <span>Chargement des données...</span>
          </div>

          <div v-else-if="blogStore.error" class="error-state">
            <i class="material-icons" aria-hidden="true">error</i>
            <p>{{ blogStore.error }}</p>
            <button @click="reloadPosts" class="edit-btn">
              <i class="material-icons" aria-hidden="true">refresh</i>
              Réessayer
            </button>
          </div>

          <!-- Tableau GridJS -->
          <div v-else class="grid-container">
            <div ref="gridContainer" class="grid-wrapper"></div>
            
            <!-- Message quand aucun post n'est disponible -->
            <div v-if="posts.length === 0" class="no-posts-message">
              <i class="material-icons" aria-hidden="true">article</i>
              <p>Aucun post disponible pour le moment</p>
              <button @click="showCreateModal = true" class="edit-btn">
                <i class="material-icons" aria-hidden="true">add</i>
                Créer le premier post
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de création -->
    <CreatePostForm
      :visible="showCreateModal"
      @close="closeCreateModal"
      @post-created="handlePostCreated"
    />

    <!-- Modal d'édition -->
    <div v-if="showEditModal" class="modal-overlay" @click="closeEditModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>
            <i class="material-icons" aria-hidden="true">edit</i>
            Modifier le post
          </h3>
          <button @click="closeEditModal" class="close-btn" type="button">
            <i class="material-icons" aria-hidden="true">close</i>
          </button>
        </div>
        <div class="modal-body">
          <EditPostForm
            :post="selectedPost"
            @post-updated="handlePostUpdated"
            @cancel="closeEditModal"
          />
        </div>
      </div>
    </div>

    <!-- Modal de confirmation de suppression -->
    <div 
      v-if="showDeleteModal" 
      class="delete-modal" 
      @click="cancelDelete"
      @keydown.escape="cancelDelete"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      aria-describedby="delete-modal-description"
      tabindex="-1"
    >
      <div class="delete-modal-content" @click.stop>
        <div class="delete-modal-header">
          <i class="material-icons" aria-hidden="true">warning</i>
          <h3 id="delete-modal-title">Confirmer la suppression</h3>
        </div>
        <div class="delete-modal-body">
          <p id="delete-modal-description">
            Êtes-vous sûr de vouloir supprimer définitivement le post "<strong>{{ postToDelete?.title }}</strong>" ?
          </p>
          <p class="delete-warning">Cette action est irréversible.</p>
        </div>
        <div class="delete-modal-actions">
          <button 
            type="button" 
            @click="cancelDelete" 
            class="btn-cancel"
            aria-label="Annuler la suppression"
          >
            <i class="material-icons" aria-hidden="true">close</i>
            Annuler
          </button>
          <button 
            type="button" 
            @click="confirmDelete" 
            class="btn-delete-confirm"
            aria-label="Confirmer la suppression définitive"
          >
            <i class="material-icons" aria-hidden="true">delete</i>
            Supprimer
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from "vue";
import { Grid } from "gridjs";
import { html } from "gridjs";
import { useAuthStore } from "@/stores/auth";
import { useBlogStore } from "@/stores/blogStore";
import CreatePostForm from "@/components/blog/CreatePostForm.vue";
import EditPostForm from "@/components/blog/EditPostForm.vue";
import PageHeader from "@/components/PageHeader.vue";

// Stores
const authStore = useAuthStore();
const blogStore = useBlogStore();

// État local
const gridContainer = ref<HTMLElement>();
const showCreateModal = ref(false);
const showEditModal = ref(false);
const showDeleteModal = ref(false);
const selectedPost = ref<any>(null);
const postToDelete = ref<any>(null);
let grid: Grid | null = null;

// Computed
const posts = computed(() => blogStore.sortedPosts);

const totalReactions = computed(() => {
  return posts.value.reduce((total, post) => {
    return (
      total +
      Object.values(post.reactions).reduce((sum, count) => sum + count, 0)
    );
  }, 0);
});

const myPostsCount = computed(() => {
  return posts.value.filter((post) => post.author.id === authStore.user?.id)
    .length;
});

// Méthodes
const initializeGrid = async () => {
  if (!gridContainer.value) return;
  
  // Détruire la grille existante s'il y en a une
  if (grid) {
    try {
      grid.destroy();
      grid = null;
    } catch (error) {
      // Erreur lors de la destruction
    }
  }
  
  if (posts.value.length === 0) {
    return;
  }
  
  // Créer une nouvelle grille avec les données mises à jour
  grid = new Grid({
    search: true,
    pagination: {
      enabled: true,
      limit: 10,
      summary: true
    },
    sort: true,
    columns: [
      {
        name: 'Image',
        width: '80px',
        formatter: (_, row) => {
          const post = posts.value[row.cells[0].data];
          return post?.imageUrl 
            ? html(`
              <img src="${post.imageUrl}" alt="Image du post" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px">
            `)
            : html(`
              <div style="width: 60px; height: 60px; background-color: #f3f4f6; border-radius: 8px; display: flex; align-items: center; justify-content: center">
                <span class="material-icons" style="color: #9ca3af">image</span>
              </div>
            `);
        }
      },
      {
        name: 'Titre',
        width: '40%',
        formatter: (cell) => {
          const post = posts.value[cell];
          return post?.title || 'Sans titre';
        }
      },
      {
        name: 'Auteur',
        width: '20%',
        formatter: (cell) => {
          const post = posts.value[cell];
          if (!post || !post.author) {
            return 'Inconnu';
          }
          return `${post.author.firstName || ''} ${post.author.lastName || ''}`.trim() || 'Inconnu';
        }
      },
      {
        name: 'Date',
        width: '15%',
        formatter: (cell) => {
          const post = posts.value[cell];
          return post?.createdAt ? new Date(post.createdAt).toLocaleDateString('fr-FR') : '';
        }
      },
      {
        name: 'Actions',
        width: '15%',
        formatter: (cell) => {
          const post = posts.value[cell];
          const canEdit = post.author.id === authStore.user?.id;
          const canDelete =
            authStore.user?.role === "DIRECTOR" ||
            authStore.user?.role === "SERVICE_MANAGER" ||
            canEdit;

          return html(`
            <div class="action-buttons">
              <button class="btn-view" onclick="window.viewPost('${post.id}')">
                <i class="material-icons">visibility</i>
              </button>
              ${
                canEdit
                  ? `<button class="btn-edit" onclick="window.editPost('${post.id}')">
                      <i class="material-icons">edit</i>
                    </button>`
                  : ""
              }
              ${
                canDelete
                  ? `<button class="btn-delete" onclick="window.deletePost('${post.id}')">
                      <i class="material-icons">delete</i>
                    </button>`
                  : ""
              }
            </div>
          `);
        }
      }
    ],
    data: posts.value.map((_, index) => [index])
  });
  
  try {
    grid.render(gridContainer.value);
    // Grille rendue avec succès
  } catch (error) {
    console.error('Erreur lors du rendu de la grille:', error);
  }
};

// Surveiller les changements dans les posts
watch(posts, (newPosts) => {
  if (newPosts.length > 0) {
    nextTick(() => {
      initializeGrid();
    });
  }
}, { deep: true });

// Fonction pour rafraîchir la grille
const refreshGrid = () => {
  initializeGrid();
};

// Fonction pour recharger les posts
const reloadPosts = async () => {
  await blogStore.fetchPosts();
};

const handlePostCreated = async () => {
  closeCreateModal();
  await reloadPosts();
};

const handlePostUpdated = async () => {
  closeEditModal();
  await reloadPosts();
};

const closeCreateModal = () => {
  showCreateModal.value = false;
};

const closeEditModal = () => {
  showEditModal.value = false;
  selectedPost.value = null;
};

const confirmDelete = async () => {
  if (postToDelete.value) {
    await blogStore.deletePost(postToDelete.value.id);
    await reloadPosts();
  }
  showDeleteModal.value = false;
  postToDelete.value = null;
};

const cancelDelete = () => {
  showDeleteModal.value = false;
  postToDelete.value = null;
};

// Actions globales pour GridJS
const setupGlobalActions = () => {
  (window as any).viewPost = (postId: string) => {
    window.open(`/blog#${postId}`, "_blank");
  };

  (window as any).editPost = (postId: string) => {
    const post = posts.value.find((p) => p.id === postId);
    if (post) {
      selectedPost.value = post;
      showEditModal.value = true;
    }
  };

  (window as any).deletePost = (postId: string) => {
    const post = posts.value.find((p) => p.id === postId);
    if (post) {
      postToDelete.value = post;
      showDeleteModal.value = true;
    }
  };
};

// Lifecycle
onMounted(async () => {
  await blogStore.fetchPosts();
  
  // Attendre que le DOM soit rendu
  await nextTick();
  
  // Initialiser la grille après un délai pour s'assurer que le container est prêt
  setTimeout(initializeGrid, 100);

  // Configurer les actions globales
  setupGlobalActions();
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
  margin: -2rem -2rem 2rem -2rem;
  padding: 1.5rem 2rem;
  background: #4444ac;
  border-radius: 0.75rem 0.75rem 0 0;
  border: none;
  width: calc(100% + 4rem);

  h1, h2, h3 {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin: 0;
    color: white;
    font-size: 1.25rem;
    font-weight: 700;
    line-height: 1.2;

    i {
      color: white;
      font-size: 1.5rem;
    }
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

/* Actions d'administration */
.admin-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
  flex-wrap: wrap;
}

/* Section statistiques intégrées */
.stats-section {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 2px solid var(--background-light);
}

/* Boutons identiques aux autres pages */
.edit-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 1.5rem;
  background: #4444ac !important;
  color: white !important;
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
    background: #3333a0 !important;
    color: white !important;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(68, 68, 172, 0.3);
  }

  &:focus {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
    color: white !important;
  }

  &:active {
    transform: translateY(0);
    background: #2222a5 !important;
    color: white !important;
  }

  i {
    font-size: 1.125rem;
    color: white !important;
  }

  &.edit-btn-secondary {
    background: rgba(68, 68, 172, 0.1) !important;
    color: var(--primary-color) !important;
    border: 1px solid rgba(68, 68, 172, 0.2);

    &:hover {
      background: rgba(68, 68, 172, 0.15) !important;
      color: var(--primary-hover) !important;
    }

    i {
      color: var(--primary-color) !important;
    }
  }
}

/* Grille de statistiques */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border: 1px solid var(--border-color);
  border-radius: 0.75rem;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--card-shadow-hover);
  }

  .stat-icon {
    width: 3rem;
    height: 3rem;
    background: linear-gradient(135deg, var(--primary-color) 0%, #6366f1 100%);
    border-radius: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    i {
      color: white;
      font-size: 1.5rem;
    }
  }

  .stat-content {
    .stat-number {
      font-size: 1.875rem;
      font-weight: 700;
      color: black;
      line-height: 1;
      margin-bottom: 0.25rem;
    }

    .stat-label {
      font-size: 0.875rem;
      color: black;
      font-weight: 500;
    }
  }
}

/* États de chargement et erreur */
.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 3rem;
  color: var(--text-secondary);
  font-size: 1.125rem;
  font-weight: 500;

  .spinning {
    animation: spin 1s linear infinite;
  }
}

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 3rem;
  text-align: center;
  color: var(--error-color);

  i {
    font-size: 3rem;
    color: var(--error-color);
  }

  p {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 500;
  }
}

/* Container du grid */
.grid-container {
  min-height: 200px;
  position: relative;
}

.grid-wrapper {
  width: 100%;
  
  // Styles pour GridJS
  :deep(.gridjs-table) {
    border: none;
    border-radius: 0.75rem;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
  }

  :deep(.gridjs-th) {
    background-color: var(--primary-color);
    color: white;
    font-weight: 600;
    padding: 1rem;
    border: none;
    text-align: left;
  }

  :deep(.gridjs-td) {
    padding: 1rem;
    border-bottom: 1px solid var(--border-color);
    vertical-align: middle;
  }

  :deep(.gridjs-tr:nth-child(even)) {
    background-color: var(--background-light);
  }

  :deep(.gridjs-tr:hover) {
    background-color: #f0f4ff;
  }

  :deep(.gridjs-search) {
    margin-bottom: 1rem;
  }

  :deep(.gridjs-search-input) {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: 0.5rem;
    font-size: 1rem;
  }

  :deep(.gridjs-pagination) {
    margin-top: 1rem;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.5rem;
  }
}

/* Message quand aucun post */
.no-posts-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 3rem;
  text-align: center;
  color: var(--text-secondary);

  i {
    font-size: 3rem;
    color: var(--text-muted);
  }

  p {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 500;
  }
}

/* Modal identique */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  z-index: 1000;
  padding: 2rem 1rem;
  overflow-y: auto;
}

.modal-content {
  background: white;
  border-radius: 1rem;
  max-width: 1200px;
  width: 95vw;
  max-height: calc(100vh - 4rem);
  overflow-y: auto;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  margin: auto 0;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
  background: #4444ac;

  h3 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    color: white;
    font-size: 1.125rem;
    font-weight: 600;

    i {
      color: white;
    }
  }

  .close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    background: none;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
    color: white;
    transition: all 0.2s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.2);
      color: white;
    }

    i {
      font-size: 1.125rem;
    }
  }
}

.modal-body {
  padding: 1.5rem;
}

/* Modal de suppression */
.delete-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 2rem;
  backdrop-filter: blur(8px);
}

.delete-modal-content {
  background: white;
  border-radius: 1.5rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  max-width: 500px;
  width: 100%;
  overflow: hidden;
  animation: slideUp 0.3s ease;
}

.delete-modal-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 2rem 2rem 1rem;
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  border-bottom: 1px solid #fca5a5;

  i {
    font-size: 2rem;
    color: #dc2626;
  }

  h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
    color: #dc2626;
  }
}

.delete-modal-body {
  padding: 1.5rem 2rem;
  
  p {
    margin: 0 0 1rem 0;
    color: var(--text-primary);
    line-height: 1.6;
  }

  .delete-warning {
    font-size: 0.875rem;
    color: #dc2626;
    font-weight: 600;
    margin: 0;
  }

  strong {
    color: var(--text-primary);
    font-weight: 700;
  }
}

.delete-modal-actions {
  display: flex;
  gap: 1rem;
  padding: 1rem 2rem 2rem;
  justify-content: flex-end;
}

.btn-cancel {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: #f3f4f6;
  color: #6b7280;
  border: 1px solid #d1d5db;
  border-radius: 0.75rem;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 600;
  transition: all 0.2s ease;
  
  &:hover {
    background: #e5e7eb;
    color: #374151;
  }

  &:focus {
    outline: 2px solid #6366f1;
    outline-offset: 2px;
  }

  i {
    font-size: 1rem;
  }
}

.btn-delete-confirm {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  color: white;
  border: none;
  border-radius: 0.75rem;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 600;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(220, 38, 38, 0.3);

  &:hover {
    background: linear-gradient(135deg, #b91c1c 0%, #991b1b 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4);
  }

  &:focus {
    outline: 2px solid #dc2626;
    outline-offset: 2px;
  }

  i {
    font-size: 1rem;
  }
}

@keyframes slideUp {
  from { 
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to { 
    opacity: 1;
    transform: translateY(0) scale(1);
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
    margin: -1.5rem -1.5rem 1.5rem -1.5rem;
    padding: 1rem 1.5rem;
    width: calc(100% + 3rem);

    h1, h2, h3 {
      font-size: 1.125rem;
      gap: 0.5rem;

      i {
        font-size: 1.375rem;
      }
    }
  }

  .content-grid {
    gap: 1.5rem;
  }

  .admin-actions {
    flex-direction: column;
  }

  .stats-section {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
  }

  .stats-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .stat-card {
    padding: 1rem;
  }

  .grid-container {
    :deep(.gridjs-th),
    :deep(.gridjs-td) {
      padding: 0.75rem 0.5rem;
      font-size: 0.8rem;
    }
  }

  :deep(.action-buttons) {
    flex-direction: column;
    gap: 0.25rem;

    button {
      width: 1.75rem;
      height: 1.75rem;
    }
  }

  /* Responsive pour la modale de suppression */
  .delete-modal {
    padding: 1rem;
  }

  .delete-modal-content {
    max-width: 100%;
  }

  .delete-modal-header {
    padding: 1.5rem 1.5rem 1rem;
  }

  .delete-modal-body {
    padding: 1rem 1.5rem;
  }

  .delete-modal-actions {
    padding: 1rem 1.5rem 1.5rem;
    flex-direction: column;
    gap: 0.75rem;
  }

  .btn-cancel,
  .btn-delete-confirm {
    width: 100%;
    justify-content: center;
  }
}
</style>

