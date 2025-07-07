import { defineStore } from 'pinia';
import { useAuthStore } from './auth';
import { useNotificationStore } from './notificationStore';
import { secureApiCall, secureJsonCall, API_BASE_URL } from '@/utils/api';

/* ─────────── Types ─────────── */
interface PresenceRecord {
  id: number;
  childId: number;
  present: boolean;
  child: { firstName: string; lastName: string; parent?: { phone: string } };
  justification?: {
    id: number;
    type: 'ABSENCE' | 'LATENESS';
    justificationDate: string;
    motif?: string;
    filePath?: string;
    createdAt: string;
  };
}

interface PresenceSheet {
  id: number;
  date: string;
  staffId?: string;
  validatedAtStaff?: string;
  validatedBySecretary: boolean;
  validatedAtSecretary?: string;
  status: 'PENDING_STAFF' | 'PENDING_SECRETARY' | 'VALIDATED';
  records: PresenceRecord[];
  staff?: {
    staffProfile: {
      firstName: string;
      lastName: string;
    };
  };
}

/* URL racine de l'API Nest */
const API = API_BASE_URL;

export const usePresenceStore = defineStore('presence', {
  state: () => ({
    date: new Date().toISOString().substring(0, 10),
    sheet: null as PresenceSheet | null,
    presentChildIds: [] as number[],
    loading: false,
    error: null as string | null,
  }),

  getters: {
    isStaffPhase: (s) => s.sheet?.status === 'PENDING_STAFF',
    isSecretaryPhase: (s) => s.sheet?.status === 'PENDING_SECRETARY',
    isValidated: (s) => s.sheet?.status === 'VALIDATED',
  },

  actions: {
    /** Change la date courante **/
    setDate(date: string) {
      this.date = date;
    },

    /**
     * Récupère la feuille pour la date sélectionnée.
     * En mode secrétaire on ne crée PAS de nouvelle feuille :
     * si 404 on met sheet à null et on affiche un message d'absence.
     */
    async fetchSheet() {
      this.loading = true;
      this.error = null;
      const auth = useAuthStore();
      const notify = useNotificationStore();

      try {
        try {
          const data: PresenceSheet = await secureJsonCall(`${API}/presences?date=${this.date}`);
          this.sheet = data;
          this.presentChildIds = data.records.filter(r => r.present).map(r => r.childId);
          return;
        } catch (fetchError: any) {
          if (fetchError.message.includes('404')) {
            if (auth.user?.role === 'STAFF') {
              const data: PresenceSheet = await secureJsonCall(`${API}/presences`, {
                method: 'POST',
                body: JSON.stringify({ date: this.date }),
              });
              
              this.sheet = data;
              this.presentChildIds = data.records.filter(r => r.present).map(r => r.childId);
              return;
            } else {
              this.sheet = null;
              return;
            }
          }
          throw fetchError;
        }

      } catch (err: any) {
        this.error = err.message;
        notify.showNotification(this.error, 'error');
        this.sheet = null;
      } finally {
        this.loading = false;
      }
    },

    /** Validation par l'éducateur **/
    async validateSheet() {
      this.loading = true;
      this.error = '';
      
      try {
        if (!this.sheet?.id) {
          throw new Error('Aucune feuille sélectionnée');
        }

        const sheetId = this.sheet.id;
        const response = await secureApiCall(`${API_BASE_URL}/presences/${sheetId}/validate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({})
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Erreur HTTP ${response.status}`);
        }

        const data = await response.json();
        this.sheet = data;
        
      } catch (error: any) {
        this.error = error.message || 'Erreur lors de la validation';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Justification d'une absence ou d'un retard (secrétaire)
     * @param recordId    : ID du record à justifier
     * @param type        : 'ABSENCE' ou 'LATENESS'
     * @param justificationDate : date du justificatif (YYYY-MM-DD)
     * @param motif       : motif (facultatif si LATENESS)
     * @param file        : fichier justificatif facultatif
     */
    async justifyRecord(
      recordId: number,
      type: 'ABSENCE' | 'LATENESS',
      justificationDate: string,
      motif?: string,
      file?: File,
    ) {
      this.loading = true;
      this.error = '';
      
      try {
        const formData = new FormData();
        formData.append('type', type);
        formData.append('justificationDate', justificationDate);
        if (motif) formData.append('motif', motif);
        if (file) formData.append('file', file);

        const response = await secureApiCall(
          `${API_BASE_URL}/presences/records/${recordId}/justify`,
          {
            method: 'PATCH',
            body: formData,
          },
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Erreur HTTP ${response.status}`);
        }

        const data = await response.json() as PresenceSheet;
        this.sheet = data;
        
      } catch (error: any) {
        this.error = error.message || 'Erreur lors de la justification';
        throw error;
      } finally {
        this.loading = false;
      }
    },
  },
});
