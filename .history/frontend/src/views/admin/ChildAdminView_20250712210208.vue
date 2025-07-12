<template>
  <main class="profile-container" lang="fr" role="main">
    <div class="skip-links">
      <a href="#main-content" class="skip-link">Aller au contenu principal</a>
      <a href="#children-table" class="skip-link">Aller au tableau des enfants</a>
    </div>
    
    <div class="profile-content" id="main-content">
      <div class="content-grid">
        <PageHeader 
          title="Gestion des enfants"
          subtitle="Administration et gestion des comptes enfants"
          icon="child_care"
        />
        
        <section class="profile-section" id="children-table" aria-labelledby="children-title">
          <div class="section-header">
            <h2 id="children-title">
              <i class="material-icons" aria-hidden="true">child_care</i>
              Liste des enfants
            </h2>
          </div>

          <div class="section-content">
            <div class="content-actions">
              <button class="edit-btn edit-btn-green" @click="openCreateModal">
                <i class="material-icons" aria-hidden="true">add</i>
                Ajouter un enfant
              </button>
            </div>

            <div class="info-note" role="note">
              <i class="material-icons" aria-hidden="true">info</i>
              <span>Gérez les comptes enfants de l'organisation</span>
            </div>

            <div v-if="loading" class="loading-indicator">
              <i class="material-icons spinning">hourglass_empty</i>
              <span>Chargement des enfants...</span>
            </div>

            <div v-if="error" class="error-message">
              <i class="material-icons">error</i>
              {{ error }}
            </div>

            <div class="grid-container">
              <div ref="gridWrapper" v-show="children.length"></div>
              <div v-if="!loading && !children.length" class="empty-state">
                <i class="material-icons">person_off</i>
                <p>Aucun enfant enregistré</p>
                <small>Commencez par ajouter un enfant</small>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>

    <!-- Modal de création/modification -->
    <div v-if="showModal" class="modal" @click.self="closeModal">
      <div class="modal-content">
        <div class="modal-header">
          <h4>{{ editingChild ? 'Modifier' : 'Ajouter' }} un enfant</h4>
          <button class="close-btn" @click="closeModal">×</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="saveChild" class="child-form">
            <div class="form-group">
              <label for="firstName">Prénom *</label>
              <input id="firstName" v-model="formData.firstName" type="text" required placeholder="Prénom" />
            </div>
            <div class="form-group">
              <label for="lastName">Nom *</label>
              <input id="lastName" v-model="formData.lastName" type="text" required placeholder="Nom" />
            </div>
            <div class="form-group">
              <label for="email">Email</label>
              <input id="email" v-model="formData.email" type="email" placeholder="email@exemple.com" />
            </div>
            <div class="form-group">
              <label for="birthDate">Date de naissance</label>
              <input id="birthDate" v-model="formData.birthDate" type="date" />
            </div>
            <div class="form-actions">
              <button type="button" class="btn-secondary" @click="closeModal">Annuler</button>
              <button type="submit" class="btn-primary" :disabled="loading">
                {{ loading ? 'Enregistrement...' : (editingChild ? 'Modifier' : 'Ajouter') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Modal de suppression -->
    <div v-if="showDeleteModal" class="modal" @click.self="closeDeleteModal">
      <div class="modal-content">
        <div class="modal-header">
          <h4>Confirmer la suppression</h4>
          <button class="close-btn" @click="closeDeleteModal">×</button>
        </div>
        <div class="delete-confirmation">
          <div class="warning-icon">
            <i class="material-icons" style="color: #dc2626; font-size: 3rem;">warning</i>
          </div>
          <p class="delete-message">
            Êtes-vous sûr de vouloir supprimer l'enfant
            <strong>{{ childToDelete?.firstName }} {{ childToDelete?.lastName }}</strong> ?
          </p>
          <div class="modal-actions">
            <button class="btn-secondary" @click="closeDeleteModal">Annuler</button>
            <button class="btn-danger" @click="confirmDelete" :disabled="loading">
              {{ loading ? 'Suppression...' : 'Supprimer' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { Grid, html } from 'gridjs';
import { useToast } from 'vue-toastification';
import PageHeader from '@/components/PageHeader.vue';
import { useChildStore } from '@/stores/child';
import { formatDate, formatDateSimple } from '@/utils/dateFormatter';

// États réactifs
const childStore = useChildStore();
const children = computed(() => childStore.children);
const loading = computed(() => childStore.loading);
const error = computed(() => childStore.error);
const showModal = ref(false);
const showDeleteModal = ref(false);
const editingChild = ref<any | null>(null);
const childToDelete = ref<any | null>(null);
const gridWrapper = ref<HTMLElement | null>(null);
const grid = ref<Grid | null>(null);
const toast = useToast();

const formData = ref({
  firstName: '',
  lastName: '',
  email: '',
  birthDate: '',
});

function openCreateModal() {
  editingChild.value = null;
  resetForm();
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
  editingChild.value = null;
  resetForm();
}

function closeDeleteModal() {
  showDeleteModal.value = false;
  childToDelete.value = null;
}

function resetForm() {
  formData.value = {
    firstName: '',
    lastName: '',
    email: '',
    birthDate: '',
  };
}

async function fetchChildren() {
  try {
    await childStore.fetchChildren();
    if (grid.value) {
      const formattedData = children.value.map(c => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        age: calculateAge(c.birthDate),
        parentEmail: c.parent?.user?.email || 'Non renseigné',
        parentName: c.parent ? `${c.parent.firstName} ${c.parent.lastName}` : 'Non renseigné',
        createdAt: c.createdAt
      }));
      grid.value.updateConfig({ data: formattedData }).forceRender();
    }
  } catch (err: any) {
    toast.error('Erreur lors du chargement des enfants');
  }
}

// Fonction pour calculer l'âge
function calculateAge(birthDate: string): number {
  if (!birthDate) return 0;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

async function saveChild() {
  try {
    if (editingChild.value) {
      // Modification
      await childStore.updateChild(editingChild.value.id, {
        firstName: formData.value.firstName,
        lastName: formData.value.lastName,
        birthDate: formData.value.birthDate,
      });
      toast.success('Enfant modifié avec succès');
    } else {
      // Création - Note: Nécessite un parentProfileId
      // Pour simplifier, on peut créer un enfant avec un parent par défaut
      toast.info('La création d\'enfants nécessite l\'association à un parent');
    }
    closeModal();
    await fetchChildren();
  } catch (err: any) {
    toast.error('Erreur lors de la sauvegarde');
  }
}

async function confirmDelete() {
  if (!childToDelete.value) return;
  
  try {
    await childStore.deleteChild(childToDelete.value.id);
    toast.success('Enfant supprimé avec succès');
    closeDeleteModal();
    await fetchChildren();
  } catch (err: any) {
    toast.error('Erreur lors de la suppression');
  }
}

function editChild(child: any) {
  editingChild.value = child;
  formData.value = {
    firstName: child.firstName,
    lastName: child.lastName,
    email: child.user?.email || child.email || '',
    birthDate: child.birthDate || '',
  };
  showModal.value = true;
}

function askDelete(child: any) {
  childToDelete.value = child;
  showDeleteModal.value = true;
}

function initGrid() {
  grid.value = new Grid({
    columns: [
      { 
        id: 'id',
        name: 'ID',
        hidden: true
      },
      { id: 'firstName', name: 'Prénom' },
      { id: 'lastName', name: 'Nom' },
      { 
        id: 'age', 
        name: 'Âge',
        formatter: (cell) => `${cell} ans`
      },
      { 
        id: 'parentEmail', 
        name: 'Email du parent'
      },
      { 
        id: 'parentName', 
        name: 'Parent'
      },
      { 
        id: 'createdAt', 
        name: 'Date de création',
        formatter: (cell) => formatDate(cell)
      },
      {
        name: 'Actions',
        width: '200px',
        formatter: (cell, row) => {
          const childId = row.cells[0].data; // L'ID est dans la première colonne (cachée)
          return html(`
            <div class="action-buttons">
              <button class="btn-icon edit-btn" data-id="${childId}" title="Modifier">
                <i class="material-icons">edit</i>
              </button>
              <button class="btn-icon delete-btn" data-id="${childId}" title="Supprimer">
                <i class="material-icons">delete</i>
              </button>
            </div>
          `);
        },
      },
    ],
    data: children.value.map(c => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      age: calculateAge(c.birthDate),
      parentEmail: c.parent?.user?.email || 'Non renseigné',
      parentName: c.parent ? `${c.parent.firstName} ${c.parent.lastName}` : 'Non renseigné',
      createdAt: c.createdAt
    })),
    search: true,
    sort: true,
    pagination: { limit: 10 },
    language: {
      search: { placeholder: 'Rechercher un enfant...' },
      pagination: {
        previous: 'Précédent',
        next: 'Suivant',
        showing: 'Affichage de',
        results: () => 'résultats',
      },
    },
    className: { table: 'custom-table' },
  });

  if (gridWrapper.value) {
    grid.value.render(gridWrapper.value);
    gridWrapper.value.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const button = target.closest('button');
      if (!button) return;

      const id = parseInt(button.dataset.id || '0');
      const child = children.value.find(c => c.id === id);

      if (button.classList.contains('edit-btn')) {
        editChild(child);
      } else if (button.classList.contains('delete-btn')) {
        askDelete(child);
      }
    });
  }
}

onMounted(async () => {
  await fetchChildren();
  initGrid();
});
</script>

<style scoped lang="scss">
@import '@/assets/styles/profile-common.scss';

.child-form {
  .form-group {
    margin-bottom: 1.5rem;

    label {
      display: block;
      font-weight: 500;
      color: #1f2937;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
    }

    input {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      background: #f8fafc;
      font-size: 0.875rem;
      transition: all 0.2s ease;

      &:focus {
        outline: none;
        border-color: $primary-color;
        box-shadow: 0 0 0 3px rgba(68, 68, 172, 0.1);
        background: white;
      }

      &::placeholder {
        color: #9ca3af;
      }
    }
  }

  .form-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid #e5e7eb;

    .btn-secondary,
    .btn-primary {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 0.875rem;

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .btn-secondary {
      background-color: white;
      color: #6b7280;
      border: 1px solid #e5e7eb;

      &:hover:not(:disabled) {
        background-color: #f3f4f6;
        transform: translateY(-1px);
      }
    }

    .btn-primary {
      background: $primary-color;
      color: white;
      border: 1px solid $primary-color;

      &:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(68, 68, 172, 0.3);
      }
    }

    .btn-danger {
      background: #dc2626;
      color: white;
      border: 1px solid #dc2626;

      &:hover:not(:disabled) {
        background: #b91c1c;
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(220, 38, 38, 0.3);
      }
    }
  }
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;

  .modal-content {
    background: white;
    border-radius: 12px;
    max-width: 500px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 1px solid #e5e7eb;
      background: $primary-color;
      color: white;

      h4 {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: white;
      }

      .close-btn {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: white;
        padding: 0.25rem;
        border-radius: 4px;
        transition: all 0.2s ease;

        &:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      }
    }

    .modal-body {
      padding: 1.5rem;
    }
  }
}

.delete-confirmation {
  text-align: center;
  padding: 1.5rem;

  .warning-icon {
    margin-bottom: 1rem;
  }

  .delete-message {
    margin: 0 0 1.5rem 0;
    color: #374151;
    font-size: 1rem;
    line-height: 1.5;

    strong {
      color: #1f2937;
      font-weight: 600;
    }
  }

  .modal-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
  }
}

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

  &.edit-btn {
    background-color: #eff6ff;
    color: #2563eb;

    &:hover {
      background-color: #dbeafe;
      transform: translateY(-1px);
    }
  }

  &.delete-btn {
    background-color: #fef2f2;
    color: #dc2626;

    &:hover {
      background-color: #fee2e2;
      transform: translateY(-1px);
    }
  }

  .material-icons {
    font-size: 1rem;
  }
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 0.75rem;
  color: #dc2626;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 1.5rem;

  i {
    color: #dc2626;
    font-size: 1.1rem;
    flex-shrink: 0;
  }
}
</style> 