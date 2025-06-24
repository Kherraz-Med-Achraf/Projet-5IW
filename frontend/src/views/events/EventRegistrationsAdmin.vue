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
              <td>{{ r.paymentMethod }}</td>
              <td>{{ r.paymentStatus }}</td>
              <td>
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
  const regs = await eventStore.fetchRegistrations(eventId);
  rows.value = regs.map((r: any) => ({
    id: r.id,
    parent: r.parentProfile.user.email,
    children: r.children.map(
      (c: any) => c.child.firstName + " " + c.child.lastName
    ),
    paymentMethod: r.paymentMethod,
    paymentStatus: r.paymentStatus,
  }));
  if (regs.length) title.value = regs[0].event.title;
}

async function markPaid(r: any) {
  await eventStore.validateCheque(r.id);
  toast.success("Paiement enregistré");
  await load();
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
</style>
