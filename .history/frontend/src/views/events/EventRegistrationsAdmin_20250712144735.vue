<template>
  <div class="event-registrations">
    <div class="registrations-header">
      <h3>Inscriptions – {{ title }}</h3>
      <router-link to="/events/admin" class="btn-secondary back-btn">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Retour
      </router-link>
    </div>

    <div v-if="eventStore.loading" class="loading">
      <div class="loading-spinner"></div>
      <p>Chargement des inscriptions...</p>
    </div>

    <div v-if="eventStore.error" class="error-message">
      {{ eventStore.error }}
    </div>

    <div v-if="rows.length" class="registrations-table-card">
      <div class="grid-container">
        <table class="table">
          <thead>
            <tr>
              <th>Parent</th>
              <th>Enfants inscrits</th>
              <th>Mode</th>
              <th>Statut</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r.id">
              <td>{{ r.parent }}</td>
              <td>{{ r.children.join(", ") }}</td>
              <td>{{ getPaymentMethodLabel(r.paymentMethod) }}</td>
              <td>{{ getPaymentStatusLabel(r.paymentStatus) }}</td>
              <td>
                <!-- Bouton "Paiement reçu" pour les chèques en attente -->
                <button
                  v-if="
                    r.paymentMethod === 'CHEQUE' &&
                    r.paymentStatus === 'PENDING'
                  "
                  class="btn-primary"
                  @click="markPaid(r)"
                  :disabled="eventStore.loading"
                >
                  Paiement reçu
                </button>

                <!-- ✅ CORRECTION 2: Boutons de désinscription pour tous les types de paiement -->
                <div class="action-buttons">
                  <!-- ✅ SIMPLIFIÉ: Tous les chèques (en attente ou payés) -->
                  <button 
                    v-if="r.paymentMethod === 'CHEQUE' && (r.paymentStatus === 'PENDING' || r.paymentStatus === 'PAID')" 
                    @click="cancelReg(r)" 
                    class="btn-danger"
                    :disabled="eventStore.loading"
                  >
                    Désinscrire
                  </button>

                  <!-- Paiement Stripe payé (avec remboursement) -->
                  <button 
                    v-if="r.paymentMethod === 'STRIPE' && r.paymentStatus === 'PAID'" 
                    @click="cancelReg(r)" 
                    class="btn-danger"
                    :disabled="eventStore.loading"
                  >
                    Désinscrire & Rembourser
                  </button>

                  <!-- Paiement Stripe en attente -->
                  <button 
                    v-if="r.paymentMethod === 'STRIPE' && r.paymentStatus === 'PENDING'" 
                    @click="cancelReg(r)" 
                    class="btn-danger"
                    :disabled="eventStore.loading"
                  >
                    Désinscrire
                  </button>

                  <!-- Événement gratuit -->
                  <button 
                    v-if="r.paymentMethod === 'FREE' || r.paymentStatus === 'FREE'" 
                    @click="cancelReg(r)" 
                    class="btn-danger"
                    :disabled="eventStore.loading"
                  >
                    Désinscrire
                  </button>

                  <!-- Paiement en échec -->
                  <button 
                    v-if="r.paymentStatus === 'FAILED'" 
                    @click="cancelReg(r)" 
                    class="btn-danger"
                    :disabled="eventStore.loading"
                  >
                    Supprimer
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <p v-else-if="!eventStore.loading" class="no-registrations">
      Aucune inscription.
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useEventStore } from "@/stores/eventStore";
import { useToast } from "vue-toastification";

const route = useRoute();
const eventStore = useEventStore();
const toast = useToast();

const eventId = route.params.eventId as string;
const title = ref("");
const rows = ref<any[]>([]);

async function load() {
  // ✅ CORRECTION 1: Charger d'abord les détails de l'événement pour avoir le titre
  const event = await eventStore.fetchEventById(eventId);
  if (event) {
    title.value = event.title;
  }

  // Puis charger les inscriptions
  const regs = await eventStore.fetchRegistrations(eventId);
  rows.value = regs.map((r: any) => ({
    id: r.id,
    parent: r.parentProfile.user.email,
    children: r.children.map(
      (c: any) => c.child.firstName + " " + c.child.lastName
    ),
    paymentMethod: r.paymentMethod,
    paymentStatus: r.paymentStatus,
    stripeSessionId: r.stripeSessionId, // ✅ AJOUT: Conserver l'ID de session pour les remboursements
  }));
}

async function markPaid(r: any) {
  await eventStore.validateCheque(r.id);
  toast.success("Paiement enregistré");
  await load();
}

async function cancelReg(r: any) {
  // ✅ CORRECTION 3: Messages personnalisés selon le type de paiement
  let confirmMessage = '';
  
  if (r.paymentMethod === 'STRIPE' && r.paymentStatus === 'PAID') {
    confirmMessage = `Désinscrire ${r.parent} et rembourser automatiquement le paiement Stripe ? Un email sera envoyé pour notifier l'annulation.`;
  } else if (r.paymentMethod === 'STRIPE' && r.paymentStatus === 'PENDING') {
    confirmMessage = `Désinscrire ${r.parent} (paiement Stripe en attente) ? Un email sera envoyé pour notifier l'annulation.`;
  } else if (r.paymentMethod === 'CHEQUE' && r.paymentStatus === 'PENDING') {
    confirmMessage = `Désinscrire ${r.parent} (paiement par chèque en attente) ? Un email sera envoyé pour notifier l'annulation.`;
  } else if (r.paymentMethod === 'CHEQUE' && r.paymentStatus === 'PAID') {
    confirmMessage = `Désinscrire ${r.parent} (chèque déjà encaissé) ? Un email sera envoyé pour notifier l'annulation.`;
  } else if (r.paymentMethod === 'FREE' || r.paymentStatus === 'FREE') {
    confirmMessage = `Désinscrire ${r.parent} de cet événement gratuit ? Un email sera envoyé pour notifier l'annulation.`;
  } else if (r.paymentStatus === 'FAILED') {
    confirmMessage = `Supprimer l'inscription échouée de ${r.parent} ? Un email sera envoyé pour notifier l'annulation.`;
  } else {
    confirmMessage = `Désinscrire ${r.parent} ? Un email sera envoyé pour notifier l'annulation.`;
  }

  if (!confirm(confirmMessage)) return;

  await eventStore.adminCancelRegistration(r.id);
  
  // Message de succès personnalisé
  if (r.paymentMethod === 'STRIPE' && r.paymentStatus === 'PAID') {
    toast.success('Inscription annulée et remboursement effectué (email envoyé)');
  } else {
    toast.success('Inscription annulée (email envoyé)');
  }
  
  await load();
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

function getPaymentMethodLabel(method: string): string {
  const labels = {
    'CHEQUE': 'Chèque',
    'STRIPE': 'Carte bancaire',
    'FREE': 'Gratuit'
  };
  return labels[method as keyof typeof labels] || method;
}

onMounted(load);
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
$shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
  0 2px 4px -1px rgba(0, 0, 0, 0.06);

.event-registrations {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;

  .registrations-header {
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

    .back-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background-color: #f3f4f6;
      color: $text-secondary;
      border: 1px solid $border-color;
      border-radius: 8px;
      font-weight: 500;
      transition: all 0.2s ease;

      svg {
        flex-shrink: 0;
      }

      &:hover {
        background-color: #e5e7eb;
        transform: translateY(-1px);
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
  }

  .error-message {
    padding: 1rem 1.5rem;
    background-color: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 8px;
    color: $danger-color;
    font-weight: 500;
    margin-bottom: 2rem;
  }

  .registrations-table-card {
    background: white;
    border-radius: 12px;
    box-shadow: $shadow-md;
    overflow: hidden;
  }

  .grid-container {
    padding: 1.5rem;
  }

  .table {
    width: 100%;
    border-collapse: collapse;

    th,
    td {
      border: 1px solid $border-color;
      padding: 0.75rem 1rem;
      text-align: center;
      font-size: 0.875rem;
      color: #1f2937 !important;
      background: white;
    }

    thead th {
      background: $secondary-color;
      color: $text-primary;
      font-weight: 600;
    }
  }

  .btn-primary {
    padding: 0.5rem 1rem;
    background: linear-gradient(135deg, $primary-color 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s ease;

    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .no-registrations {
    text-align: center;
    color: $text-secondary;
    margin-top: 2rem;
  }
}

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

// ✅ CORRECTION 4: Styles pour les boutons d'action
.action-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
}

.btn-danger {
  background: #dc2626;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover:not(:disabled) {
    background: #b91c1c;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3);
  }

  &:disabled {
    background: #9ca3af;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
}

// Répartition équilibrée des boutons dans les cellules
.table td {
  vertical-align: middle;
  
  .action-buttons {
    justify-content: center;
    min-width: 200px; // Assurer un espace minimum pour les boutons
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

@media (max-width: 768px) {
  .event-registrations {
    padding: 1rem;

    .registrations-header {
      h3 {
        font-size: 1.5rem;
      }
    }

    .grid-container {
      padding: 1rem;
    }
  }
}
.danger{ background-color:#dc3545; color:white; border:none; padding:0.3rem 0.6rem; border-radius:3px; cursor:pointer; margin-left:0.5rem }
.danger:hover{ background-color:#c82333 }
</style>
