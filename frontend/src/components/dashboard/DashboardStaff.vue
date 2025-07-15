<template>
  <div class="dashboard-staff">
    <div class="staff-header">
      <h3>Gestion du personnel</h3>
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
        Ajouter un membre du personnel
      </button>
    </div>

    <div class="grid-container">
      <div ref="gridWrapper"></div>
    </div>

    <!-- Modal Création -->
    <div v-if="showCreateModal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h4>Ajouter un membre du personnel</h4>
          <button class="close-btn" @click="closeCreateModal">×</button>
        </div>
        <form @submit.prevent="createStaff">
          <div class="form-group">
            <label>Email</label>
            <input v-model="newStaff.email" type="email" required />
          </div>
          <div class="form-group">
            <label>Mot de passe</label>
            <input
              v-model="newStaff.password"
              type="password"
              required
              minlength="12"
            />
            <small>
              Au moins 12 caractères avec majuscule, minuscule, chiffre et
              caractère spécial
            </small>
          </div>
          <div class="form-group">
            <label>Prénom</label>
            <input v-model="newStaff.firstName" type="text" required />
          </div>
          <div class="form-group">
            <label>Nom</label>
            <input v-model="newStaff.lastName" type="text" required />
          </div>
          <div class="form-group">
            <label>Date de naissance</label>
            <input v-model="newStaff.birthDate" type="date" required />
          </div>
          <div class="form-group">
            <label>Téléphone</label>
            <input
              v-model="newStaff.phone"
              type="tel"
              required
              placeholder="0123456789"
            />
          </div>
          <div class="form-group">
            <label>Discipline</label>
            <select v-model="newStaff.discipline" required>
              <option value="">Sélectionnez une discipline</option>
              <option
                v-for="option in DISCIPLINE_OPTIONS"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>Spécialité (optionnel)</label>
            <input
              v-model="newStaff.specialty"
              type="text"
              placeholder="Ex: Troubles autistiques, Déficience motrice"
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
              :disabled="staffStore.loading"
            >
              {{ staffStore.loading ? "Création..." : "Créer" }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Visualisation -->
    <div v-if="showViewModal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h4>Détails du membre du personnel</h4>
          <button class="close-btn" @click="closeViewModal">×</button>
        </div>
        <div class="staff-details">
          <div class="detail-group">
            <label>Prénom</label>
            <p>{{ selectedStaff?.firstName }}</p>
          </div>
          <div class="detail-group">
            <label>Nom</label>
            <p>{{ selectedStaff?.lastName }}</p>
          </div>
          <div class="detail-group">
            <label>Email</label>
            <p>{{ selectedStaff?.user?.email || "Non renseigné" }}</p>
          </div>
          <div class="detail-group">
            <label>Téléphone</label>
            <p>{{ selectedStaff?.phone || "Non renseigné" }}</p>
          </div>
          <div class="detail-group">
            <label>Date de naissance</label>
            <p>{{ formatDate(selectedStaff?.birthDate) }}</p>
          </div>
          <div class="detail-group">
            <label>Discipline</label>
            <p>
              {{ staffStore.getDisciplineLabel(selectedStaff?.discipline) }}
            </p>
          </div>
          <div class="detail-group">
            <label>Spécialité</label>
            <p>{{ selectedStaff?.specialty || "Non renseignée" }}</p>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn-secondary" @click="closeViewModal">Fermer</button>
          <button class="btn-primary" @click="editStaff(selectedStaff)">
            Modifier
          </button>
        </div>
      </div>
    </div>

    <!-- Modal Modification -->
    <div v-if="showEditModal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h4>Modifier le membre du personnel</h4>
          <button class="close-btn" @click="closeEditModal">×</button>
        </div>
        <form @submit.prevent="updateStaff">
          <div class="form-group">
            <label>Prénom</label>
            <input v-model="editingStaff.firstName" type="text" required />
          </div>
          <div class="form-group">
            <label>Nom</label>
            <input v-model="editingStaff.lastName" type="text" required />
          </div>
          <div class="form-group">
            <label>Date de naissance</label>
            <input v-model="editingStaff.birthDate" type="date" required />
          </div>
          <div class="form-group">
            <label>Téléphone</label>
            <input v-model="editingStaff.phone" type="tel" required />
          </div>
          <div class="form-group">
            <label>Discipline</label>
            <select v-model="editingStaff.discipline" required>
              <option value="">Sélectionnez une discipline</option>
              <option
                v-for="option in DISCIPLINE_OPTIONS"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>Spécialité</label>
            <input
              v-model="editingStaff.specialty"
              type="text"
              placeholder="Ex: Troubles autistiques, Déficience motrice"
            />
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-secondary" @click="closeEditModal">
              Annuler
            </button>
            <button
              type="submit"
              class="btn-primary"
              :disabled="staffStore.loading"
            >
              {{ staffStore.loading ? "Modification..." : "Modifier" }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Suppression -->
    <div v-if="showDeleteModal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h4>Confirmer la suppression</h4>
          <button class="close-btn" @click="closeDeleteModal">×</button>
        </div>
        <div class="delete-confirmation">
          <div class="warning-icon">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#dc2626"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <div class="delete-content">
            <p class="delete-message">
              Êtes-vous sûr de vouloir supprimer définitivement le membre du
              personnel
              <strong>
                {{ staffToDelete?.firstName }}
                {{ staffToDelete?.lastName }}
              </strong>
              ?
            </p>
            <p class="delete-warning">
              Cette action est irréversible et toutes les données associées
              seront perdues.
            </p>
          </div>
          <div class="modal-actions">
            <button class="btn-secondary" @click="closeDeleteModal">
              Annuler
            </button>
            <button
              class="btn-danger"
              @click="confirmDeleteStaff"
              :disabled="staffStore.loading"
            >
              {{ staffStore.loading ? "Suppression..." : "Supprimer" }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { Grid, html } from "gridjs";
import { useStaffStore, DISCIPLINE_OPTIONS } from "@/stores/staff";
import type { Staff } from "@/stores/staff";
import { useToast } from "vue-toastification";

const staffStore = useStaffStore();
const toast = useToast();
const grid = ref<Grid | null>(null);
const gridWrapper = ref<HTMLElement | null>(null);

// États des modales
const showCreateModal = ref(false);
const showViewModal = ref(false);
const showEditModal = ref(false);
const showDeleteModal = ref(false);

// Données des modales
const selectedStaff = ref<Staff | null>(null);
const staffToDelete = ref<Staff | null>(null);

const newStaff = ref({
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  birthDate: "",
  phone: "",
  discipline: "",
  specialty: "",
});

const editingStaff = ref({
  id: null as number | null,
  firstName: "",
  lastName: "",
  birthDate: "",
  phone: "",
  discipline: "",
  specialty: "",
});

function formatDate(dateString) {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString("fr-FR");
}

function openCreateModal() {
  newStaff.value = {
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    birthDate: "",
    phone: "",
    discipline: "",
    specialty: "",
  };
  showCreateModal.value = true;
}

function closeCreateModal() {
  showCreateModal.value = false;
}

function viewStaff(staff) {
  selectedStaff.value = staff;
  showViewModal.value = true;
}

function closeViewModal() {
  showViewModal.value = false;
  selectedStaff.value = null;
}

function editStaff(staff) {
  editingStaff.value = {
    id: staff.id,
    firstName: staff.firstName,
    lastName: staff.lastName,
    birthDate: staff.birthDate.split("T")[0],
    phone: staff.phone || "",
    discipline: staff.discipline || "",
    specialty: staff.specialty || "",
  };
  showEditModal.value = true;
  showViewModal.value = false;
}

function closeEditModal() {
  showEditModal.value = false;
  editingStaff.value = {
    id: null,
    firstName: "",
    lastName: "",
    birthDate: "",
    phone: "",
    discipline: "",
    specialty: "",
  };
}

function openDeleteModal(staff) {
  staffToDelete.value = staff;
  showDeleteModal.value = true;
}

function closeDeleteModal() {
  showDeleteModal.value = false;
  staffToDelete.value = null;
}

async function createStaff() {
  try {
    // Nettoyer les données avant envoi - ne pas envoyer specialty si vide
    const staffData = { ...newStaff.value };
    if (!staffData.specialty || staffData.specialty.trim() === "") {
      delete staffData.specialty;
    }

    await staffStore.createStaff(staffData);
    toast.success("Membre du personnel créé avec succès");
    closeCreateModal();
    await fetchStaff();
  } catch (error) {
    toast.error(staffStore.error || "Erreur lors de la création");
  }
}

async function updateStaff() {
  try {
    const { id, ...updateData } = editingStaff.value;
    // Nettoyer les données avant envoi - ne pas envoyer specialty si vide
    if (!updateData.specialty || updateData.specialty.trim() === "") {
      delete updateData.specialty;
    }

    await staffStore.updateStaff(id, updateData);
    toast.success("Membre du personnel modifié avec succès");
    closeEditModal();
    await fetchStaff();
  } catch (error) {
    toast.error(staffStore.error || "Erreur lors de la modification");
  }
}

async function confirmDeleteStaff() {
  if (!staffToDelete.value) return;

  try {
    await staffStore.deleteStaff(staffToDelete.value.id);
    toast.success("Membre du personnel supprimé avec succès");
    closeDeleteModal();
    await fetchStaff();
  } catch (error) {
    toast.error(staffStore.error || "Erreur lors de la suppression");
  }
}

async function fetchStaff() {
  try {
    await staffStore.fetchStaff();
    setTimeout(() => {
      updateGrid();
    }, 100);
  } catch (error) {
    toast.error("Erreur lors du chargement du personnel");
  }
}

function updateGrid() {
  if (grid.value && staffStore.staff.length > 0) {
    // Trier par nom puis prénom pour un ordre stable
    const sortedStaff = [...staffStore.staff].sort((a, b) => {
      const lastNameCompare = a.lastName.localeCompare(b.lastName);
      if (lastNameCompare === 0) {
        return a.firstName.localeCompare(b.firstName);
      }
      return lastNameCompare;
    });

    const gridData = sortedStaff.map((staff) => [
      staff.firstName,
      staff.lastName,
      staff.phone || "Non renseigné",
      staffStore.getDisciplineLabel(staff.discipline),
      staff.specialty || "Non renseignée",
      staff.id,
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
      { id: "discipline", name: "Discipline", width: "180px" },
      { id: "specialty", name: "Spécialité", width: "200px" },
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
    const staff = staffStore.staff.find((s) => s.id === id);

    if (target.classList.contains("view-btn")) {
      viewStaff(staff);
    } else if (target.classList.contains("edit-btn")) {
      editStaff(staff);
    } else if (target.classList.contains("delete-btn")) {
      openDeleteModal(staff);
    }
  });
}

onMounted(async () => {
  initGrid();
  await fetchStaff();
});
</script>

<style scoped lang="scss">
@use "sass:color";

.dashboard-staff {
  .staff-header {
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
        background-color: color.adjust($primary-color, $lightness: -10%);
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

    .staff-details {
      padding: 1.5rem;
    }

    .form-group,
    .detail-group {
      margin-bottom: 1rem;

      label {
        display: block;
        font-weight: 500;
        color: #374151;
        margin-bottom: 0.5rem;
      }

      input,
      select {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 0.875rem;
        transition: border-color 0.2s;

        &:focus {
          outline: none;
          border-color: $primary-color;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
      }

      small {
        display: block;
        color: #6b7280;
        font-size: 0.75rem;
        margin-top: 0.25rem;
      }

      p {
        margin: 0;
        color: #111827;
        font-size: 0.875rem;
        padding: 0.5rem 0;
      }
    }

    .modal-actions {
      padding: 1.5rem;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: flex-end;
      gap: 1rem;

      .btn-secondary,
      .btn-primary,
      .btn-danger {
        padding: 0.75rem 1.5rem;
        border: none;
        border-radius: 6px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }

      .btn-secondary {
        background-color: #f3f4f6;
        color: #374151;

        &:hover:not(:disabled) {
          background-color: #e5e7eb;
        }
      }

      .btn-primary {
        background-color: $primary-color;
        color: white;

        &:hover:not(:disabled) {
          background-color: color.adjust($primary-color, $lightness: -10%);
        }
      }

      .btn-danger {
        background-color: #dc2626;
        color: white;

        &:hover:not(:disabled) {
          background-color: #b91c1c;
        }
      }
    }
  }
}

.delete-confirmation {
  padding: 1.5rem;
  text-align: center;

  .warning-icon {
    margin-bottom: 1rem;
  }

  .delete-content {
    margin-bottom: 1.5rem;

    .delete-message {
      font-size: 1rem;
      color: #111827;
      margin-bottom: 0.5rem;

      strong {
        color: #dc2626;
      }
    }

    .delete-warning {
      font-size: 0.875rem;
      color: #6b7280;
      margin: 0;
    }
  }
}

:deep(.gridjs-wrapper) {
  .action-buttons {
    display: flex;
    gap: 0.5rem;
    justify-content: center;

    .btn-icon {
      padding: 0.5rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;

      &.view-btn {
        background-color: #3b82f6;
        color: white;

        &:hover {
          background-color: #2563eb;
          transform: translateY(-1px);
        }
      }

      &.edit-btn {
        background-color: #6b7280;
        color: white;

        &:hover {
          background-color: #4b5563;
          transform: translateY(-1px);
        }
      }

      &.delete-btn {
        background-color: #dc2626;
        color: white;

        &:hover {
          background-color: #b91c1c;
          transform: translateY(-1px);
        }
      }

      svg {
        flex-shrink: 0;
      }
    }
  }
}
</style>
