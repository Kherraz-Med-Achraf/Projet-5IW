<template>
  <div class="dashboard-secretary">
    <div class="secretary-header">
      <h3>Gestion des secrétaires</h3>
      <button class="btn-primary" @click="openCreateModal">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Ajouter un secrétaire
      </button>
    </div>

    <div class="grid-container">
      <div ref="gridWrapper"></div>
    </div>

    <div v-if="showCreateModal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h4>Ajouter un secrétaire</h4>
          <button class="close-btn" @click="closeCreateModal">×</button>
        </div>
        <form @submit.prevent="createSecretary">
          <div class="form-group">
            <label>Email</label>
            <input v-model="newSecretary.email" type="email" required />
          </div>
          <div class="form-group">
            <label>Mot de passe</label>
            <input
              v-model="newSecretary.password"
              type="password"
              required
              minlength="12"
            />
            <small
              >Au moins 12 caractères avec majuscule, minuscule, chiffre et
              caractère spécial</small
            >
          </div>
          <div class="form-group">
            <label>Prénom</label>
            <input v-model="newSecretary.firstName" type="text" required />
          </div>
          <div class="form-group">
            <label>Nom</label>
            <input v-model="newSecretary.lastName" type="text" required />
          </div>
          <div class="form-group">
            <label>Date de naissance</label>
            <input v-model="newSecretary.birthDate" type="date" required />
          </div>
          <div class="form-group">
            <label>Téléphone</label>
            <input
              v-model="newSecretary.phone"
              type="tel"
              required
              placeholder="0123456789"
            />
          </div>
          <div class="form-group">
            <label>Spécialité</label>
            <input
              v-model="newSecretary.specialty"
              type="text"
              required
              placeholder="Ex: Accueil, Administration"
            />
          </div>
          <div class="form-group">
            <label>Date de début</label>
            <input v-model="newSecretary.startDate" type="date" required />
          </div>
          <div class="form-group">
            <label>Photo de profil (optionnel)</label>
            <input
              v-model="newSecretary.profileImage"
              type="url"
              placeholder="https://..."
            />
          </div>
          <div class="modal-actions">
            <button
              type="button"
              class="btn-secondary"
              @click="closeCreateModal"
            >
              Annuler
            </button>
            <button
              type="submit"
              class="btn-primary"
              :disabled="secretaryStore.loading"
            >
              {{ secretaryStore.loading ? "Création..." : "Créer" }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="showViewModal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h4>Détails du secrétaire</h4>
          <button class="close-btn" @click="closeViewModal">×</button>
        </div>
        <div class="secretary-details">
          <div class="detail-group">
            <label>Prénom</label>
            <p>{{ selectedSecretary?.firstName }}</p>
          </div>
          <div class="detail-group">
            <label>Nom</label>
            <p>{{ selectedSecretary?.lastName }}</p>
          </div>
          <div class="detail-group">
            <label>Email</label>
            <p>{{ selectedSecretary?.user?.email || "Non renseigné" }}</p>
          </div>
          <div class="detail-group">
            <label>Téléphone</label>
            <p>{{ selectedSecretary?.phone || "Non renseigné" }}</p>
          </div>
          <div class="detail-group">
            <label>Date de naissance</label>
            <p>{{ formatDate(selectedSecretary?.birthDate) }}</p>
          </div>
          <div class="detail-group">
            <label>Spécialité</label>
            <p>{{ selectedSecretary?.specialty || "Non renseignée" }}</p>
          </div>
          <div class="detail-group">
            <label>Date de début</label>
            <p>{{ formatDate(selectedSecretary?.startDate) }}</p>
          </div>
          <div class="detail-group">
            <label>Ancienneté</label>
            <p>{{ calculateYearsOfService(selectedSecretary?.startDate) }}</p>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn-secondary" @click="closeViewModal">Fermer</button>
          <button class="btn-primary" @click="editSecretary(selectedSecretary)">
            Modifier
          </button>
        </div>
      </div>
    </div>

    <div v-if="showEditModal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h4>Modifier le secrétaire</h4>
          <button class="close-btn" @click="closeEditModal">×</button>
        </div>
        <form @submit.prevent="updateSecretary">
          <div class="form-group">
            <label>Prénom</label>
            <input v-model="editingSecretary.firstName" type="text" required />
          </div>
          <div class="form-group">
            <label>Nom</label>
            <input v-model="editingSecretary.lastName" type="text" required />
          </div>
          <div class="form-group">
            <label>Date de naissance</label>
            <input v-model="editingSecretary.birthDate" type="date" required />
          </div>
          <div class="form-group">
            <label>Téléphone</label>
            <input v-model="editingSecretary.phone" type="tel" required />
          </div>
          <div class="form-group">
            <label>Spécialité</label>
            <input v-model="editingSecretary.specialty" type="text" required />
          </div>
          <div class="form-group">
            <label>Date de début</label>
            <input v-model="editingSecretary.startDate" type="date" required />
          </div>
          <div class="form-group">
            <label>Photo de profil</label>
            <input
              v-model="editingSecretary.profileImage"
              type="url"
              placeholder="https://..."
            />
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-secondary" @click="closeEditModal">
              Annuler
            </button>
            <button
              type="submit"
              class="btn-primary"
              :disabled="secretaryStore.loading"
            >
              {{ secretaryStore.loading ? "Modification..." : "Modifier" }}
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
            Êtes-vous sûr de vouloir supprimer définitivement le secrétaire
            <strong
              >{{ secretaryToDelete?.firstName }}
              {{ secretaryToDelete?.lastName }}</strong
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
            @click="confirmDeleteSecretary"
            :disabled="secretaryStore.loading"
          >
            {{ secretaryStore.loading ? "Suppression..." : "Supprimer" }}
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
import { useSecretaryStore } from "@/stores/secretary";

const toast = useToast();
const secretaryStore = useSecretaryStore();

const gridWrapper = ref(null);
const grid = ref(null);

const showCreateModal = ref(false);
const showViewModal = ref(false);
const showEditModal = ref(false);
const showDeleteModal = ref(false);
const selectedSecretary = ref(null);
const secretaryToDelete = ref(null);

const newSecretary = ref({
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  birthDate: "",
  phone: "",
  specialty: "",
  startDate: "",
  profileImage: "",
});

const editingSecretary = ref({
  id: null,
  firstName: "",
  lastName: "",
  birthDate: "",
  phone: "",
  specialty: "",
  startDate: "",
  profileImage: "",
});

function formatDate(dateString) {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString("fr-FR");
}

function calculateYearsOfService(startDate) {
  if (!startDate) return "0 an";
  const today = new Date();
  const start = new Date(startDate);
  const years = today.getFullYear() - start.getFullYear();
  const monthDiff = today.getMonth() - start.getMonth();
  const adjustedYears =
    monthDiff < 0 || (monthDiff === 0 && today.getDate() < start.getDate())
      ? years - 1
      : years;
  return adjustedYears === 0
    ? "Moins d'un an"
    : `${adjustedYears} an${adjustedYears > 1 ? "s" : ""}`;
}

function openCreateModal() {
  newSecretary.value = {
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    birthDate: "",
    phone: "",
    specialty: "",
    startDate: "",
    profileImage: "",
  };
  showCreateModal.value = true;
}

function closeCreateModal() {
  showCreateModal.value = false;
}

function viewSecretary(secretary) {
  selectedSecretary.value = secretary;
  showViewModal.value = true;
}

function closeViewModal() {
  showViewModal.value = false;
  selectedSecretary.value = null;
}

function editSecretary(secretary) {
  editingSecretary.value = {
    id: secretary.id,
    firstName: secretary.firstName,
    lastName: secretary.lastName,
    birthDate: secretary.birthDate.split("T")[0],
    phone: secretary.phone || "",
    specialty: secretary.specialty || "",
    startDate: secretary.startDate.split("T")[0],
    profileImage: secretary.profileImage || "",
  };
  showEditModal.value = true;
  showViewModal.value = false;
}

function closeEditModal() {
  showEditModal.value = false;
  editingSecretary.value = {
    id: null,
    firstName: "",
    lastName: "",
    birthDate: "",
    phone: "",
    specialty: "",
    startDate: "",
    profileImage: "",
  };
}

function openDeleteModal(secretary) {
  secretaryToDelete.value = secretary;
  showDeleteModal.value = true;
}

function closeDeleteModal() {
  showDeleteModal.value = false;
  secretaryToDelete.value = null;
}

async function createSecretary() {
  try {
    // Nettoyer les données avant envoi - ne pas envoyer profileImage si vide
    const secretaryData = { ...newSecretary.value };
    if (
      !secretaryData.profileImage ||
      secretaryData.profileImage.trim() === ""
    ) {
      delete secretaryData.profileImage;
    }

    await secretaryStore.createSecretary(secretaryData);
    toast.success("Secrétaire créé avec succès");
    closeCreateModal();
    await fetchSecretaries();
  } catch (error) {
    toast.error(secretaryStore.error || "Erreur lors de la création");
  }
}

async function updateSecretary() {
  try {
    const { id, ...updateData } = editingSecretary.value;
    // Nettoyer les données avant envoi - ne pas envoyer profileImage si vide
    if (!updateData.profileImage || updateData.profileImage.trim() === "") {
      delete updateData.profileImage;
    }

    await secretaryStore.updateSecretary(id, updateData);
    toast.success("Secrétaire modifié avec succès");
    closeEditModal();
    await fetchSecretaries();
  } catch (error) {
    toast.error(secretaryStore.error || "Erreur lors de la modification");
  }
}

async function confirmDeleteSecretary() {
  if (!secretaryToDelete.value) return;

  try {
    await secretaryStore.deleteSecretary(secretaryToDelete.value.id);
    toast.success("Secrétaire supprimé avec succès");
    closeDeleteModal();
    await fetchSecretaries();
  } catch (error) {
    toast.error(secretaryStore.error || "Erreur lors de la suppression");
  }
}

async function fetchSecretaries() {
  try {
    await secretaryStore.fetchSecretaries();
    setTimeout(() => {
      updateGrid();
    }, 100);
  } catch (error) {
    toast.error("Erreur lors du chargement des secrétaires");
  }
}

function updateGrid() {
  if (grid.value && secretaryStore.secretaries.length > 0) {
    // Trier par nom puis prénom pour un ordre stable
    const sortedSecretaries = [...secretaryStore.secretaries].sort((a, b) => {
      const lastNameCompare = a.lastName.localeCompare(b.lastName);
      if (lastNameCompare === 0) {
        return a.firstName.localeCompare(b.firstName);
      }
      return lastNameCompare;
    });

    const gridData = sortedSecretaries.map((secretary) => [
      secretary.firstName,
      secretary.lastName,
      secretary.phone || "Non renseigné",
      secretary.specialty || "Non renseignée",
      formatDate(secretary.startDate),
      calculateYearsOfService(secretary.startDate),
      secretary.id,
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
      { id: "specialty", name: "Spécialité", width: "180px" },
      { id: "startDate", name: "Date de début", width: "120px" },
      { id: "seniority", name: "Ancienneté", width: "120px" },
      {
        name: "Actions",
        width: "200px",
        formatter: (cell, row) =>
          html(`
          <div class="action-buttons">
            <button class="btn-icon view-btn" data-id="${row.cells[6].data}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
            <button class="btn-icon edit-btn" data-id="${row.cells[6].data}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="m18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="btn-icon delete-btn" data-id="${row.cells[6].data}">
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
    const secretary = secretaryStore.secretaries.find((s) => s.id === id);

    if (target.classList.contains("view-btn")) {
      viewSecretary(secretary);
    } else if (target.classList.contains("edit-btn")) {
      editSecretary(secretary);
    } else if (target.classList.contains("delete-btn")) {
      openDeleteModal(secretary);
    }
  });
}

onMounted(async () => {
  initGrid();
  await fetchSecretaries();
});
</script>

<style scoped lang="scss">
.dashboard-secretary {
  .secretary-header {
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

    .btn-primary {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      background-color: $primary-color;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      transition: background-color 0.2s;

      &:hover {
        background-color: darken($primary-color, 10%);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
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
    max-width: 600px;
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

    .secretary-details {
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

      small {
        display: block;
        margin-top: 0.25rem;
        color: #6b7280;
        font-size: 0.75rem;
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
          background-color: darken($primary-color, 10%);
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
