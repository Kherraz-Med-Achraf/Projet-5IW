<template>
  <div class="blog-admin-view">
    <!-- En-tête -->
    <header class="admin-header">
      <div class="header-content">
        <h1>🛠️ Gestion des Posts</h1>
        <p class="header-subtitle">Administration du blog - Secrétaires</p>
      </div>
      <div class="header-actions">
        <router-link to="/blog" class="btn-secondary">
          👁️ Voir le blog public
        </router-link>
        <button @click="showCreateModal = true" class="btn-primary">
          ➕ Nouveau post
        </button>
      </div>
    </header>

    <div class="admin-container">
      <!-- Statistiques -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">📝</div>
          <div class="stat-content">
            <h3>{{ posts.length }}</h3>
            <p>Posts totaux</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">❤️</div>
          <div class="stat-content">
            <h3>{{ totalReactions }}</h3>
            <p>Réactions totales</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">👤</div>
          <div class="stat-content">
            <h3>{{ myPostsCount }}</h3>
            <p>Mes posts</p>
          </div>
        </div>
      </div>

      <!-- Tableau GridJS -->
      <div class="grid-container">
        <div ref="gridContainer" class="grid-wrapper"></div>
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
          <h3>✏️ Modifier le post</h3>
          <button @click="closeEditModal" class="close-btn">✕</button>
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from "vue";
import { Grid } from "gridjs";
import { html } from "gridjs";
import { useAuthStore } from "@/stores/auth";
import { useBlogStore } from "@/stores/blogStore";
import CreatePostForm from "@/components/blog/CreatePostForm.vue";
import EditPostForm from "@/components/blog/EditPostForm.vue";

// Stores
const authStore = useAuthStore();
const blogStore = useBlogStore();

// État local
const gridContainer = ref<HTMLElement>();
const showCreateModal = ref(false);
const showEditModal = ref(false);
const selectedPost = ref<any>(null);
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
              ${row.cells[5].data ? `<span class="media-badge">📷</span>` : ""}
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
                ${cell.LIKE > 0 ? `👍${cell.LIKE}` : ""}
                ${cell.HEART > 0 ? `❤️${cell.HEART}` : ""}
                ${cell.SMILE > 0 ? `😊${cell.SMILE}` : ""}
                ${cell.CLAP > 0 ? `👏${cell.CLAP}` : ""}
                ${cell.PARTY > 0 ? `🎉${cell.PARTY}` : ""}
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
              <button class="btn-view" onclick="window.viewPost('${
                row.cells[6].data
              }')">
                👁️ Voir
              </button>
              ${
                canEdit
                  ? `<button class="btn-edit" onclick="window.editPost('${row.cells[6].data}')">✏️ Modifier</button>`
                  : ""
              }
              ${
                canDelete
                  ? `<button class="btn-delete" onclick="window.deletePost('${row.cells[6].data}')">🗑️ Supprimer</button>`
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
        placeholder: "Rechercher...",
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

  (window as any).deletePost = async (postId: string) => {
    const post = posts.value.find((p) => p.id === postId);
    if (
      post &&
      confirm(`Êtes-vous sûr de vouloir supprimer le post "${post.title}" ?`)
    ) {
      await blogStore.deletePost(postId);
      refreshGrid();
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
.blog-admin-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.admin-header {
  background: linear-gradient(135deg, #4444ac 0%, #2c2c78 100%);
  color: white;
  padding: 60px 40px 80px;
  display: flex;
  justify-content: space-between;
  align-items: center;

  position: relative;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 20"><defs><radialGradient id="a" cx="50%" cy="50%"><stop offset="0%" stop-color="rgba(255,255,255,.1)"/><stop offset="100%" stop-color="rgba(255,255,255,0)"/></radialGradient></defs><circle fill="url(%23a)" cx="10" cy="10" r="10"/><circle fill="url(%23a)" cx="30" cy="5" r="8"/><circle fill="url(%23a)" cx="60" cy="15" r="6"/><circle fill="url(%23a)" cx="80" cy="8" r="7"/></svg>');
    opacity: 0.1;
    z-index: -1;
  }

  .header-content {
    position: relative;
    z-index: 1;

    h1 {
      font-size: 3rem;
      font-weight: 700;
      margin-bottom: 8px;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }

    .header-subtitle {
      opacity: 0.8;
      font-size: 1.2rem;
      max-width: 600px;
      margin: 0 auto;
    }
  }

  .header-actions {
    position: relative;
    z-index: 1;
    display: flex;
    gap: 12px;

    .btn-secondary {
      padding: 12px 20px;
      background: rgba(255, 255, 255, 0.2);
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      transition: all 0.3s ease;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);

      &:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }
    }

    .btn-primary {
      padding: 12px 20px;
      background: linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%);
      color: #2c2c78;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.3s ease;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);

      &:hover {
        background: linear-gradient(135deg, #f0f4ff 0%, #c7d2fe 100%);
        transform: translateY(-2px);
        box-shadow: 0 8px 25px -5px rgba(44, 44, 120, 0.2);
      }
    }
  }
}

.admin-container {
  max-width: 1200px;
  margin: -20px auto 0;
  padding: 0 20px 40px;
  position: relative;
  z-index: 2;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;

  .stat-card {
    background: white;
    border-radius: 12px;
    padding: 24px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    gap: 16px;

    .stat-icon {
      font-size: 2.5rem;
      opacity: 0.8;
    }

    .stat-content {
      h3 {
        font-size: 2rem;
        color: #2c3e50;
        margin: 0 0 4px 0;
      }

      p {
        color: #7f8c8d;
        margin: 0;
        font-size: 14px;
      }
    }
  }
}

.grid-container {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  .grid-wrapper {
    :deep(.gridjs-wrapper) {
      border: none;
      box-shadow: none;
    }

    :deep(.gridjs-table) {
      border: none;
    }

    :deep(.gridjs-th) {
      background: #f8f9fa;
      border: none;
      padding: 16px 12px;
      font-weight: 600;
      color: #2c3e50;
    }

    :deep(.gridjs-td) {
      border: none;
      padding: 16px 12px;
      border-bottom: 1px solid #ecf0f1;
    }

    :deep(.gridjs-tr:hover) {
      background: #f8f9fa;
    }
  }
}

// Styles pour les cellules personnalisées
:deep(.post-title-cell) {
  display: flex;
  align-items: center;
  gap: 8px;

  .media-badge {
    font-size: 12px;
    background: #3498db;
    color: white;
    padding: 2px 6px;
    border-radius: 4px;
  }
}

:deep(.reactions-cell) {
  .reaction-count {
    font-weight: 600;
    color: #2c3e50;
    margin-right: 8px;
  }

  .reaction-emojis {
    font-size: 12px;
    opacity: 0.7;
  }
}

:deep(.action-buttons) {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;

  button {
    padding: 6px 10px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    transition: all 0.2s;

    &.btn-view {
      background: #3498db;
      color: white;

      &:hover {
        background: #2980b9;
      }
    }

    &.btn-edit {
      background: #f39c12;
      color: white;

      &:hover {
        background: #e67e22;
      }
    }

    &.btn-delete {
      background: #e74c3c;
      color: white;

      &:hover {
        background: #c0392b;
      }
    }
  }
}

// Modals
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid #ecf0f1;

    h3 {
      margin: 0;
      color: #2c3e50;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      transition: background-color 0.2s;

      &:hover {
        background: #f8f9fa;
      }
    }
  }

  .modal-body {
    padding: 24px;
  }
}

// Responsive
@media (max-width: 768px) {
  .admin-header {
    flex-direction: column;
    gap: 20px;
    text-align: center;

    .header-actions {
      justify-content: center;
    }
  }

  .admin-container {
    padding: 0 16px 40px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .grid-container {
    padding: 16px;
    overflow-x: auto;
  }
}
</style>
