import { defineStore } from 'pinia';
import { useAuthStore } from './auth';
import { useNotificationStore } from './notificationStore';

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
const API = import.meta.env.VITE_NEST_API_URL ?? '';

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
        const res = await fetch(`${API}/presences?date=${this.date}`, {
          headers: { Authorization: `Bearer ${auth.token ?? ''}` },
        });

        if (res.status === 404) {
          // Pas de feuille pour cette date
          // Si l'utilisateur est STAFF, on crée automatiquement la feuille
          if (auth.user?.role === 'STAFF') {
            console.log('Aucune feuille trouvée, création automatique pour STAFF...');
            const createRes = await fetch(`${API}/presences`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                Authorization: `Bearer ${auth.token ?? ''}` 
              },
              body: JSON.stringify({ date: this.date }),
            });
            
            if (!createRes.ok) {
              throw new Error(await createRes.text() || 'Erreur création de la feuille');
            }
            
            const data: PresenceSheet = await createRes.json();
            this.sheet = data;
            this.presentChildIds = data.records.filter(r => r.present).map(r => r.childId);
            return;
          } else {
            // Pour les autres rôles, pas de feuille = pas d'affichage
            this.sheet = null;
            return;
          }
        }

        if (!res.ok) {
          throw new Error(await res.text() || 'Erreur récupération de la feuille');
        }

        const data: PresenceSheet = await res.json();
        this.sheet = data;
        this.presentChildIds = data.records.filter(r => r.present).map(r => r.childId);

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
      if (!this.sheet) return;
      this.loading = true;
      this.error = null;
      const auth = useAuthStore();
      const notify = useNotificationStore();

      try {
        const res = await fetch(
          `${API}/presences/${this.sheet.id}/validate`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${auth.token || ''}`,
            },
            body: JSON.stringify({ presentChildIds: this.presentChildIds }),
          },
        );

        if (!res.ok) throw new Error(await res.text() || 'Erreur lors de la validation');
        this.sheet = await res.json() as PresenceSheet;
        notify.showNotification('Appel validé', 'success');
      } catch (err: any) {
        this.error = err.message;
        notify.showNotification(this.error, 'error');
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
      if (!this.sheet) return;
      this.loading = true;
      this.error = null;
      const auth = useAuthStore();
      const notify = useNotificationStore();

      console.log('🚀 Début justification record:', {
        recordId,
        type,
        justificationDate,
        motif,
        hasFile: !!file,
        fileName: file?.name,
        fileSize: file?.size,
        token: auth.token ? 'présent' : 'absent'
      });

      try {
        const formData = new FormData();
        formData.append('type', type);
        formData.append('justificationDate', justificationDate);
        if (motif) formData.append('motif', motif);
        if (file) formData.append('file', file);

        console.log('📤 FormData préparée:', {
          entries: Array.from(formData.entries()).map(([key, value]) => [
            key, 
            value instanceof File ? `File: ${value.name} (${value.size} bytes)` : value
          ])
        });

        const res = await fetch(
          `${API}/presences/records/${recordId}/justify`,
          {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${auth.token || ''}` },
            body: formData,
          },
        );

        console.log('📡 Réponse API:', {
          status: res.status,
          statusText: res.statusText,
          ok: res.ok,
          headers: Object.fromEntries(res.headers.entries())
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error('❌ Erreur API détaillée:', {
            status: res.status,
            statusText: res.statusText,
            errorText,
            url: res.url
          });
          throw new Error(errorText || 'Erreur lors de la justification');
        }

        this.sheet = await res.json() as PresenceSheet;
        console.log('✅ Justification réussie, sheet mise à jour');
      } catch (err: any) {
        console.error('💥 Erreur complète:', {
          message: err.message,
          stack: err.stack,
          recordId,
          type
        });
        this.error = err.message;
        throw err; // Re-throw pour que la modal puisse aussi traiter l'erreur
      } finally {
        this.loading = false;
        console.log('🏁 Fin justification record');
      }
    },
  },
});
