<template>
  <div class="my-events">
    <div class="event-header">
      <h1>Mes inscriptions aux événements</h1>
      <p class="subtitle">Gérez vos inscriptions aux événements du samedi</p>
      <router-link to="/events" class="btn-primary events-link">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Voir les événements
      </router-link>
    </div>

    <div v-if="eventStore.loading" class="loading">
      <div class="loading-spinner"></div>
      <p>Chargement des inscriptions...</p>
    </div>

    <div v-if="eventStore.error" class="error-message">
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
      {{ eventStore.error }}
    </div>

    <div class="grid-container">
      <div ref="gridWrapper" v-show="eventStore.myRegistrations.length"></div>
      <div
        v-if="!eventStore.loading && !eventStore.myRegistrations.length"
        class="no-events"
      >
        <svg
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <h3>Aucune inscription pour le moment</h3>
        <p>Vos futures inscriptions apparaîtront ici</p>
      </div>
    </div>

    <!-- Modal Annulation -->
    <div v-if="showCancelModal" class="modal" @click.self="closeCancelModal">
      <div class="modal-content">
        <div class="modal-header">
          <h4>Confirmer l'annulation</h4>
          <button class="close-btn" @click="closeCancelModal">×</button>
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
          <p class="delete-message">
            Êtes-vous sûr de vouloir annuler votre inscription à
            <strong>{{ registrationToCancel?.eventTitle }}</strong>
            ?
          </p>
          <div class="modal-actions">
            <button class="btn-secondary" @click="closeCancelModal">
              Retour
            </button>
            <button
              class="btn-danger"
              @click="confirmCancel"
              :disabled="eventStore.loading"
            >
              {{ eventStore.loading ? "Annulation…" : "Confirmer" }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { Grid, html } from "gridjs";
import { useEventStore } from "@/stores/eventStore";
import { useToast } from "vue-toastification";

const eventStore = useEventStore();
const toast = useToast();

const grid = ref<Grid | null>(null);
const gridWrapper = ref<HTMLElement | null>(null);

// État modale annulation
const showCancelModal = ref(false);
const registrationToCancel = ref<any | null>(null);

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR");
}

function initGrid() {
  grid.value = new Grid({
    columns: [
      { id: "eventTitle", name: "Événement" },
      { id: "eventDate", name: "Date" },
      { id: "children", name: "Enfants inscrits", width: "200px" },
      { id: "paymentStatus", name: "Statut paiement", width: "150px" },
      {
        name: "Actions",
        width: "120px",
        formatter: (cell, row) =>
          html(`
            <button class="btn-icon cancel-btn" data-id="${
              row.cells[4].data
            }" ${
            row.cells[3].data === "CANCELLED" ? "disabled" : ""
          }>Annuler</button>
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
    } as any,
  });

  if (gridWrapper.value) {
    grid.value.render(gridWrapper.value);
  }

  gridWrapper.value!.addEventListener("click", (e) => {
    const target = (e.target as HTMLElement).closest(
      "button"
    ) as HTMLButtonElement | null;
    if (!target || !target.classList.contains("cancel-btn")) return;
    const id = target.dataset.id;
    if (!id) return;
    const reg = eventStore.myRegistrations.find((r) => r.registrationId === id);
    if (reg) askCancel(reg);
  });
}

function updateGrid() {
  if (!grid.value) return;
  const data = eventStore.myRegistrations.map((reg) => [
    reg.eventTitle,
    formatDate(reg.eventDate),
    reg.children.join(", "),
    reg.paymentStatus,
    reg.registrationId,
  ]);
  grid.value.updateConfig({ data });
  grid.value.forceRender();
}

function askCancel(reg: any) {
  registrationToCancel.value = reg;
  showCancelModal.value = true;
}

function closeCancelModal() {
  showCancelModal.value = false;
  registrationToCancel.value = null;
}

async function confirmCancel() {
  if (!registrationToCancel.value) return;
  const res = await eventStore.cancelRegistration(
    registrationToCancel.value.registrationId
  );
  if (res) {
    toast.success("Inscription annulée");
    await eventStore.fetchMyEvents();
    updateGrid();
  }
  closeCancelModal();
}

onMounted(async () => {
  initGrid();
  await eventStore.fetchMyEvents();
  updateGrid();
});

watch(
  () => eventStore.myRegistrations.length,
  () => updateGrid()
);
</script>

<style scoped lang="scss">
@use "sass:color";

// Variables
$primary-color: #667eea;
$secondary-color: #f8fafc;
$success-color: #10b981;
$warning-color: #f59e0b;
$danger-color: #dc2626;
$border-color: #e2e8f0;
$text-primary: #111827;
$text-secondary: #6b7280;
$text-muted: #9ca3af;
$shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
$shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
  0 2px 4px -1px rgba(0, 0, 0, 0.06);
$shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
  0 4px 6px -2px rgba(0, 0, 0, 0.05);

.my-events {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;

  .event-header {
    text-align: center;
    margin-bottom: 3rem;

    h1 {
      margin: 0 0 0.5rem 0;
      color: $text-primary;
      font-size: 2.5rem;
      font-weight: 700;
      background: linear-gradient(135deg, $primary-color 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .subtitle {
      margin: 0;
      color: $text-secondary;
      font-size: 1.125rem;
      font-weight: 400;
    }

    .events-link {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 1.5rem;
      padding: 0.5rem 1rem;
      background: linear-gradient(135deg, $primary-color 0%, #764ba2 100%);
      color: #ffffff;
      border: none;
      border-radius: 8px;
      font-weight: 500;
      transition: all 0.2s ease;
      text-decoration: none;

      svg {
        flex-shrink: 0;
      }

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
      }
    }
  }

  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
    color: $text-secondary;

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid $border-color;
      border-top: 3px solid $primary-color;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 1rem;
    }

    p {
      margin: 0;
      font-size: 1.125rem;
    }
  }

  .error-message {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 1.5rem;
    background-color: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 8px;
    color: $danger-color;
    font-weight: 500;
    margin-bottom: 2rem;

    svg {
      flex-shrink: 0;
    }
  }

  .grid-container {
    background: white;
    border-radius: 16px;
    box-shadow: $shadow-md;
    padding: 1.5rem;
    border: 1px solid $border-color;
  }

  .no-events {
    text-align: center;
    padding: 4rem 2rem;
    color: $text-secondary;

    svg {
      margin-bottom: 1.5rem;
      opacity: 0.5;
    }

    h3 {
      margin: 0 0 0.5rem 0;
      color: $text-primary;
      font-size: 1.5rem;
      font-weight: 600;
    }

    p {
      margin: 0;
      font-size: 1rem;
    }
  }
}

:deep(.gridjs-wrapper) {
  .btn-icon {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    background: linear-gradient(135deg, $danger-color 0%, #b91c1c 100%);
    color: #ffffff;
    transition: all 0.2s ease;
    font-weight: 500;
    font-size: 0.875rem;
    box-shadow: 0 2px 4px rgba(220, 38, 38, 0.2);

    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(220, 38, 38, 0.3);
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      background: #e5e7eb;
      color: $text-muted;
      box-shadow: none;
    }
  }
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

// Responsive design
@media (max-width: 768px) {
  .my-events {
    padding: 1rem;

    .event-header {
      margin-bottom: 2rem;

      h1 {
        font-size: 2rem;
      }

      .subtitle {
        font-size: 1rem;
      }
    }

    .grid-container {
      padding: 1rem;
    }
  }
}

// Styles modale annulation (réutilisés)
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
    max-width: 500px;
    overflow: hidden;

    .modal-header {
      padding: 1rem 1.5rem;
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

    .delete-confirmation {
      padding: 1.5rem;
      text-align: center;

      .warning-icon {
        margin-bottom: 1rem;
      }

      .delete-message {
        font-size: 1rem;
        color: $text-primary;
        margin-bottom: 1.5rem;
      }

      .modal-actions {
        display: flex;
        justify-content: center;
        gap: 1rem;

        .btn-secondary,
        .btn-danger {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.875rem;
        }

        .btn-secondary {
          background-color: #f3f4f6;
          color: $text-secondary;

          &:hover {
            background-color: #e5e7eb;
            transform: translateY(-1px);
          }
        }

        .btn-danger {
          background-color: $danger-color;
          color: white;

          &:hover:not(:disabled) {
            background-color: #b91c1c;
            transform: translateY(-1px);
          }

          &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
        }
      }
    }
  }
}
</style>
