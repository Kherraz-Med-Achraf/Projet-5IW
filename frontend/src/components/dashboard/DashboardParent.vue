<template>
  <div class="dashboard-parent">
    <div class="parent-header">
      <h3>Gestion des parents</h3>
    </div>

    <div class="grid-container">
      <div ref="gridWrapper"></div>
    </div>

    <div v-if="showViewModal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h4>Détails du parent</h4>
          <button class="close-btn" @click="closeViewModal">×</button>
        </div>
        <div class="parent-details">
          <div class="detail-group">
            <label>Prénom</label>
            <p>{{ selectedParent?.firstName }}</p>
          </div>
          <div class="detail-group">
            <label>Nom</label>
            <p>{{ selectedParent?.lastName }}</p>
          </div>
          <div class="detail-group">
            <label>Téléphone</label>
            <p>{{ selectedParent?.phone || "Non renseigné" }}</p>
          </div>
          <div class="detail-group">
            <label>Adresse</label>
            <p>{{ selectedParent?.address || "Non renseignée" }}</p>
          </div>
          <div class="detail-group">
            <label>Responsabilité légale</label>
            <p>{{ selectedParent?.legalResponsibility || "Non renseignée" }}</p>
          </div>
          <div class="detail-group">
            <label>Email</label>
            <p>{{ selectedParent?.user?.email || "Non renseigné" }}</p>
          </div>
          <div class="detail-group">
            <label>Nombre d'enfants</label>
            <p>{{ selectedParent?.children?.length || 0 }}</p>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn-secondary" @click="closeViewModal">Fermer</button>
          <button class="btn-primary" @click="editParent(selectedParent)">
            Modifier
          </button>
        </div>
      </div>
    </div>

    <div v-if="showEditModal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h4>Modifier le parent</h4>
          <button class="close-btn" @click="closeEditModal">×</button>
        </div>
        <form @submit.prevent="updateParent">
          <div class="form-group">
            <label>Prénom</label>
            <input v-model="editingParent.firstName" type="text" required />
          </div>
          <div class="form-group">
            <label>Nom</label>
            <input v-model="editingParent.lastName" type="text" required />
          </div>
          <div class="form-group">
            <label>Téléphone</label>
            <input
              v-model="editingParent.phone"
              type="tel"
              placeholder="0612345678"
            />
          </div>
          <div class="form-group">
            <label>Adresse</label>
            <textarea
              v-model="editingParent.address"
              rows="3"
              placeholder="Adresse complète"
            ></textarea>
          </div>
          <div class="form-group">
            <label>Responsabilité légale</label>
            <input
              v-model="editingParent.legalResponsibility"
              type="text"
              placeholder="Ex: Tuteur légal"
            />
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-secondary" @click="closeEditModal">
              Annuler
            </button>
            <button
              type="submit"
              class="btn-primary"
              :disabled="parentStore.loading"
            >
              {{ parentStore.loading ? "Modification..." : "Modifier" }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal de confirmation de suppression -->
    <div v-if="showDeleteModal" class="modal">
      <div class="modal-content modal-delete">
        <div class="modal-header">
          <h4>Confirmer la suppression</h4>
          <button class="close-btn" @click="closeDeleteModal">×</button>
        </div>
        <div class="delete-content">
          <div class="delete-icon">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <p class="delete-message">
            Êtes-vous sûr de vouloir supprimer définitivement le parent
            <strong
              >{{ parentToDelete?.firstName }}
              {{ parentToDelete?.lastName }}</strong
            >
            ?
          </p>
          <p class="delete-warning">
            Cette action est irréversible et toutes les données associées seront
            perdues.
          </p>
        </div>
        <div class="modal-actions">
          <button class="btn-secondary" @click="closeDeleteModal">
            Annuler
          </button>
          <button
            class="btn-danger"
            @click="confirmDeleteParent"
            :disabled="parentStore.loading"
          >
            {{ parentStore.loading ? "Suppression..." : "Supprimer" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { Grid, html } from "gridjs";
import { useToast } from "vue-toastification";
import { useParentStore } from "@/stores/parent";

const toast = useToast();
const parentStore = useParentStore();

const gridWrapper = ref(null);
const grid = ref(null);

const showViewModal = ref(false);
const showEditModal = ref(false);
const showDeleteModal = ref(false);
const selectedParent = ref(null);
const parentToDelete = ref(null);

const editingParent = ref({
  id: null,
  firstName: "",
  lastName: "",
  phone: "",
  address: "",
  legalResponsibility: "",
});

function viewParent(parent) {
  selectedParent.value = parent;
  showViewModal.value = true;
}

function closeViewModal() {
  showViewModal.value = false;
  selectedParent.value = null;
}

function editParent(parent) {
  editingParent.value = {
    id: parent.id,
    firstName: parent.firstName,
    lastName: parent.lastName,
    phone: parent.phone || "",
    address: parent.address || "",
    legalResponsibility: parent.legalResponsibility || "",
  };
  showEditModal.value = true;
  showViewModal.value = false;
}

function closeEditModal() {
  showEditModal.value = false;
  editingParent.value = {
    id: null,
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    legalResponsibility: "",
  };
}

function openDeleteModal(parent) {
  parentToDelete.value = parent;
  showDeleteModal.value = true;
}

function closeDeleteModal() {
  showDeleteModal.value = false;
  parentToDelete.value = null;
}

async function updateParent() {
  try {
    const { id, ...updateData } = editingParent.value;
    await parentStore.updateParent(id, updateData);
    toast.success("Parent modifié avec succès");
    closeEditModal();
    await fetchParents();
  } catch (error) {
    toast.error(parentStore.error || "Erreur lors de la modification");
  }
}

async function confirmDeleteParent() {
  if (!parentToDelete.value) return;

  try {
    await parentStore.deleteParent(parentToDelete.value.id);
    toast.success("Parent supprimé avec succès");
    closeDeleteModal();
    await fetchParents();
  } catch (error) {
    toast.error(parentStore.error || "Erreur lors de la suppression");
  }
}

async function fetchParents() {
  try {
    await parentStore.fetchParents();
    setTimeout(() => {
      updateGrid();
    }, 100);
  } catch (error) {
    toast.error("Erreur lors du chargement des parents");
  }
}

function updateGrid() {
  if (grid.value && parentStore.parents.length > 0) {
    // Trier par nom puis prénom pour un ordre stable
    const sortedParents = [...parentStore.parents].sort((a, b) => {
      const lastNameCompare = a.lastName.localeCompare(b.lastName);
      if (lastNameCompare === 0) {
        return a.firstName.localeCompare(b.firstName);
      }
      return lastNameCompare;
    });

    const gridData = sortedParents.map((parent) => [
      parent.firstName,
      parent.lastName,
      parent.phone || "Non renseigné",
      parent.user?.email || "Non renseigné",
      parent.children?.length || 0,
      parent.id,
    ]);

    grid.value.updateConfig({
      data: gridData,
    });
    grid.value.forceRender();
  }
}

function initGrid() {
  grid.value = new Grid({
    columns: [
      { id: "firstName", name: "Prénom" },
      { id: "lastName", name: "Nom" },
      { id: "phone", name: "Téléphone", width: "150px" },
      { id: "email", name: "Email", width: "200px" },
      { id: "children", name: "Enfants", width: "100px" },
      {
        name: "Actions",
        width: "200px",
        formatter: (cell, row) =>
          html(`
          <div class="action-buttons">
            <button class="btn-icon view-btn" data-id="${row.cells[5].data}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
            <button class="btn-icon edit-btn" data-id="${row.cells[5].data}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="m18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="btn-icon delete-btn" data-id="${row.cells[5].data}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3,6 5,6 21,6"/>
                <path d="m19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1,2-2h4a2,2 0 0,1,2,2v2"/>
              </svg>
            </button>
          </div>
        `),
      },
    ],
    data: [],
    search: true,
    sort: true,
    pagination: {
      limit: 10,
    },
    language: {
      search: {
        placeholder: "Rechercher...",
      },
      pagination: {
        previous: "Précédent",
        next: "Suivant",
        showing: "Affichage de",
        results: () => "résultats",
      },
    },
    className: {
      table: "custom-table",
    },
    style: {
      table: {
        "font-family": "Roboto, sans-serif",
        "border-collapse": "separate",
        "border-spacing": "0",
        "background-color": "#ffffff",
        "border-radius": "12px",
        "box-shadow":
          "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        overflow: "hidden",
        width: "100%",
        "table-layout": "auto",
      },
      th: {
        background: "#f8fafc",
        color: "#374151",
        "font-weight": "500",
        "font-size": "0.875rem",
        padding: "1rem 1.25rem",
        border: "none",
        position: "relative",
        "white-space": "nowrap",
      },
      td: {
        padding: "1rem 1.25rem",
        "border-bottom": "1px solid #f1f5f9",
        color: "#475569",
        "font-size": "0.875rem",
        transition: "all 0.2s ease",
        "background-color": "#ffffff",
        "white-space": "nowrap",
        overflow: "hidden",
        "text-overflow": "ellipsis",
        "max-width": "200px",
      },
      tbody: {
        "background-color": "#ffffff",
      },
      search: {
        "margin-bottom": "1.5rem",
      },
      "search input": {
        width: "100%",
        padding: "0.875rem 1rem",
        border: "2px solid #e2e8f0",
        "border-radius": "8px",
        "font-size": "0.875rem",
        transition: "all 0.2s ease",
        "background-color": "#ffffff",
        "box-shadow": "0 1px 3px rgba(0, 0, 0, 0.1)",
      },
      "search input:focus": {
        outline: "none",
        "border-color": "#667eea",
        "box-shadow":
          "0 0 0 3px rgba(102, 126, 234, 0.1), 0 1px 3px rgba(0, 0, 0, 0.1)",
        transform: "translateY(-1px)",
      },
      pagination: {
        "margin-top": "1.5rem",
        display: "flex",
        "justify-content": "center",
        "align-items": "center",
        gap: "0.5rem",
      },
      "pagination button": {
        padding: "0.5rem 1rem",
        border: "1px solid #e2e8f0",
        "background-color": "#ffffff",
        color: "#64748b",
        "border-radius": "6px",
        "font-size": "0.875rem",
        "font-weight": "500",
        cursor: "pointer",
        transition: "all 0.2s ease",
        "box-shadow": "0 1px 2px rgba(0, 0, 0, 0.05)",
      },
      "pagination button:hover": {
        "background-color": "#f8fafc",
        "border-color": "#cbd5e1",
        transform: "translateY(-1px)",
        "box-shadow": "0 2px 4px rgba(0, 0, 0, 0.1)",
      },
      "pagination button.gridjs-currentPage": {
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "#ffffff",
        "border-color": "#667eea",
        "box-shadow": "0 2px 8px rgba(102, 126, 234, 0.3)",
      },
      "pagination span": {
        color: "#64748b",
        "font-size": "0.875rem",
        margin: "0 0.5rem",
      },
    },
  });

  grid.value.render(gridWrapper.value);

  gridWrapper.value.addEventListener("click", (e) => {
    const target = e.target.closest("button");
    if (!target) return;

    const id = parseInt(target.dataset.id);
    const parent = parentStore.parents.find((p) => p.id === id);

    if (target.classList.contains("view-btn")) {
      viewParent(parent);
    } else if (target.classList.contains("edit-btn")) {
      editParent(parent);
    } else if (target.classList.contains("delete-btn")) {
      openDeleteModal(parent);
    }
  });
}

onMounted(async () => {
  initGrid();
  await fetchParents();
});
</script>

<style scoped lang="scss">
@use "sass:color";

.dashboard-parent {
  .parent-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;

    h3 {
      margin: 0;
      color: #111827;
      font-size: 1.5rem;
      font-weight: 600;
    }
  }
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;

  .modal-content {
    background: white;
    border-radius: 8px;
    width: 90%;
    max-width: 500px;
    max-height: 90vh;
    overflow-y: auto;

    .modal-header {
      padding: 1.5rem;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;

      h4 {
        margin: 0;
        color: #111827;
        font-size: 1.25rem;
        font-weight: 600;
      }

      .close-btn {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: #6b7280;
        padding: 0.25rem;

        &:hover {
          color: #374151;
        }
      }
    }

    form {
      padding: 1.5rem;
    }

    .parent-details {
      padding: 1.5rem;
    }

    .form-group,
    .detail-group {
      margin-bottom: 1rem;

      label {
        display: block;
        margin-bottom: 0.5rem;
        color: #374151;
        font-weight: 500;
        font-size: 0.875rem;
      }

      input,
      textarea {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 0.875rem;
        font-family: inherit;

        &:focus {
          outline: none;
          border-color: $primary-color;
        }
      }

      textarea {
        resize: vertical;
        min-height: 80px;
      }

      p {
        margin: 0;
        padding: 0.75rem;
        background-color: #f9fafb;
        border-radius: 6px;
        color: #111827;
      }
    }

    .modal-actions {
      padding: 1.5rem;
      border-top: 1px solid #e5e7eb;
      display: flex;
      gap: 1rem;
      justify-content: flex-end;

      .btn-secondary {
        padding: 0.75rem 1rem;
        background-color: #f3f4f6;
        color: #374151;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s;

        &:hover {
          background-color: #e5e7eb;
        }
      }

      .btn-primary {
        padding: 0.75rem 1rem;
        background-color: $primary-color;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
        transition: background-color 0.2s;

        &:hover:not(:disabled) {
          background-color: color.adjust($primary-color, $lightness: -10%);
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }

      .btn-danger {
        padding: 0.75rem 1rem;
        background-color: #dc2626;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
        transition: background-color 0.2s;

        &:hover:not(:disabled) {
          background-color: #b91c1c;
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }
    }

    // Styles spécifiques pour la modal de suppression
    &.modal-delete {
      .delete-content {
        padding: 1.5rem;
        text-align: center;

        .delete-icon {
          display: flex;
          justify-content: center;
          margin-bottom: 1rem;

          svg {
            color: #dc2626;
            background: #fef2f2;
            border-radius: 50%;
            padding: 0.75rem;
          }
        }

        .delete-message {
          margin: 0 0 1rem 0;
          font-size: 1rem;
          color: #374151;
          line-height: 1.5;

          strong {
            color: #111827;
            font-weight: 600;
          }
        }

        .delete-warning {
          margin: 0;
          font-size: 0.875rem;
          color: #6b7280;
          line-height: 1.4;
        }
      }
    }
  }
}

:deep(.grid-container) {
  border: none;
}

:deep(.gridjs-container) {
  background-color: #f8fafc;
  border: none;
}

:deep(.gridjs-head) {
  background-color: transparent;
}

:deep(.gridjs-tbody .gridjs-tr:hover .gridjs-td) {
  background-color: #f8fafc !important;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

:deep(.gridjs-tbody .gridjs-tr:last-child .gridjs-td) {
  border-bottom: none !important;
}

:deep(.gridjs-tbody .gridjs-tr) {
  transition: all 0.3s ease;
}

// Ajustement de la largeur du conteneur
:deep(.grid-container) {
  width: 100%;
  overflow-x: auto;
}

// Styles uniquement pour les boutons d'actions
:deep(.action-buttons) {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  align-items: center;
}

:deep(.btn-icon) {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

:deep(.btn-icon:active) {
  transform: scale(0.95);
}

:deep(.view-btn) {
  background-color: #eff6ff;
  color: #2563eb;
}

:deep(.view-btn:hover) {
  background-color: #dbeafe;
  box-shadow: 0 2px 4px rgba(37, 99, 235, 0.1);
}

:deep(.edit-btn) {
  background-color: #f3f4f6;
  color: #6b7280;
}

:deep(.edit-btn:hover) {
  background-color: #e5e7eb;
  box-shadow: 0 2px 4px rgba(107, 114, 128, 0.1);
}

:deep(.delete-btn) {
  background-color: #fef2f2;
  color: #dc2626;
}

:deep(.delete-btn:hover) {
  background-color: #fee2e2;
  box-shadow: 0 2px 4px rgba(220, 38, 38, 0.1);
}
</style>
