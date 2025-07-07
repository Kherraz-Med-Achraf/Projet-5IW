<template>
  <div class="event-list">
    <div class="event-header">
      <h1>Événements à venir</h1>
      <p class="subtitle">
        Découvrez et inscrivez-vous aux prochains événements du samedi
      </p>
      <router-link to="/events/mine" class="btn-primary my-events-link">
        Mes inscriptions
      </router-link>
    </div>

    <div v-if="eventStore.loading" class="loading">
      <div class="loading-spinner"></div>
      <p>Chargement des événements...</p>
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

    <div 
      v-if="!eventStore.loading && !eventStore.error" 
      class="events-grid"
      role="grid"
      aria-label="Liste des événements disponibles"
    >
      <div v-if="eventStore.events.length === 0" class="no-events">
        <svg
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          aria-hidden="true"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <h3>Aucun événement à venir</h3>
        <p>Les prochains événements seront bientôt annoncés</p>
      </div>

      <button 
        v-for="ev in eventStore.events" 
        :key="ev.id" 
        class="event-card"
        role="gridcell"
        @click="openModal(ev)"
        @keydown.enter="openModal(ev)"
        @keydown.space.prevent="openModal(ev)"
        :aria-label="`Ouvrir les détails de l'événement ${ev.title} prévu le ${formatDate(ev.date)}`"
        :disabled="isRegistrationDisabled(ev)"
        :aria-describedby="`event-status-${ev.id}`"
      >
        <div class="event-image">
          <img v-if="ev.imageUrl" :src="API + ev.imageUrl" :alt="ev.title" />
          <div v-else class="image-placeholder">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
          </div>
        </div>

        <div class="event-content">
          <div class="event-info">
            <h3 class="event-title">{{ ev.title }}</h3>
            <p v-if="ev.description" class="event-description">
              {{ ev.description }}
            </p>

            <div class="event-details">
              <div class="detail-item">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span>{{ formatDate(ev.date) }}</span>
              </div>

              <div class="detail-item">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12,6 12,12 16,14" />
                </svg>
                <span
                  >{{ formatTime(ev.startTime) }} -
                  {{ formatTime(ev.endTime) }}</span
                >
              </div>

              <div class="detail-item">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                <span>{{ formatPrice(ev.priceCt) }}</span>
              </div>

              <div v-if="ev.capacity" class="detail-item">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span>{{ getCapacityText(ev) }}</span>
              </div>
            </div>

            <div
              v-if="registeredChildren(ev).length"
              class="registered-children"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22,4 12,14.01 9,11.01" />
              </svg>
              <span
                >Déjà inscrit : {{ registeredChildren(ev).join(", ") }}</span
              >
            </div>
          </div>

          <!-- Informations de statut pour les lecteurs d'écran -->
          <div :id="`event-status-${ev.id}`" class="sr-only">
            <span v-if="registeredChildren(ev).length">
              Vous êtes déjà inscrit avec {{ registeredChildren(ev).join(", ") }}
            </span>
            <span v-else-if="getCapacityLeft(ev) === 0">
              Événement complet, inscription non disponible
            </span>
            <span v-else>
              Événement disponible, {{ getCapacityText(ev) }}
            </span>
          </div>
        </button>
      </div>
    </div>

    <!-- Modal inscription -->
    <div 
      v-if="selected" 
      class="modal" 
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
      @click.self="closeModal"
      @keydown.esc="closeModal"
    >
      <div class="modal-content">
        <div class="modal-header">
          <h2 id="modal-title">Inscription à l'événement</h2>
          <button 
            class="close-btn" 
            @click="closeModal"
            aria-label="Fermer la modal d'inscription"
          >×</button>
        </div>

        <div class="modal-body">
          <div class="event-summary" id="modal-description">
            <h3>{{ selected.title }}</h3>
            <div class="summary-details">
              <span>{{ formatDate(selected.date) }}</span>
              <span
                >{{ formatTime(selected.startTime) }} -
                {{ formatTime(selected.endTime) }}</span
              >
              <span>{{ formatPrice(selected.priceCt) }}</span>
            </div>
          </div>

          <div class="form-group">
            <label for="children-select">Enfants à inscrire :</label>
            <select 
              id="children-select"
              multiple 
              v-model="childIds" 
              class="children-select"
              required
              aria-describedby="children-help children-error"
              :aria-invalid="children.length === 0 ? 'true' : 'false'"
            >
              <option v-for="c in children" :key="c.id" :value="c.id">
                {{ c.firstName }} {{ c.lastName }}
              </option>
            </select>
            <div id="children-help" class="form-help">
              Utilisez Ctrl+clic pour sélectionner plusieurs enfants
            </div>
            <div 
              v-if="children.length === 0" 
              id="children-error"
              class="no-children"
              role="alert"
              aria-live="polite"
            >
              Aucun enfant trouvé. Veuillez d'abord ajouter un enfant à votre profil.
            </div>
          </div>

          <div class="form-group">
            <fieldset>
              <legend>Mode de paiement :</legend>
              <div class="payment-options" role="radiogroup" aria-describedby="payment-help">
                <label class="payment-option">
                  <input 
                    type="radio" 
                    name="payment-method"
                    value="CHEQUE" 
                    v-model="paymentMethod"
                    aria-describedby="cheque-description"
                  />
                  <span class="radio-custom" aria-hidden="true"></span>
                  <div class="payment-info">
                    <span class="payment-name">Chèque</span>
                    <small id="cheque-description">Paiement par chèque à remettre sur place</small>
                  </div>
                </label>

                <label v-if="selected.priceCt > 0" class="payment-option">
                  <input 
                    type="radio" 
                    name="payment-method"
                    value="STRIPE" 
                    v-model="paymentMethod"
                    aria-describedby="stripe-description"
                  />
                  <span class="radio-custom" aria-hidden="true"></span>
                  <div class="payment-info">
                    <span class="payment-name">Carte bancaire</span>
                    <small id="stripe-description">Paiement sécurisé en ligne</small>
                  </div>
                </label>
              </div>
              <div id="payment-help" class="form-help">
                Choisissez votre mode de paiement préféré
              </div>
            </fieldset>
          </div>

          <div
            v-if="childIds.length && selected.priceCt > 0"
            class="total-summary"
          >
            <div class="total-line">
              <span
                >{{ childIds.length }} enfant{{
                  childIds.length > 1 ? "s" : ""
                }}</span
              >
              <span
                >{{
                  ((selected.priceCt * childIds.length) / 100).toFixed(2)
                }}
                €</span
              >
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button 
            class="btn-secondary" 
            @click="closeModal"
            aria-label="Annuler l'inscription et fermer la modal"
          >
            Annuler
          </button>
          <button
            class="btn-primary"
            @click="register"
            :disabled="!childIds.length || eventStore.loading"
            :aria-label="eventStore.loading 
              ? 'Inscription en cours, veuillez patienter' 
              : 'Confirmer l\'inscription pour les enfants sélectionnés'"
            :aria-describedby="register-help"
          >
            {{
              eventStore.loading ? "Inscription..." : "Confirmer l'inscription"
            }}
          </button>
          <div id="register-help" class="sr-only">
            <span v-if="!childIds.length">
              Veuillez sélectionner au moins un enfant pour continuer
            </span>
            <span v-else-if="paymentMethod === 'STRIPE'">
              Vous serez redirigé vers le paiement sécurisé
            </span>
            <span v-else>
              Un email de confirmation sera envoyé
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useEventStore } from "@/stores/eventStore";
import { useToast } from "vue-toastification";
import { useRouter } from "vue-router";

const eventStore = useEventStore();
const toast = useToast();
const API = import.meta.env.VITE_NEST_API_URL ?? "";
const router = useRouter();

const selected = ref<any | null>(null);
const childIds = ref<number[]>([]);
const paymentMethod = ref<"CHEQUE" | "STRIPE">("CHEQUE");
const children = ref<any[]>([]);

async function fetchChildren(): Promise<void> {
  try {
    const { secureJsonCall } = await import('@/utils/api');
    children.value = await secureJsonCall('/children');
  } catch (error) {
    console.error("Erreur lors du chargement des enfants:", error);
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
  return timeString.substring(11, 16);
}

function formatPrice(priceCt: number): string {
  return priceCt === 0
    ? "Gratuit"
    : `${(priceCt / 100).toFixed(2)} € par enfant`;
}

function getCapacityLeft(event: any): number {
  if (!event.capacity) return Infinity;
  // Ici vous devrez implémenter la logique pour calculer les places restantes
  // En fonction de votre backend et de la structure des données
  return event.capacity || 0;
}

function getCapacityText(event: any): string {
  if (!event.capacity) return "Nombre de places illimité";
  const left = getCapacityLeft(event);
  if (left === 0) return "Complet";
  return `${left} places restantes`;
}

function isRegistrationDisabled(event: any): boolean {
  return registeredChildren(event).length > 0 || getCapacityLeft(event) === 0;
}

function openModal(ev: any): void {
  selected.value = ev;
  childIds.value = [];
  paymentMethod.value = "CHEQUE";
}

function closeModal(): void {
  selected.value = null;
}

async function register(): Promise<void> {
  if (!childIds.value.length) {
    toast.error("Sélectionnez au moins un enfant");
    return;
  }

  try {
    const res = await eventStore.register(
      selected.value.id,
      childIds.value,
      paymentMethod.value
    );
    if (res) {
      closeModal();
      if (res.stripeUrl) {
        window.location.href = res.stripeUrl;
      } else {
        toast.success("Inscription enregistrée avec succès");
      }
      router.push("/events/mine");
      // Recharger les données
      await eventStore.fetchMyEvents();
    }
  } catch (error) {
    toast.error("Erreur lors de l'inscription");
  }
}

function registeredChildren(ev: any): string[] {
  const reg = eventStore.myRegistrations.find((r) => r.eventId === ev.id);
  return reg ? reg.children : [];
}

onMounted(async () => {
  await Promise.all([
    eventStore.fetchEvents(),
    eventStore.fetchMyEvents(),
    fetchChildren(),
  ]);
});
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

.event-list {
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

    .my-events-link {
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

  .events-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem;

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }
  }

  .no-events {
    grid-column: 1 / -1;
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

  .event-card {
    background: white;
    border-radius: 16px;
    box-shadow: $shadow-md;
    overflow: hidden;
    transition: all 0.3s ease;
    border: 1px solid $border-color;

    &:hover {
      transform: translateY(-4px);
      box-shadow: $shadow-lg;
    }

    .event-image {
      height: 200px;
      overflow: hidden;
      position: relative;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.3s ease;
      }

      &:hover img {
        transform: scale(1.05);
      }

      .image-placeholder {
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        color: $text-muted;
      }
    }

    .event-content {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;

      .event-info {
        flex: 1;

        .event-title {
          margin: 0 0 0.5rem 0;
          color: $text-primary;
          font-size: 1.25rem;
          font-weight: 600;
          line-height: 1.4;
        }

        .event-description {
          margin: 0 0 1rem 0;
          color: $text-secondary;
          font-size: 0.875rem;
          line-height: 1.5;
        }

        .event-details {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 1rem;

          .detail-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            color: $text-secondary;
            font-size: 0.875rem;

            svg {
              flex-shrink: 0;
              color: $primary-color;
            }
          }
        }

        .registered-children {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem;
          background-color: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 8px;
          color: #059669;
          font-size: 0.875rem;
          font-weight: 500;

          svg {
            flex-shrink: 0;
          }
        }
      }

      .event-actions {
        .btn-register {
          width: 100%;
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, $primary-color 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 4px rgba(102, 126, 234, 0.2);

          &:hover:not(.disabled) {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
          }

          &.disabled {
            background: #e5e7eb;
            color: $text-muted;
            cursor: not-allowed;
            box-shadow: none;
          }
        }
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
  padding: 1rem;

  .modal-content {
    background: white;
    border-radius: 16px;
    width: 100%;
    max-width: 600px;
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

      h2 {
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

    .modal-body {
      padding: 1.5rem;

      .event-summary {
        margin-bottom: 2rem;
        padding: 1rem;
        background: $secondary-color;
        border-radius: 8px;

        h3 {
          margin: 0 0 0.5rem 0;
          color: $text-primary;
          font-size: 1.125rem;
          font-weight: 600;
        }

        .summary-details {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          font-size: 0.875rem;
          color: $text-secondary;

          span {
            display: flex;
            align-items: center;
            gap: 0.25rem;
          }
        }
      }

      .form-group {
        margin-bottom: 1.5rem;

        label {
          display: block;
          font-weight: 600;
          color: $text-primary;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
        }

        .children-select {
          width: 100%;
          min-height: 120px;
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

          option {
            padding: 0.5rem;
          }
        }

        .no-children {
          color: $warning-color;
          font-size: 0.75rem;
          margin-top: 0.5rem;
          display: block;
        }

        .payment-options {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;

          .payment-option {
            display: flex;
            align-items: flex-start;
            gap: 0.75rem;
            padding: 1rem;
            border: 2px solid $border-color;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s ease;

            &:hover {
              border-color: $primary-color;
              background-color: rgba(102, 126, 234, 0.05);
            }

            input[type="radio"] {
              display: none;

              &:checked + .radio-custom {
                background-color: $primary-color;
                border-color: $primary-color;

                &::after {
                  opacity: 1;
                }
              }
            }

            .radio-custom {
              width: 20px;
              height: 20px;
              border: 2px solid $border-color;
              border-radius: 50%;
              position: relative;
              flex-shrink: 0;
              transition: all 0.2s ease;

              &::after {
                content: "";
                position: absolute;
                top: 50%;
                left: 50%;
                width: 8px;
                height: 8px;
                background-color: white;
                border-radius: 50%;
                transform: translate(-50%, -50%);
                opacity: 0;
                transition: opacity 0.2s ease;
              }
            }

            .payment-info {
              flex: 1;

              .payment-name {
                display: block;
                font-weight: 600;
                color: $text-primary;
                margin-bottom: 0.25rem;
              }

              small {
                color: $text-secondary;
                font-size: 0.75rem;
              }
            }
          }
        }
      }

      .total-summary {
        margin-top: 1.5rem;
        padding: 1rem;
        background: $secondary-color;
        border-radius: 8px;
        border-left: 4px solid $primary-color;

        .total-line {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: 600;
          color: $text-primary;
          font-size: 1.125rem;
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

// Utilitaires d'accessibilité
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.form-help {
  font-size: 0.75rem;
  color: $text-secondary;
  margin-top: 0.25rem;
}

// Amélioration des cartes d'événements pour l'accessibilité
.event-card {
  background: none;
  border: none;
  padding: 0;
  width: 100%;
  text-align: left;
  cursor: pointer;

  &:focus {
    outline: 3px solid $primary-color;
    outline-offset: 2px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;

    &:focus {
      outline-color: $text-muted;
    }
  }
}

// Amélioration des fieldsets
fieldset {
  border: none;
  padding: 0;
  margin: 0;

  legend {
    font-weight: 600;
    color: $text-primary;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
  }
}

// Responsive design
@media (max-width: 768px) {
  .event-list {
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

    .event-card {
      .event-content {
        padding: 1rem;

        .event-details {
          .detail-item {
            font-size: 0.8rem;
          }
        }
      }
    }
  }

  .modal {
    .modal-content {
      margin: 1rem;

      .modal-body {
        padding: 1rem;

        .form-group {
          .payment-options {
            .payment-option {
              padding: 0.75rem;
            }
          }
        }
      }

      .modal-actions {
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
