<template>
  <main class="profile-container" lang="fr" role="main">
    <!-- Skip links pour navigation clavier -->
    <div class="skip-links">
      <a href="#main-content" class="skip-link">Aller au contenu principal</a>
      <a href="#registrations-table" class="skip-link">Aller au tableau des inscriptions</a>
    </div>
    
    <!-- Content -->
    <div class="profile-content" id="main-content">
      <div class="content-grid">
        <!-- En-tête avec PageHeader -->
        <PageHeader 
          title="Mes inscriptions aux événements"
          subtitle="Gérez vos inscriptions aux événements du samedi"
          icon="assignment"
        />
        
        <!-- Section principale avec inscriptions -->
        <section class="profile-section" id="registrations-table" aria-labelledby="registrations-title">
          <div class="section-header">
            <h2 id="registrations-title">
              <i class="material-icons" aria-hidden="true">assignment</i>
              Mes inscriptions
            </h2>
          </div>

          <div class="section-content">
            <!-- Bouton sous le header -->
            <div class="content-actions">
              <router-link to="/events" class="edit-btn edit-btn-blue">
                <i class="material-icons" aria-hidden="true">arrow_back</i>
                Voir les événements
              </router-link>
            </div>

            <!-- Info note -->
            <div class="info-note" role="note">
              <i class="material-icons" aria-hidden="true">info</i>
              <span>Vous pouvez annuler vos inscriptions directement depuis ce tableau</span>
            </div>

            <!-- État de chargement -->
            <div v-if="eventStore.loading" class="loading-indicator">
              <i class="material-icons spinning">hourglass_empty</i>
              <span>Chargement des inscriptions...</span>
            </div>

            <!-- Message d'erreur -->
            <div v-if="eventStore.error" class="error-message">
              <i class="material-icons">error</i>
              {{ eventStore.error }}
            </div>

            <!-- Tableau des inscriptions -->
            <div class="grid-container">
              <div ref="gridWrapper" v-show="eventStore.myRegistrations.length"></div>
              
              <!-- État vide -->
              <div
                v-if="!eventStore.loading && !eventStore.myRegistrations.length"
                class="empty-state"
              >
                <i class="material-icons">event_busy</i>
                <p>Aucune inscription pour le moment</p>
                <small>Vos futures inscriptions apparaîtront ici</small>
              </div>
            </div>
          </div>
        </section>
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
            <i class="material-icons" style="color: #dc2626; font-size: 3rem;">cancel</i>
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
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { Grid, html } from "gridjs";
import { useEventStore } from "@/stores/eventStore";
import { useToast } from "vue-toastification";
import PageHeader from "@/components/PageHeader.vue";

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

function canCancelEvent(eventDate: string): boolean {
  const now = new Date();
  const event = new Date(eventDate);
  
  // Retirer l'heure pour comparer seulement les dates
  now.setHours(0, 0, 0, 0);
  event.setHours(0, 0, 0, 0);
  
  // Peut annuler seulement si l'événement est dans le futur
  return event.getTime() > now.getTime();
}

function initGrid() {
  grid.value = new Grid({
    columns: [
      { id: "eventTitle", name: "Événement" },
      { id: "eventDate", name: "Date" },
      { id: "children", name: "Enfants inscrits", width: "200px" },
      { id: "paymentStatus", name: "Statut paiement", width: "150px" },
      { id: "rawEventDate", name: "", hidden: true }, // Date brute cachée
      {
        name: "Actions",
        width: "120px",
        formatter: (cell, row) => {
          const isCancelled = row.cells[3].data === "CANCELLED";
          const canCancel = canCancelEvent(row.cells[4].data); // Date brute dans cells[4]
          const registrationId = row.cells[5].data; // registrationId déplacé à cells[5]
          
          let buttonText = "Annuler";
          let buttonClass = "btn-icon cancel-btn";
          
          if (isCancelled) {
            buttonText = "Annulé";
          } else if (!canCancel) {
            buttonText = "Expiré";
            buttonClass += " expired";
          }
          
          return html(`
            <button class="${buttonClass}" data-id="${registrationId}" ${
              isCancelled || !canCancel ? "disabled" : ""
            }>${buttonText}</button>
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
        color: "#1f2937 !important",
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
        background: "#4444ac",
        color: "#ffffff",
        "border-color": "#4444ac",
        "box-shadow": "0 2px 8px rgba(68, 68, 172, 0.3)",
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
    getPaymentStatusLabel(reg.paymentStatus), // ✅ CORRIGÉ : Statut traduit
    reg.eventDate, // Date brute pour la logique d'annulation
    reg.registrationId,
  ]);
  grid.value.updateConfig({ data });
  grid.value.forceRender();
}

// ✅ NOUVEAU : Fonctions de traduction des statuts
function getPaymentStatusLabel(status: string): string {
  const labels = {
    'PENDING': 'En attente',
    'PAID': 'Payé',
    'FREE': 'Gratuit', 
    'FAILED': 'Échec du paiement',
    'CANCELLED': 'Annulé'
  };
  return labels[status as keyof typeof labels] || status;
}

function askCancel(reg: any) {
  // Vérifier si l'événement peut encore être annulé
  if (!canCancelEvent(reg.eventDate)) {
    toast.error("Impossible d'annuler : l'événement a déjà eu lieu ou est prévu aujourd'hui");
    return;
  }
  
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
@import '@/assets/styles/profile-common.scss';

// Styles pour le tableau GridJS
.grid-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  border: 1px solid #e5e7eb;
}

// Styles pour les boutons dans le tableau GridJS
:deep(.gridjs-wrapper) {
  .btn-icon {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    background: #dc2626;
    color: white;
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
      color: #9ca3af;
      box-shadow: none;
    }

    &.expired {
      background: #f59e0b;
      color: white;
      
      &:disabled {
        background: #fbbf24;
        opacity: 0.7;
      }
    }
  }
}

// Styles pour la modal de confirmation
.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(5px);
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
        font-size: 1.25rem;
        font-weight: 600;
        margin: 0;
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

    .delete-confirmation {
      padding: 2rem;
      text-align: center;

      .warning-icon {
        margin-bottom: 1rem;
      }

      .delete-message {
        font-size: 1rem;
        color: #374151;
        margin-bottom: 2rem;
        line-height: 1.6;

        strong {
          color: #dc2626;
        }
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

        .btn-danger {
          background: #dc2626;
          color: white;
          border: 1px solid #dc2626;

          &:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(220, 38, 38, 0.3);
          }
        }
      }
    }
  }
}

// Responsive design
@media (max-width: 768px) {
  .grid-container {
    padding: 1rem;
  }

  .modal {
    .modal-content {
      margin: 1rem;

      .delete-confirmation {
        padding: 1.5rem;

        .modal-actions {
          flex-direction: column;

          .btn-secondary,
          .btn-danger {
            width: 100%;
          }
        }
      }
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
