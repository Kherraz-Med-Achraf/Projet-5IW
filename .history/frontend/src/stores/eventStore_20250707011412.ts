import { defineStore } from "pinia";
import { useAuthStore } from "./auth";
import { secureApiCall, secureJsonCall, API_BASE_URL } from '@/utils/api'

const API = API_BASE_URL;

export interface Event {
  id: string;
  title: string;
  description?: string;
  date: string;
  startTime: string;
  endTime: string;
  priceCt: number;
  capacity?: number;
  imageUrl?: string;
  isLocked: boolean;
}

export interface RegistrationResult {
  registrationId: string;
  stripeUrl: string | null;
}

export interface MyRegistration {
  registrationId: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  children: string[];
  paymentStatus: string;
}

export const useEventStore = defineStore("eventStore", {
  state: () => ({
    events: [] as Event[],
    myRegistrations: [] as MyRegistration[],
    loading: false,
    error: null as string | null,
  }),
  actions: {
    async fetchEvents() {
      this.loading = true;
      this.error = null;
      try {
        this.events = await secureJsonCall(`${API}/events`);
      } catch (e: any) {
        this.error = e.message;
      } finally {
        this.loading = false;
      }
    },
    async register(
      eventId: string,
      childIds: number[],
      paymentMethod: "CHEQUE" | "STRIPE"
    ): Promise<RegistrationResult | null> {
      this.loading = true;
      this.error = null;
      try {
        return await secureJsonCall(`${API}/events/${eventId}/register`, {
          method: "POST",
          body: JSON.stringify({ childIds, paymentMethod }),
        });
      } catch (e: any) {
        this.error = e.message;
        return null;
      } finally {
        this.loading = false;
      }
    },
    /* Admin: créer un événement */
    async createEvent(payload: FormData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await secureApiCall(`${API}/events`, {
          method: "POST",
          body: payload,
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[EventStore] Erreur création événement:', { status: response.status, errorText });
          
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { message: errorText || 'Erreur inconnue' };
          }
          
          throw new Error(errorData.message || `Erreur HTTP ${response.status}`);
        }
        
        await this.fetchEvents();
      } catch (e: any) {
        this.error = e.message;
        console.error('[EventStore] Erreur dans createEvent:', e);
        throw e; // Re-lancer l'erreur pour que le composant puisse la gérer
      } finally {
        this.loading = false;
      }
    },

    async updateEvent(id: string, payload: FormData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await secureApiCall(`${API}/events/${id}`, {
          method: "PATCH",
          body: payload,
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[EventStore] Erreur mise à jour événement:', { status: response.status, errorText });
          
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { message: errorText || 'Erreur inconnue' };
          }
          
          throw new Error(errorData.message || `Erreur HTTP ${response.status}`);
        }
        
        await this.fetchEvents();
      } catch (e: any) {
        this.error = e.message;
        console.error('[EventStore] Erreur dans updateEvent:', e);
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async deleteEvent(id: string) {
      this.loading = true;
      this.error = null;
      try {
        await secureApiCall(`${API}/events/${id}`, {
          method: "DELETE",
        });
        await this.fetchEvents();
      } catch (e: any) {
        this.error = e.message;
      } finally {
        this.loading = false;
      }
    },

    async fetchMyEvents() {
      this.loading = true;
      this.error = null;
      try {
        this.myRegistrations = await secureJsonCall(`${API}/events/mine`);
      } catch (e: any) {
        this.error = e.message;
      } finally {
        this.loading = false;
      }
    },

    /** Liste des inscriptions pour un événement (admin) */
    async fetchRegistrations(eventId: string) {
      this.loading = true;
      this.error = null;
      try {
        return await secureJsonCall(`${API}/events/${eventId}/registrations`);
      } catch (e: any) {
        this.error = e.message;
        return [];
      } finally {
        this.loading = false;
      }
    },

    /** Valider un paiement chèque */
    async validateCheque(registrationId: string) {
      this.loading = true;
      this.error = null;
      try {
        return await secureJsonCall(`${API}/events/registrations/${registrationId}/payment`, {
          method: "PATCH",
        });
      } catch (e: any) {
        this.error = e.message;
        return null;
      } finally {
        this.loading = false;
      }
    },

    async cancelRegistration(regId: string) {
      this.loading = true;
      this.error = null;
      try {
        return await secureJsonCall(`${API}/events/registrations/${regId}`, {
          method: "DELETE",
        });
      } catch (e: any) {
        this.error = e.message;
        return null;
      } finally {
        this.loading = false;
      }
    },

    /** Annulation d'inscription par l'admin (chèque non reçu) */
    async adminCancelRegistration(regId: string) {
      this.loading = true;
      this.error = null;
      try {
        return await secureJsonCall(`${API}/events/registrations/${regId}/admin`, {
          method: 'DELETE',
        });
      } catch (e: any) {
        this.error = e.message;
        return null;
      } finally {
        this.loading = false;
      }
    },
  },
});
