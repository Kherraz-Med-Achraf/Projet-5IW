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
          <!-- Statistiques intégrées -->
          <div class="stats-section">
            <div class="section-header">
              <h3>
                <i class="material-icons" aria-hidden="true">analytics</i>
                Statistiques
              </h3>
            </div>
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
          </div>
        </div>

        <!-- Section des actions d'administration -->
        <div class="profile-section">
          <div class="section-header">
            <h3>
              <i class="material-icons" aria-hidden="true">settings</i>
              Actions d'administration
            </h3>
          </div>
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
import { ref, computed, onMounted, nextTick } from "vue";
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
const initGrid = () => {
  if (!gridContainer.value) return;

  grid = new Grid({
    columns: [
      {
        name: "Titre",
        id: "title",
        width: "30%",
        formatter: (cell: string, row: any) => {
          return html(`
            <div class="post-title-cell">
              <strong>${cell}</strong>
              ${row.cells[5].data ? `<span class="media-badge"><i class="material-icons">image</i></span>` : ""}
            </div>
          `);
        },
      },
      {
        name: "Auteur",
        id: "author",
        width: "15%",
        formatter: (cell: any) => {
          return `${cell.firstName} ${cell.lastName}`;
        },
      },
      {
        name: "Date",
        id: "createdAt",
        width: "15%",
        formatter: (cell: string) => {
          return new Date(cell).toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
        },
      },
      {
        name: "Réactions",
        id: "reactions",
        width: "15%",
        formatter: (cell: any) => {
          const total = Object.values(cell).reduce(
            (sum: number, count: any) => sum + count,
            0
          );
          return html(`
            <div class="reactions-cell">
              <span class="reaction-count">${total}</span>
              <div class="reaction-emojis">
                ${cell.LIKE > 0 ? `👏${cell.LIKE}` : ""}
                ${cell.HEART > 0 ? `❤️${cell.HEART}` : ""}
                ${cell.SMILE > 0 ? `😊${cell.SMILE}` : ""}
                ${cell.CLAP > 0 ? `👍${cell.CLAP}` : ""}
                ${cell.PARTY > 0 ? `🌟${cell.PARTY}` : ""}
              </div>
            </div>
          `);
        },
      },
      {
        name: "Actions",
        id: "actions",
        width: "25%",
        formatter: (cell: any, row: any) => {
          const canEdit = row.cells[1].data.id === authStore.user?.id;
          const canDelete =
            authStore.user?.role === "DIRECTOR" ||
            authStore.user?.role === "SERVICE_MANAGER" ||
            canEdit;

          return html(`
            <div class="action-buttons">
              <button class="btn-view" onclick="window.viewPost('${row.cells[6].data}')">
                <i class="material-icons">visibility</i>
              </button>
              ${
                canEdit
                  ? `<button class="btn-edit" onclick="window.editPost('${row.cells[6].data}')">
                      <i class="material-icons">edit</i>
                    </button>`
                  : ""
              }
              ${
                canDelete
                  ? `<button class="btn-delete" onclick="window.deletePost('${row.cells[6].data}')">
                      <i class="material-icons">delete</i>
                    </button>`
                  : ""
              }
            </div>
          `);
        },
      },
      { name: "mediaUrl", id: "mediaUrl", hidden: true },
      { name: "id", id: "id", hidden: true },
    ],
    data: posts.value.map((post) => [
      post.title,
      post.author,
      post.createdAt,
      post.reactions,
      "", // actions (géré par le formatter)
      post.mediaUrl,
      post.id,
    ]),
    search: true,
    sort: true,
    pagination: {
      limit: 10,
      summary: true,
    },
    language: {
      search: {
        placeholder: "Rechercher dans les posts...",
      },
      pagination: {
        previous: "Précédent",
        next: "Suivant",
        showing: "Affichage de",
        of: "sur",
        to: "à",
        results: "résultats",
      },
    },
    className: {
      table: "blog-admin-table",
      thead: "blog-admin-thead",
      tbody: "blog-admin-tbody",
    },
  });

  grid.render(gridContainer.value);
};

const refreshGrid = () => {
  if (grid) {
    grid
      .updateConfig({
        data: posts.value.map((post) => [
          post.title,
          post.author,
          post.createdAt,
          post.reactions,
          "",
          post.mediaUrl,
          post.id,
        ]),
      })
      .forceRender();
  }
};

const reloadPosts = async () => {
  await blogStore.fetchPosts();
  refreshGrid();
};

const handlePostCreated = () => {
  closeCreateModal();
  refreshGrid();
};

const handlePostUpdated = () => {
  closeEditModal();
  refreshGrid();
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
    refreshGrid();
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
  setupGlobalActions();

  nextTick(() => {
    initGrid();
  });
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
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: #4444ac;
  border-radius: 0.75rem;
  border: none;

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
      color: var(--text-primary);
      line-height: 1;
      margin-bottom: 0.25rem;
    }

    .stat-label {
      font-size: 0.875rem;
      color: var(--text-secondary);
      font-weight: 500;
    }
  }
}

/* Container de la grille */
.grid-container {
  border-radius: 0.75rem;
  overflow: hidden;
  border: 1px solid var(--border-color);

  .grid-wrapper {
    :deep(.gridjs-wrapper) {
      border: none;
      box-shadow: none;
    }

    :deep(.gridjs-head) {
      background: var(--background-light);
    }

    :deep(.gridjs-th) {
      background: var(--background-light);
      border: none;
      padding: 1rem 0.75rem;
      font-weight: 600;
      color: var(--text-primary);
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    :deep(.gridjs-td) {
      border: none;
      padding: 1rem 0.75rem;
      border-bottom: 1px solid var(--border-color);
      font-size: 0.875rem;
    }

    :deep(.gridjs-tr:hover) {
      background: var(--background-light);
    }

    :deep(.gridjs-search) {
      margin-bottom: 1rem;
    }

    :deep(.gridjs-search-input) {
      padding: 0.75rem;
      border: 1px solid var(--border-color);
      border-radius: 0.5rem;
      font-size: 0.875rem;
      
      &:focus {
        outline: none;
        border-color: var(--primary-color);
        box-shadow: 0 0 0 3px rgba(68, 68, 172, 0.1);
      }
    }

    :deep(.gridjs-pagination) {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border-color);
    }
  }
}

/* Styles pour les cellules personnalisées */
:deep(.post-title-cell) {
  display: flex;
  align-items: center;
  gap: 0.5rem;

  strong {
    color: var(--text-primary);
    font-weight: 600;
  }

  .media-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.25rem 0.5rem;
    background: rgba(16, 185, 129, 0.1);
    color: #059669;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 500;

    i {
      font-size: 0.875rem;
    }
  }
}

:deep(.reactions-cell) {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;

  .reaction-count {
    font-weight: 600;
    color: var(--text-primary);
  }

  .reaction-emojis {
    font-size: 0.75rem;
    color: var(--text-muted);
  }
}

:deep(.action-buttons) {
  display: flex;
  gap: 0.5rem;
  align-items: center;

  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.875rem;

    &.btn-view {
      background: rgba(59, 130, 246, 0.1);
      color: #2563eb;

      &:hover {
        background: rgba(59, 130, 246, 0.2);
      }
    }

    &.btn-edit {
      background: rgba(245, 158, 11, 0.1);
      color: #d97706;

      &:hover {
        background: rgba(245, 158, 11, 0.2);
      }
    }

    &.btn-delete {
      background: rgba(239, 68, 68, 0.1);
      color: #dc2626;

      &:hover {
        background: rgba(239, 68, 68, 0.2);
      }
    }

    i {
      font-size: 1rem;
    }
  }
}

/* Indicateurs d'état identiques */
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
    margin-bottom: 1.5rem;
    padding: 1rem;

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

  .stats-header {
    margin-bottom: 1rem;

    h3 {
      font-size: 1.125rem;
      gap: 0.375rem;

      i {
        font-size: 1.375rem;
      }
    }
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
