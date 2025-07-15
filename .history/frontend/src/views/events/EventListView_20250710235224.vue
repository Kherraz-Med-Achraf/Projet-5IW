<template>
  <main class="profile-container" lang="fr" role="main">
    <!-- Skip links pour navigation clavier -->
    <div class="skip-links">
      <a href="#main-content" class="skip-link">Aller au contenu principal</a>
      <a href="#events-grid" class="skip-link">Aller à la liste des événements</a>
    </div>
    
    <!-- Content -->
    <div class="profile-content" id="main-content">
      <div class="content-grid">
        <!-- En-tête avec PageHeader -->
        <PageHeader 
          title="Événements à venir"
          subtitle="Découvrez et inscrivez-vous aux prochains événements du samedi"
          icon="event"
        />
        
        <!-- Section principale avec événements -->
        <section class="profile-section" id="events-grid" aria-labelledby="events-title">
          <div class="section-header">
            <h2 id="events-title">
              <i class="material-icons" aria-hidden="true">calendar_today</i>
              Événements disponibles
            </h2>
          </div>

          <div class="section-content">
            <!-- Bouton sous le header -->
            <div class="content-actions">
              <router-link to="/events/mine" class="edit-btn edit-btn-blue">
                <i class="material-icons" aria-hidden="true">assignment</i>
                Mes inscriptions
              </router-link>
            </div>

            <!-- Info note -->
            <div class="info-note" role="note">
              <i class="material-icons" aria-hidden="true">info</i>
              <span>Cliquez sur un événement pour vous inscrire avec vos enfants</span>
            </div>

            <!-- État de chargement général -->
            <div v-if="eventStore.loading" class="loading-indicator">
              <i class="material-icons spinning">hourglass_empty</i>
              <span>Chargement des événements...</span>
            </div>

            <!-- ✅ AJOUT: Chargement des images -->
            <div v-else-if="!imagesLoaded && upcomingEvents.length > 0" class="loading-indicator">
              <i class="material-icons spinning">image</i>
              <span>Chargement des images... ({{ imageLoadCount }}/{{ totalImages }})</span>
            </div>

            <!-- Message d'erreur -->
            <div v-if="eventStore.error" class="error-message">
              <i class="material-icons">error</i>
              {{ eventStore.error }}
            </div>

            <!-- Grille d'événements - Affichée seulement quand les images sont prêtes -->
            <div 
              v-if="!eventStore.loading && !eventStore.error && imagesLoaded" 
              class="events-grid"
              role="grid"
              aria-label="Liste des événements disponibles"
            >
              <!-- État vide -->
              <div v-if="upcomingEvents.length === 0" class="empty-state">
                <i class="material-icons">event_busy</i>
                <p>Aucun événement à venir</p>
                <small>Les prochains événements seront bientôt annoncés</small>
              </div>

              <!-- Cartes d'événements -->
              <button 
                v-for="ev in upcomingEvents" 
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
                  <img 
                    v-if="ev.imageUrl" 
                    :src="getImageUrl(ev.imageUrl)" 
                    :alt="ev.title"
                    @error="handleImageError($event, ev)"
                    @load="handleImageLoad($event, ev)"
                  />
                  <div v-else class="image-placeholder">
                    <i class="material-icons">image</i>
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
                        <i class="material-icons">event</i>
                        <span>{{ formatDate(ev.date) }}</span>
                      </div>

                      <div class="detail-item">
                        <i class="material-icons">schedule</i>
                        <span>{{ formatTime(ev.startTime) }} - {{ formatTime(ev.endTime) }}</span>
                      </div>

                      <div class="detail-item">
                        <i class="material-icons">euro</i>
                        <span>{{ formatPrice(ev.priceCt) }}</span>
                      </div>

                      <div v-if="ev.capacity" class="detail-item">
                        <i class="material-icons">people</i>
                        <span>{{ getCapacityText(ev) }}</span>
                      </div>
                    </div>

                    <div
                      v-if="registeredChildren(ev).length"
                      class="registered-children"
                    >
                      <i class="material-icons">check_circle</i>
                      <span>Déjà inscrit : {{ registeredChildren(ev).join(", ") }}</span>
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
                </div>
              </button>
            </div>
          </div>
        </section>
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
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick, computed } from "vue";
import { useEventStore } from "@/stores/eventStore";
import { useAuthStore } from "@/stores/auth";
import { useToast } from "vue-toastification";
import { useRouter } from "vue-router";
import { API_BASE_URL, secureJsonCall } from "@/utils/api";
import { useFocusManagement } from "@/composables/useFocusManagement";
import PageHeader from "@/components/PageHeader.vue";

const eventStore = useEventStore();
const auth = useAuthStore();
const toast = useToast();
const router = useRouter();
const { trapFocus, setInitialFocus, savePreviousFocus, restorePreviousFocus } = useFocusManagement();

const selected = ref<any | null>(null);
const childIds = ref<number[]>([]);
const paymentMethod = ref<"CHEQUE" | "STRIPE">("CHEQUE");
const children = ref<any[]>([]);

// ✅ AJOUT: Gestion du chargement des images
const imagesLoaded = ref(false);
const imageLoadCount = ref(0);
const totalImages = ref(0);
const imageErrors = ref(new Set<string>());

// Propriété calculée pour filtrer les événements passés
const upcomingEvents = computed(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return eventStore.events.filter(event => {
    const eventDate = new Date(event.date);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate >= today;
  });
});

// Fonction utilitaire pour annoncer aux lecteurs d'écran
function announceToScreenReader(message: string) {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  document.body.appendChild(announcement);
  setTimeout(() => document.body.removeChild(announcement), 1000);
}

// Charger les enfants pour les parents
const loadChildren = async () => {
  if (auth.user?.role === 'PARENT') {
    try {
      const response = await secureJsonCall(`${API_BASE_URL}/children`);
      children.value = response;
    } catch (error) {
      console.error('Erreur lors du chargement des enfants:', error);
    }
  }
};

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
  // ✅ CORRIGÉ : Utiliser capacityLeft fourni par le backend
  return event.capacityLeft ?? event.capacity;
}

function getCapacityText(event: any): string {
  if (!event.capacity) return "Nombre de places illimité";
  const left = getCapacityLeft(event);
  if (left === 0) return "Complet";
  return `${left} places restantes`;
}

// ✅ NOUVEAU : Fonction pour traduire les statuts de paiement
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

// ✅ NOUVEAU : Fonction pour traduire les méthodes de paiement
function getPaymentMethodLabel(method: string): string {
  const labels = {
    'CHEQUE': 'Chèque',
    'STRIPE': 'Carte bancaire',
    'FREE': 'Gratuit'
  };
  return labels[method as keyof typeof labels] || method;
}

// ✅ NOUVEAU : Gestion des images avec fallback
function getImageUrl(imageUrl: string): string {
  if (!imageUrl) return '';
  
  // Si l'URL est déjà complète, la retourner telle quelle
  if (imageUrl.startsWith('http')) {
    return imageUrl;
  }
  
  // Sinon, construire l'URL complète
  return `${API_BASE_URL}${imageUrl}`;
}

function handleImageError(event: Event, eventData: any): void {
  const img = event.target as HTMLImageElement;
  console.warn(`🖼️ Erreur de chargement d'image pour l'événement "${eventData.title}":`, eventData.imageUrl);
  
  // ✅ AJOUT: Marquer cette image comme en erreur
  imageErrors.value.add(eventData.id);
  imageLoadCount.value++;
  
  // Masquer l'image et afficher le placeholder
  img.style.display = 'none';
  const placeholder = img.parentElement?.querySelector('.image-placeholder');
  if (placeholder) {
    (placeholder as HTMLElement).style.display = 'flex';
  }
  
  // ✅ AJOUT: Vérifier si toutes les images sont traitées
  checkAllImagesLoaded();
}

function handleImageLoad(event: Event, eventData: any): void {
  const img = event.target as HTMLImageElement;
  console.log(`✅ Image chargée avec succès pour l'événement "${eventData.title}"`);
  
  // ✅ AJOUT: Compter cette image comme chargée
  imageLoadCount.value++;
  
  // S'assurer que le placeholder est masqué
  const placeholder = img.parentElement?.querySelector('.image-placeholder');
  if (placeholder) {
    (placeholder as HTMLElement).style.display = 'none';
  }
  
  // ✅ AJOUT: Vérifier si toutes les images sont traitées
  checkAllImagesLoaded();
}

// ✅ NOUVELLE FONCTION: Vérifier si toutes les images sont chargées
function checkAllImagesLoaded(): void {
  if (imageLoadCount.value >= totalImages.value) {
    imagesLoaded.value = true;
    console.log(`🎯 Toutes les images sont traitées: ${imageLoadCount.value}/${totalImages.value} (${imageErrors.value.size} erreurs)`);
  }
}

// ✅ NOUVELLE FONCTION: Initialiser le chargement des images
function initializeImageLoading(): void {
  imagesLoaded.value = false;
  imageLoadCount.value = 0;
  imageErrors.value.clear();
  
  // Compter le nombre total d'images à charger
  totalImages.value = upcomingEvents.value.filter(event => event.imageUrl).length;
  
  console.log(`🖼️ Initialisation du chargement: ${totalImages.value} images à charger`);
  
  // Si aucune image à charger, marquer comme terminé immédiatement
  if (totalImages.value === 0) {
    imagesLoaded.value = true;
    console.log('🎯 Aucune image à charger, affichage immédiat');
  }
}

function isRegistrationDisabled(event: any): boolean {
  // Vérifier si l'événement est passé
  const eventDate = new Date(event.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Réinitialiser l'heure pour comparer seulement les dates
  
  const isPastEvent = eventDate < today;
  
  return isPastEvent || registeredChildren(event).length > 0 || getCapacityLeft(event) === 0;
}

function openModal(ev: any): void {
  if (isRegistrationDisabled(ev)) return;
  
  savePreviousFocus();
  selected.value = ev;
  childIds.value = [];
  paymentMethod.value = "CHEQUE";
}

function closeModal(): void {
  selected.value = null;
  restorePreviousFocus();
}

async function register(): Promise<void> {
  if (!childIds.value.length) {
    const errorMessage = "Sélectionnez au moins un enfant";
    toast.error(errorMessage);
    announceToScreenReader(errorMessage);
    return;
  }

  announceToScreenReader("Inscription en cours...");
  
  try {
    const res = await eventStore.register(
      selected.value.id,
      childIds.value,
      paymentMethod.value
    );
    if (res) {
      closeModal();
      if (res.stripeUrl) {
        announceToScreenReader("Redirection vers le paiement sécurisé");
        window.location.href = res.stripeUrl;
      } else {
        const successMessage = "Inscription enregistrée avec succès";
        toast.success(successMessage);
        announceToScreenReader(successMessage);
      }
      router.push("/events/mine");
      // Recharger les données
      await eventStore.fetchMyEvents();
    }
  } catch (error) {
    const errorMessage = "Erreur lors de l'inscription";
    toast.error(errorMessage);
    announceToScreenReader(errorMessage);
  }
}

function registeredChildren(ev: any): string[] {
  const reg = eventStore.myRegistrations.find((r) => r.eventId === ev.id);
  return reg ? reg.children : [];
}

// Gestion du focus dans les modals
let focusTrapCleanup: (() => void) | null = null;

watch(selected, async (newValue) => {
  if (newValue) {
    // Modal ouverte - attendre le rendu et configurer le focus
    await nextTick();
    const modalElement = document.querySelector('.modal .modal-content') as HTMLElement;
    if (modalElement) {
      focusTrapCleanup = trapFocus(modalElement);
      setInitialFocus(modalElement);
    }
  } else {
    // Modal fermée - nettoyer le trap focus
    if (focusTrapCleanup) {
      focusTrapCleanup();
      focusTrapCleanup = null;
    }
  }
});

onMounted(async () => {
  await Promise.all([
    eventStore.fetchEvents(),
    eventStore.fetchMyEvents(),
    loadChildren(),
  ]);
  initializeImageLoading(); // Initialiser le chargement des images au montage
});
</script>

<style scoped lang="scss">
@import '@/assets/styles/profile-common.scss';

// Styles spécifiques pour les événements
.content-actions {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.events-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 2rem;

  .event-card {
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    transition: all 0.3s ease;
    border: none;
    padding: 0;
    width: 100%;
    text-align: left;
    cursor: pointer;

    &:hover {
      transform: translateY(-5px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    }

    &:focus {
      outline: 3px solid $primary-color;
      outline-offset: 2px;
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;

      &:focus {
        outline-color: #9ca3af;
      }
    }

    .event-image {
      width: 100%;
      height: 200px;
      overflow: hidden;
      position: relative;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .image-placeholder {
        width: 100%;
        height: 100%;
        background: linear-gradient(45deg, #f8fafc, #e2e8f0);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #9ca3af;
        position: absolute;
        top: 0;
        left: 0;

        .material-icons {
          font-size: 3rem;
          color: #9ca3af;
        }
      }
    }

    .event-content {
      padding: 1.5rem;

      .event-info {
        .event-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 0.75rem;
        }

        .event-description {
          color: #6b7280;
          margin-bottom: 1.5rem;
          line-height: 1.6;
        }

        .event-details {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1.5rem;

          .detail-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            color: #6b7280;
            font-size: 0.875rem;

            .material-icons {
              color: $primary-color;
              font-size: 1.2rem;
            }
          }
        }

        .registered-children {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem;
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: 8px;
          color: #0369a1;
          font-size: 0.875rem;

          .material-icons {
            color: #0369a1;
            font-size: 1.2rem;
          }
        }
      }
    }
  }
}

// Styles pour la modal
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

      h2 {
        font-size: 1.25rem;
        font-weight: 600;
        margin: 0;
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
      max-height: 60vh;
      overflow-y: auto;

      .event-summary {
        margin-bottom: 2rem;
        padding: 1rem;
        background: #f8fafc;
        border-radius: 8px;

        h3 {
          margin: 0 0 0.5rem 0;
          color: #1f2937;
          font-size: 1.125rem;
          font-weight: 600;
        }

        .summary-details {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          font-size: 0.875rem;
          color: #6b7280;

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
          font-weight: 500;
          color: #1f2937;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
        }

        .child-selection {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;

          .child-option {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem;
            background: #f8fafc;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
            transition: all 0.2s ease;

            &:hover {
              background: #f1f5f9;
            }

            input[type="checkbox"] {
              width: 1.25rem;
              height: 1.25rem;
              accent-color: $primary-color;
              cursor: pointer;
            }

            label {
              flex: 1;
              cursor: pointer;
              margin: 0;
              font-weight: 500;
              color: #1f2937;
            }
          }
        }

        .children-select {
          width: 100%;
          min-width: 350px;
          min-height: 120px;
          padding: 0.75rem;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: #f8fafc;
          font-size: 0.875rem;
          resize: vertical;
          outline: none;
          transition: all 0.2s ease;
          
          &:focus {
            border-color: $primary-color;
            box-shadow: 0 0 0 3px rgba(68, 68, 172, 0.1);
          }

          option {
            padding: 0.5rem;
            background: white;
            color: #1f2937;
            font-weight: 500;
            
            &:checked {
              background: $primary-color;
              color: white;
            }
          }
        }

        .payment-options {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;

          .payment-option {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 1rem;
            background: #f8fafc;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
            transition: all 0.2s ease;
            cursor: pointer;

            &:hover {
              background: #f1f5f9;
            }

            input[type="radio"] {
              width: 1.25rem;
              height: 1.25rem;
              accent-color: $primary-color;
              cursor: pointer;
            }

            .payment-details {
              flex: 1;

              .payment-label {
                font-weight: 500;
                color: #1f2937;
                margin-bottom: 0.25rem;
              }

              .payment-description {
                color: #6b7280;
                font-size: 0.75rem;
              }
            }
          }
        }
      }

      .total-summary {
        margin-top: 1.5rem;
        padding: 1rem;
        background: #f8fafc;
        border-radius: 8px;
        border-left: 4px solid $primary-color;

        .total-line {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: 600;
          color: #1f2937;
          font-size: 1.125rem;
        }
      }
    }

    .modal-actions {
      padding: 1.5rem;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      background: #f8fafc;

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
    color: #1f2937;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
  }
}

// Responsive design
@media (max-width: 768px) {
  .events-grid {
    grid-template-columns: 1fr;
    gap: 1rem;

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
