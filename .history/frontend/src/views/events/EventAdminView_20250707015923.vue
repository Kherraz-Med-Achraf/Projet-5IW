<template>
  <main class="profile-container" lang="fr" role="main">
    <!-- Skip links pour navigation clavier -->
    <div class="skip-links">
      <a href="#main-content" class="skip-link">Aller au contenu principal</a>
      <a href="#events-table" class="skip-link">Aller au tableau des événements</a>
    </div>
    
    <!-- Content -->
    <div class="profile-content" id="main-content">
      <div class="content-grid">
        <!-- En-tête avec PageHeader -->
        <PageHeader 
          title="Gestion des événements du samedi"
          subtitle="Organisez et gérez les événements de loisirs pour les enfants"
          icon="event"
        />
        
        <!-- Section principale avec tableau -->
        <section class="profile-section" id="events-table" aria-labelledby="events-title">
          <div class="section-header">
            <h2 id="events-title">
              <i class="material-icons" aria-hidden="true">calendar_month</i>
              Liste des événements
            </h2>
            <button class="edit-btn edit-btn-blue" @click="openCreateModal">
              <i class="material-icons" aria-hidden="true">add</i>
              Ajouter un événement
            </button>
          </div>

          <div class="section-content">
            <!-- Info note -->
            <div class="info-note" role="note">
              <i class="material-icons" aria-hidden="true">info</i>
              <span>Les événements verrouillés ne peuvent plus être modifiés après réception des premières inscriptions</span>
            </div>

            <!-- Tableau avec GridJS -->
            <div class="events-table-card">
              <div class="grid-container">
                <div ref="gridWrapper"></div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>

    <!-- Modal Création/Édition -->
    <div v-if="showEventModal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h4>
            {{
              editingId ? "Modifier l'événement" : "Créer un nouvel événement"
            }}
          </h4>
          <button class="close-btn" @click="closeEventModal">×</button>
        </div>

        <form class="event-form" @submit.prevent="onSubmit">
          <div class="form-row">
            <div class="form-group">
              <label>Titre *</label>
              <input
                v-model="form.title"
                type="text"
                placeholder="Titre de l'événement"
                required
              />
            </div>
            <div class="form-group">
              <label>Date (samedi uniquement) *</label>
              <input
                v-model="form.date"
                type="date"
                required
                :min="getNextSaturday()"
                @input="validateSaturday"
              />
              <small v-if="dateError" class="error-text">{{ dateError }}</small>
            </div>
          </div>

          <div class="form-group">
            <label>Description</label>
            <textarea
              v-model="form.description"
              placeholder="Description de l'événement (optionnel)"
              rows="3"
            ></textarea>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Heure de début *</label>
              <input v-model="form.startTime" type="time" required />
            </div>
            <div class="form-group">
              <label>Heure de fin *</label>
              <input v-model="form.endTime" type="time" required />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Prix (€)</label>
              <input
                v-model.number="form.price"
                type="number"
                min="0"
                step="0.01"
                placeholder="0 = gratuit"
              />
            </div>
            <div class="form-group">
              <label>Capacité maximum</label>
              <input
                v-model.number="form.capacity"
                type="number"
                min="1"
                placeholder="Illimitée si vide"
              />
            </div>
          </div>

          <div class="form-group">
            <label>Image de l'événement</label>
            
            <!-- Image actuelle (en mode édition) -->
            <div v-if="editingId && currentImageUrl && !removeCurrentImage" class="current-image-section">
              <div class="current-image-header">
                <i class="material-icons">image</i>
                <span>Image actuelle</span>
              </div>
              <div class="current-image-content">
                <img :src="fullCurrentImageUrl || ''" alt="Image actuelle" class="current-image" />
                <button 
                  type="button" 
                  @click="removeCurrentImageFile" 
                  class="remove-current-image-btn"
                  title="Supprimer l'image actuelle"
                >
                  <i class="material-icons">delete</i>
                </button>
              </div>
            </div>
            
            <!-- Message si l'image actuelle a été supprimée -->
            <div v-if="editingId && removeCurrentImage" class="removed-image-notice">
              <i class="material-icons">info</i>
              <span>L'image actuelle sera supprimée lors de la sauvegarde</span>
            </div>
            
            <div class="file-upload-container">
              <input
                ref="fileInput"
                type="file"
                accept="image/*"
                @change="onFile"
                class="file-input"
              />
              <div class="file-upload-area" @click="fileInput?.click()">
                <div v-if="!file" class="file-upload-prompt">
                  <i class="material-icons">cloud_upload</i>
                  <span>{{editingId ? 'Changer l\'image' : 'Cliquez pour ajouter une image'}}</span>
                  <small>JPG, PNG, GIF (max 5MB)</small>
                </div>
                <div v-else class="file-selected">
                  <i class="material-icons">image</i>
                  <span>{{ file.name }}</span>
                  <button type="button" @click.stop="removeFile" class="remove-file-btn">
                    <i class="material-icons">close</i>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Aperçu de l'image -->
          <div v-if="imagePreview" class="image-preview">
            <div class="preview-header">
              <i class="material-icons">visibility</i>
              <span>Aperçu</span>
            </div>
            <div class="preview-content">
              <img :src="imagePreview" :alt="`Aperçu de ${file?.name}`" class="preview-image" />
            </div>
          </div>

          <div class="modal-actions">
            <button
              type="button"
              class="btn-secondary"
              @click="closeEventModal"
            >
              Annuler
            </button>
            <button
              type="submit"
              class="btn-primary"
              :disabled="eventStore.loading"
            >
              {{
                eventStore.loading
                  ? "Traitement..."
                  : editingId
                  ? "Mettre à jour"
                  : "Créer l'événement"
              }}
            </button>
          </div>
        </form>

        <p v-if="eventStore.error" class="error">{{ eventStore.error }}</p>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted, computed, watch } from "vue";
import { Grid, html } from "gridjs";
import { useEventStore } from "@/stores/eventStore";
import { useToast } from "vue-toastification";
import { useRouter } from "vue-router";
import { API_BASE_URL } from "@/config/api";
import PageHeader from "@/components/PageHeader.vue";

const eventStore = useEventStore();
const toast = useToast();
const router = useRouter();
const grid = ref<Grid | null>(null);
const gridWrapper = ref<HTMLElement | null>(null);

interface Form {
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  price: number;
  capacity?: number;
}

const form = reactive<Form>({
  title: "",
  description: "",
  date: "",
  startTime: "10:00",
  endTime: "12:00",
  price: 0,
});

const file = ref<File | null>(null);
const imagePreview = ref<string | null>(null);
const fileInput = ref<HTMLInputElement>();
const currentImageUrl = ref<string | null>(null);
const removeCurrentImage = ref<boolean>(false);
const editingId = ref<string>("");
const dateError = ref<string>("");
const showEventModal = ref(false);

// Computed pour la prévisualisation d'image
const isImage = computed(() => {
  return file.value?.type.startsWith('image/') ?? false;
});

// Watcher pour créer la prévisualisation
watch(file, (newFile) => {
  if (newFile && newFile.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.value = e.target?.result as string;
    };
    reader.readAsDataURL(newFile);
  } else {
    imagePreview.value = null;
  }
});

// Fonctions utilitaires pour les dates
function getNextSaturday(): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilSaturday = (6 - dayOfWeek) % 7;
  const nextSaturday = new Date(today);
  nextSaturday.setDate(
    today.getDate() + (daysUntilSaturday === 0 ? 7 : daysUntilSaturday)
  );
  return nextSaturday.toISOString().split("T")[0];
}

function isSaturday(dateString: string): boolean {
  const date = new Date(dateString + "T00:00:00");
  return date.getDay() === 6;
}

function validateSaturday(): void {
  dateError.value = "";
  if (form.date && !isSaturday(form.date)) {
    dateError.value = "Veuillez sélectionner un samedi";
    // Automatiquement corriger vers le samedi le plus proche
    const selectedDate = new Date(form.date + "T00:00:00");
    const dayOfWeek = selectedDate.getDay();
    const daysToAdd = (6 - dayOfWeek) % 7;
    const nextSaturday = new Date(selectedDate);
    nextSaturday.setDate(
      selectedDate.getDate() + (daysToAdd === 0 ? 7 : daysToAdd)
    );
    form.date = nextSaturday.toISOString().split("T")[0];
  }
}

function reset(): void {
  Object.assign(form, {
    title: "",
    description: "",
    date: "",
    startTime: "10:00",
    endTime: "12:00",
    price: 0,
    capacity: undefined,
  });
  file.value = null;
  imagePreview.value = null;
  currentImageUrl.value = null;
  removeCurrentImage.value = false;
  if (fileInput.value) {
    fileInput.value.value = '';
  }
  dateError.value = "";
}

function openCreateModal(): void {
  reset();
  editingId.value = "";
  showEventModal.value = true;
}

function closeEventModal(): void {
  showEventModal.value = false;
  reset();
}

function onFile(e: Event): void {
  const target = e.target as HTMLInputElement;
  const selectedFile = target.files?.[0] ?? null;
  
  if (selectedFile) {
    // Vérifier la taille (5MB max)
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error('Le fichier ne peut pas dépasser 5MB');
      return;
    }
    
    // Vérifier le type
    if (!selectedFile.type.startsWith('image/')) {
      toast.error('Seules les images sont autorisées');
      return;
    }
    
    file.value = selectedFile;
  }
}

function removeFile(): void {
  file.value = null;
  imagePreview.value = null;
  if (fileInput.value) {
    fileInput.value.value = '';
  }
}

function removeCurrentImageFile(): void {
  currentImageUrl.value = null;
  removeCurrentImage.value = true;
}

// Computed pour l'URL complète de l'image actuelle
const fullCurrentImageUrl = computed(() => {
  if (!currentImageUrl.value) return null;
  if (currentImageUrl.value.startsWith('http')) return currentImageUrl.value;
  return `${API_BASE_URL}${currentImageUrl.value}`;
});

async function onSubmit(): Promise<void> {
  if (!form.date) {
    toast.error("Date requise");
    return;
  }

  if (!isSaturday(form.date)) {
    toast.error("La date doit être un samedi");
    return;
  }

  const fd = new FormData();
  Object.entries(form).forEach(([k, v]) => {
    if (v !== undefined && v !== "") {
      fd.append(k, String(v));
    }
  });

  if (file.value) {
    fd.append("image", file.value);
  }

  // Gérer la suppression de l'image actuelle
  if (editingId.value && removeCurrentImage.value) {
    fd.append("removeImage", "true");
  }

  try {
    if (editingId.value) {
      await eventStore.updateEvent(editingId.value, fd);
      toast.success("Événement mis à jour avec succès");
    } else {
      await eventStore.createEvent(fd);
      toast.success("Événement créé avec succès");
    }
    
    // Fermer le modal après succès
    closeEventModal();
    
    // Le store fait déjà fetchEvents(), donc on met juste à jour le grid
    setTimeout(() => {
      if (eventStore.events.length > 0) {
        updateGrid();
      } else {
        // Si pas d'événements, on initialise un grid vide
        if (grid.value) {
          grid.value.updateConfig({ data: [] });
          grid.value.forceRender();
        }
      }
    }, 200);
    
  } catch (error) {
    console.error('Erreur lors de la soumission:', error);
    toast.error(eventStore.error || "Erreur lors de l'opération");
  }
}

function edit(ev: any): void {
  editingId.value = ev.id;
  Object.assign(form, {
    title: ev.title,
    description: ev.description || "",
    date: ev.date.substring(0, 10),
    startTime: ev.startTime.substring(11, 16),
    endTime: ev.endTime.substring(11, 16),
    price: ev.priceCt / 100,
    capacity: ev.capacity,
  });
  
  // Gérer l'image actuelle
  currentImageUrl.value = ev.imageUrl || null;
  removeCurrentImage.value = false;
  file.value = null;
  imagePreview.value = null;
  if (fileInput.value) {
    fileInput.value.value = '';
  }
  
  showEventModal.value = true;
}

async function remove(id: string): Promise<void> {
  if (confirm("Êtes-vous sûr de vouloir supprimer cet événement ?")) {
    try {
      await eventStore.deleteEvent(id);
      toast.success("Événement supprimé avec succès");
      
      // Le store fait déjà fetchEvents(), donc on met juste à jour le grid
      setTimeout(() => {
        if (eventStore.events.length > 0) {
          updateGrid();
        } else {
          // Si plus d'événements, on affiche un grid vide
          if (grid.value) {
            grid.value.updateConfig({ data: [] });
            grid.value.forceRender();
          }
        }
      }, 200);
      
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error("Erreur lors de la suppression");
    }
  }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(timeString: string): string {
  return timeString.slice(11, 16);
}

function formatPrice(priceCt: number): string {
  return priceCt === 0 ? "Gratuit" : `${(priceCt / 100).toFixed(2)} €`;
}

async function fetchEvents(): Promise<void> {
  try {
    await eventStore.fetchEvents();
    setTimeout(() => {
      updateGrid();
    }, 100);
  } catch (error) {
    toast.error("Erreur lors du chargement des événements");
  }
}

function updateGrid(): void {
  if (!grid.value) {
    console.warn('Grid non initialisé');
    return;
  }

  if (eventStore.events.length > 0) {
    const sortedEvents = [...eventStore.events].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const gridData = sortedEvents.map((event) => [
      event.title,
      formatDate(event.date),
      `${formatTime(event.startTime)} - ${formatTime(event.endTime)}`,
      formatPrice(event.priceCt),
      event.capacity || "Illimitée",
      event.isLocked ? "Verrouillé" : "Modifiable",
      event.id,
    ]);

    grid.value.updateConfig({
      data: gridData,
    });
    grid.value.forceRender();
  } else {
    grid.value.updateConfig({
      data: [],
    });
    grid.value.forceRender();
  }
}

function initGrid(): void {
  grid.value = new Grid({
    columns: [
      { id: "title", name: "Titre", width: "200px" },
      { id: "date", name: "Date", width: "180px" },
      { id: "time", name: "Horaires", width: "150px" },
      { id: "price", name: "Prix", width: "100px" },
      { id: "capacity", name: "Capacité", width: "100px" },
      { id: "status", name: "Statut", width: "120px" },
      {
        name: "Actions",
        width: "250px",
        formatter: (cell, row) => {
          const isLocked = row.cells[5].data === "Verrouillé";
          return html(`
            <div class="action-buttons">
              <button class="btn-icon edit-btn" data-id="${
                row.cells[6].data
              }" ${isLocked ? "disabled" : ""}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="m18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button class="btn-icon delete-btn" data-id="${
                row.cells[6].data
              }">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3,6 5,6 21,6"/>
                  <path d="m19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1,2-2h4a2,2 0 0,1,2,2v2"/>
                </svg>
              </button>
              <button class="btn-icon view-btn" data-id="${row.cells[6].data}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="m22 21-3-3m-3 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
                </svg>
              </button>
            </div>
          `);
        },
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
        placeholder: "Rechercher un événement...",
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
    },
  });

  grid.value.render(gridWrapper.value!);

  gridWrapper.value!.addEventListener("click", (e) => {
    const target = (e.target as Element).closest("button") as HTMLButtonElement;
    if (!target) return;

    const id = target.dataset.id;
    const event = eventStore.events.find((ev) => ev.id === id);

    if (target.classList.contains("edit-btn") && !target.disabled) {
      edit(event);
    } else if (target.classList.contains("delete-btn")) {
      remove(id!);
    } else if (target.classList.contains("view-btn")) {
      router.push(`/events/${id}/registrations`);
    }
  });
}

onMounted(async () => {
  initGrid();
  await fetchEvents();
});
</script>

<style scoped lang="scss">
@use "sass:color";

/* ===== IMPORTS DES STYLES COMMUNS ===== */
@import '@/assets/styles/profile-common.scss';

// Variables spécifiques aux événements
$event-primary: #667eea;
$event-secondary: #764ba2;
$danger-color: #dc2626;
$border-color: #e2e8f0;
$text-primary: #111827;
$text-secondary: #6b7280;

/* ===== STYLES SPÉCIFIQUES AUX ÉVÉNEMENTS ===== */
.events-table-card {
  background: white;
  border-radius: 1rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  border: 1px solid #f1f5f9;

  .grid-container {
    padding: 1.5rem;
  }
}

/* Override du section-header pour les événements */
.profile-section .section-header {
  background: #4444ac;
  color: white;

  h2 {
    color: white;

    i {
      color: white;
    }
  }

  .edit-btn-blue {
    background: white;
    color: #4444ac;
    border: 2px solid white;

    &:hover:not(:disabled) {
      background: #f8fafc;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
  }
}

/* ===== MODAL STYLES ===== */
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
  backdrop-filter: blur(4px);

  .modal-content {
    background: white;
    border-radius: 1.5rem;
    width: 90%;
    max-width: 800px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.2);

    .modal-header {
      padding: 2rem 2rem 0 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;

      h4 {
        margin: 0;
        color: $text-primary;
        font-size: 1.5rem;
        font-weight: 600;
        font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .close-btn {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: $text-secondary;
        padding: 0.5rem;
        border-radius: 0.5rem;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 2.5rem;
        height: 2.5rem;

        &:hover {
          color: $danger-color;
          background-color: rgba(220, 38, 38, 0.1);
        }
      }
    }

    .event-form {
      padding: 1.5rem 2rem 2rem 2rem;

      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1.5rem;
        margin-bottom: 1.5rem;

        @media (max-width: 768px) {
          grid-template-columns: 1fr;
          gap: 1rem;
        }
      }

      .form-group {
        margin-bottom: 1.5rem;

        label {
          display: block;
          font-weight: 600;
          color: $text-primary;
          margin-bottom: 0.75rem;
          font-size: 0.875rem;
          font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        input,
        textarea,
        select {
          width: 100%;
          padding: 0.875rem 1rem;
          border: 2px solid #e5e7eb;
          border-radius: 0.75rem;
          font-size: 0.875rem;
          transition: all 0.2s ease;
          background-color: white;
          font-family: inherit;

          &:focus {
            outline: none;
            border-color: $event-primary;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
          }

          &::placeholder {
            color: #9ca3af;
          }
        }

        textarea {
          resize: vertical;
          min-height: 100px;
        }

        .error-text {
          color: $danger-color;
          font-size: 0.75rem;
          margin-top: 0.5rem;
          display: block;
          font-weight: 500;
        }

        .file-input {
          display: none;
        }

        .file-upload-container {
          position: relative;
        }

        .file-upload-area {
          border: 2px dashed #d1d5db;
          border-radius: 0.75rem;
          padding: 2rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
          background-color: #f9fafb;

          &:hover {
            border-color: $event-primary;
            background-color: rgba(102, 126, 234, 0.02);
          }
        }

        .file-upload-prompt {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          color: $text-secondary;

          i {
            font-size: 3rem;
            color: $event-primary;
            margin-bottom: 0.5rem;
          }

          span {
            font-weight: 500;
            color: $text-primary;
            font-size: 0.875rem;
          }

          small {
            font-size: 0.75rem;
            color: $text-secondary;
          }
        }

        .file-selected {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: rgba(102, 126, 234, 0.05);
          border-radius: 0.5rem;
          color: $text-primary;

          i {
            color: $event-primary;
            font-size: 1.5rem;
          }

          span {
            flex: 1;
            text-align: left;
            font-weight: 500;
            font-size: 0.875rem;
          }

          .remove-file-btn {
            background: none;
            border: none;
            cursor: pointer;
            padding: 0.5rem;
            border-radius: 0.375rem;
            color: $text-secondary;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;

            &:hover {
              background: $danger-color;
              color: white;
            }

            i {
              font-size: 1.125rem;
            }
          }
        }
      }

      /* Styles pour les sections d'image */
      .current-image-section {
        margin-bottom: 1.5rem;
        border: 1px solid #e5e7eb;
        border-radius: 0.75rem;
        overflow: hidden;
        background: white;

        .current-image-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          background: rgba(34, 197, 94, 0.05);
          border-bottom: 1px solid #e5e7eb;
          font-weight: 500;
          color: $text-primary;

          i {
            color: #22c55e;
            font-size: 1.25rem;
          }
        }

        .current-image-content {
          padding: 1.5rem;
          text-align: center;
          position: relative;

          .current-image {
            max-width: 100%;
            max-height: 200px;
            border-radius: 0.5rem;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            object-fit: cover;
          }

          .remove-current-image-btn {
            position: absolute;
            top: 2rem;
            right: 2rem;
            background: rgba(220, 38, 38, 0.9);
            color: white;
            border: none;
            border-radius: 50%;
            width: 2.5rem;
            height: 2.5rem;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s ease;
            backdrop-filter: blur(4px);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);

            &:hover {
              background: rgba(220, 38, 38, 1);
              transform: scale(1.05);
            }

            i {
              font-size: 1.125rem;
            }
          }
        }
      }

      .removed-image-notice {
        margin-bottom: 1.5rem;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 1rem;
        background: rgba(245, 101, 101, 0.1);
        border: 1px solid rgba(245, 101, 101, 0.2);
        border-radius: 0.75rem;
        color: #dc2626;
        font-size: 0.875rem;
        font-weight: 500;

        i {
          color: #dc2626;
          font-size: 1.25rem;
        }
      }

      .image-preview {
        margin-top: 1.5rem;
        border: 1px solid #e5e7eb;
        border-radius: 0.75rem;
        overflow: hidden;
        background: white;

        .preview-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          background: rgba(102, 126, 234, 0.05);
          border-bottom: 1px solid #e5e7eb;
          font-weight: 500;
          color: $text-primary;

          i {
            color: $event-primary;
            font-size: 1.25rem;
          }
        }

        .preview-content {
          padding: 1.5rem;
          text-align: center;

          .preview-image {
            max-width: 100%;
            max-height: 250px;
            border-radius: 0.5rem;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            object-fit: cover;
          }
        }
      }
    }

    .modal-actions {
      padding: 1.5rem 2rem 2rem 2rem;
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      border-top: 1px solid #f1f5f9;
      background: #fafbfc;

      .btn-primary,
      .btn-secondary {
        padding: 0.875rem 1.5rem;
        border: none;
        border-radius: 0.75rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 0.875rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }

      .btn-secondary {
        background-color: white;
        color: $text-secondary;
        border: 1px solid #d1d5db;

        &:hover:not(:disabled) {
          background-color: #f9fafb;
          border-color: #9ca3af;
        }
      }

      .btn-primary {
        background: linear-gradient(135deg, $event-primary 0%, $event-secondary 100%);
        color: white;
        box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);

        &:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }
      }
    }

    .error {
      margin: 0 2rem 1rem 2rem;
      padding: 1rem;
      background-color: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 0.75rem;
      color: $danger-color;
      font-size: 0.875rem;
      font-weight: 500;
    }
  }
}

/* ===== STYLES GRIDJS PERSONNALISÉS ===== */
:deep(.gridjs-wrapper) {
  .action-buttons {
    display: flex;
    gap: 0.5rem;
    justify-content: center;

    .btn-icon {
      padding: 0.5rem;
      border: none;
      border-radius: 0.375rem;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      text-decoration: none;
      width: 2rem;
      height: 2rem;

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      &.edit-btn {
        background-color: #6b7280;
        color: white;

        &:hover:not(:disabled) {
          background-color: #4b5563;
          transform: translateY(-1px);
        }
      }

      &.delete-btn {
        background-color: $danger-color;
        color: white;

        &:hover {
          background-color: #b91c1c;
          transform: translateY(-1px);
        }
      }

      &.view-btn {
        background-color: $event-primary;
        color: white;

        &:hover {
          background-color: color.adjust($event-primary, $lightness: -10%);
          transform: translateY(-1px);
        }
      }

      svg {
        flex-shrink: 0;
      }
    }
  }
}

/* ===== RESPONSIVE DESIGN ===== */
@media (max-width: 768px) {
  .modal {
    .modal-content {
      width: 95%;
      margin: 1rem;
      max-height: calc(100vh - 2rem);

      .modal-header {
        padding: 1.5rem 1.5rem 0 1.5rem;

        h4 {
          font-size: 1.25rem;
        }
      }

      .event-form {
        padding: 1rem 1.5rem 1.5rem 1.5rem;

        .form-row {
          grid-template-columns: 1fr;
          gap: 1rem;
        }
      }

      .modal-actions {
        padding: 1rem 1.5rem 1.5rem 1.5rem;
        flex-direction: column-reverse;

        .btn-primary,
        .btn-secondary {
          width: 100%;
          justify-content: center;
        }
      }
    }
  }
}

@media (max-width: 480px) {
  .events-table-card {
    margin: 0 -1rem;
    border-radius: 0;
    border-left: none;
    border-right: none;

    .grid-container {
      padding: 1rem;
    }
  }
}
</style>
