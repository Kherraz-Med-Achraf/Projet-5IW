<template>
  <div class="event-admin">
    <div class="event-header">
      <h3>Gestion des événements du samedi</h3>
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
        Ajouter un événement
      </button>
    </div>

    <!-- Tableau avec GridJS -->
    <div class="events-table-card">
      <div class="grid-container">
        <div ref="gridWrapper"></div>
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
            <input
              type="file"
              accept="image/*"
              @change="onFile"
              class="file-input"
            />
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

    <!-- ─── Liste des événements ─────────────────────────────────────── -->
    <table v-if="eventStore.events.length" class="table">
      <thead>
        <tr>
          <th>Titre</th><th>Date</th><th>Horaire</th><th>Prix</th><th>Capacité</th><th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="ev in eventStore.events" :key="ev.id">
          <td>{{ ev.title }}</td>
          <td>{{ formatDate(ev.date) }}</td>
          <td>{{ ev.startTime.slice(11,16) }} – {{ ev.endTime.slice(11,16) }}</td>
          <td>{{ ev.priceCt === 0 ? 'Gratuit' : (ev.priceCt/100).toFixed(2)+' €' }}</td>
          <td>{{ ev.capacity ?? '—' }}</td>
          <td>
            <button @click="edit(ev)" :disabled="ev.isLocked" :title="ev.isLocked ? 'Événement verrouillé (inscriptions reçues)' : ''">
              {{ ev.isLocked ? '🔒 Verrouillé' : 'Éditer' }}
            </button>
            <button @click="remove(ev.id)">Supprimer</button>
            <router-link :to="`/events/${ev.id}/registrations`">Inscriptions</router-link>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted, computed, watch } from "vue";
import { Grid, html } from "gridjs";
import { useEventStore } from "@/stores/eventStore";
import { useToast } from "vue-toastification";
import { useRouter } from "vue-router";

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

async function onSubmit(): Promise<void> {
  console.log('🚀 onSubmit() appelé!');
  console.log('Form data:', form);
  console.log('EditingId:', editingId.value);
  
  if (!form.date) {
    console.log('❌ Erreur: Date requise');
    toast.error("Date requise");
    return;
  }

  if (!isSaturday(form.date)) {
    console.log('❌ Erreur: La date doit être un samedi');
    toast.error("La date doit être un samedi");
    return;
  }

  console.log('✅ Validation passée, préparation FormData...');
  
  const fd = new FormData();
  Object.entries(form).forEach(([k, v]) => {
    if (v !== undefined && v !== "") {
      fd.append(k, String(v));
    }
  });

  if (file.value) {
    console.log('📸 Upload d\'image détecté:', {
      name: file.value.name,
      size: file.value.size,
      type: file.value.type
    });
    fd.append("image", file.value);
  } else {
    console.log('🖼️ Aucune image sélectionnée');
  }

  // Debug: afficher le contenu du FormData
  console.log('📦 FormData contents:');
  for (let [key, value] of fd.entries()) {
    console.log(`  ${key}:`, value);
  }

  try {
    console.log('🔄 Démarrage de l\'opération API...');
    
    if (editingId.value) {
      console.log('📝 Mode édition, ID:', editingId.value);
      await eventStore.updateEvent(editingId.value, fd);
      toast.success("Événement mis à jour avec succès");
    } else {
      console.log('➕ Mode création');
      await eventStore.createEvent(fd);
      toast.success("Événement créé avec succès");
    }
    
    console.log('✅ Opération API réussie');
    
    // Fermer le modal après succès
    closeEventModal();
    
    console.log('🔄 Mise à jour du grid dans 200ms...');
    // Le store fait déjà fetchEvents(), donc on met juste à jour le grid
    setTimeout(() => {
      console.log('🔄 Timeout atteint, events.length:', eventStore.events.length);
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
    console.error('💥 Erreur lors de la soumission:', error);
    console.error('💥 Store error:', eventStore.error);
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
  console.log('UpdateGrid appelé, events.length:', eventStore.events.length);
  
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

    console.log('Mise à jour du grid avec', gridData.length, 'événements');
    
    grid.value.updateConfig({
      data: gridData,
    });
    grid.value.forceRender();
  } else {
    console.log('Aucun événement, mise à jour avec tableau vide');
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

// Variables
$primary-color: #667eea;
$secondary-color: #f8fafc;
$danger-color: #dc2626;
$border-color: #e2e8f0;
$text-primary: #111827;
$text-secondary: #6b7280;
$shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
$shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
  0 2px 4px -1px rgba(0, 0, 0, 0.06);

.event-admin {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;

  .event-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;

    h3 {
      margin: 0;
      color: $text-primary;
      font-size: 1.75rem;
      font-weight: 600;
    }

    .btn-primary {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      background: linear-gradient(135deg, $primary-color 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s ease;
      box-shadow: 0 2px 4px rgba(102, 126, 234, 0.2);

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
      }
    }
  }

  .events-table-card {
    background: white;
    border-radius: 12px;
    box-shadow: $shadow-md;
    margin-bottom: 2rem;
    overflow: hidden;
  }

  .grid-container {
    padding: 1.5rem;
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
    border-radius: 12px;
    width: 90%;
    max-width: 800px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 30px rgba(0, 0, 0, 0.3);

    .modal-header {
      padding: 1.5rem;
      border-bottom: 1px solid $border-color;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: $secondary-color;

      h4 {
        margin: 0;
        color: $text-primary;
        font-size: 1.25rem;
        font-weight: 600;
      }

      .close-btn {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: $text-secondary;
        padding: 0.25rem;
        border-radius: 4px;
        transition: all 0.2s ease;

        &:hover {
          color: $text-primary;
          background-color: #e5e7eb;
        }
      }
    }

    .event-form {
      padding: 1.5rem;

      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
        margin-bottom: 1rem;

        @media (max-width: 768px) {
          grid-template-columns: 1fr;
        }
      }

      .form-group {
        margin-bottom: 1rem;

        label {
          display: block;
          font-weight: 500;
          color: $text-primary;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
        }

        input,
        textarea,
        select {
          width: 100%;
          padding: 0.75rem;
          border: 2px solid $border-color;
          border-radius: 8px;
          font-size: 0.875rem;
          transition: all 0.2s ease;
          background-color: white;

          &:focus {
            outline: none;
            border-color: $primary-color;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
          }

          &::placeholder {
            color: $text-secondary;
          }
        }

        textarea {
          resize: vertical;
          min-height: 80px;
        }

        .file-input {
          border: 2px dashed $border-color;
          background-color: #fafafa;
          cursor: pointer;

          &:hover {
            border-color: $primary-color;
            background-color: rgba(102, 126, 234, 0.05);
          }
        }

        .error-text {
          color: $danger-color;
          font-size: 0.75rem;
          margin-top: 0.25rem;
          display: block;
        }
      }
    }

    .modal-actions {
      padding: 1.5rem;
      border-top: 1px solid $border-color;
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      background: $secondary-color;

      .btn-primary,
      .btn-secondary {
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
        color: $text-secondary;
        border: 1px solid $border-color;

        &:hover:not(:disabled) {
          background-color: #f3f4f6;
          transform: translateY(-1px);
        }
      }

      .btn-primary {
        background: linear-gradient(135deg, $primary-color 0%, #764ba2 100%);
        color: white;
        box-shadow: 0 2px 4px rgba(102, 126, 234, 0.2);

        &:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
        }
      }
    }

    .error-message {
      margin: 0 1.5rem 1.5rem;
      padding: 0.75rem 1rem;
      background-color: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 6px;
      color: $danger-color;
      font-size: 0.875rem;
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
      text-decoration: none;

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
        background-color: $primary-color;
        color: white;

        &:hover {
          background-color: color.adjust($primary-color, $lightness: -10%);
          transform: translateY(-1px);
        }
      }

      svg {
        flex-shrink: 0;
      }
    }
  }
}

// Responsive design
@media (max-width: 768px) {
  .event-admin {
    padding: 1rem;

    .event-form {
      .form-actions {
        flex-direction: column;

        .btn-primary,
        .btn-secondary {
          width: 100%;
        }
      }
    }
  }
}
</style>
