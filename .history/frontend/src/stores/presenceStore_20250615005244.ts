import { defineStore } from 'pinia';
import { useAuthStore } from './auth';
import { useNotificationStore } from './notificationStore';

/* ─────────── Types ─────────── */
interface PresenceRecord {
  id: number;
  childId: number;
  present: boolean;
  child: { firstName: string; lastName: string };
  justification?: {
    justificationDate: string;
    motif: string;
    filePath?: string;
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
}

/* URL racine de l’API Nest */
const API = import.meta.env.VITE_NEST_API_URL ?? '';

/* ─────────── Store ─────────── */
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
    /* ————————— changer la date courante ————————— */
    setDate(date: string) {
      this.date = date;
    },

    /* ————————— récupérer la feuille (création si 404) ————————— */
    async fetchSheet() {
      this.loading = true;
      this.error   = null;
      const auth   = useAuthStore();
      const notify = useNotificationStore();

      try {
        let res = await fetch(`${API}/presences?date=${this.date}`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        });

        /* 404 ⇒ on crée la feuille puis on relance le GET */
        if (res.status === 404) {
          await fetch(`${API}/presences`, {
            method : 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization : `Bearer ${auth.token}`,
            },
            body: JSON.stringify({ date: this.date }),
          });

          res = await fetch(`${API}/presences?date=${this.date}`, {
            headers: { Authorization: `Bearer ${auth.token}` },
          });
        }

        if (!res.ok) {
          throw new Error((await res.text()) || 'Erreur récupération de la feuille');
        }

        const data: PresenceSheet = await res.json();
        this.sheet = data;
        this.presentChildIds = data.records
          .filter((r) => r.present)
          .map((r) => r.childId);
      } catch (err: any) {
        this.error = err.message;
        notify.showNotification(this.error, 'error');
      } finally {
        this.loading = false;
      }
    },

    /* ————————— validation par l’éducateur ————————— */
    async validateSheet() {
      if (!this.sheet) return;
      this.loading = true;
      this.error   = null;
      const auth   = useAuthStore();
      const notify = useNotificationStore();

      try {
        const res = await fetch(
          `${API}/presences/${this.sheet.id}/validate`,
          {
            method : 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization : `Bearer ${auth.token}`,
            },
            body: JSON.stringify({ presentChildIds: this.presentChildIds }),
          },
        );

        if (!res.ok) {
          throw new Error((await res.text()) || 'Erreur lors de la validation');
        }

        this.sheet = (await res.json()) as PresenceSheet;
        notify.showNotification('Appel validé', 'success');
      } catch (err: any) {
        this.error = err.message;
        notify.showNotification(this.error, 'error');
      } finally {
        this.loading = false;
      }
    },

    /* ————————— justification d’une absence ————————— */
    async justifyRecord(
      recordId: number,
      justificationDate: string,
      motif: string,
      file?: File,
    ) {
      if (!this.sheet) return;

      this.loading = true;
      this.error   = null;
      const auth   = useAuthStore();
      const notify = useNotificationStore();

      try {
        const formData = new FormData();
        formData.append('justificationDate', justificationDate);
        formData.append('motif', motif);
        if (file) formData.append('file', file);

        const res = await fetch(
          `${API}/presences/records/${recordId}/justify`,
          {
            method : 'PATCH',
            headers: { Authorization: `Bearer ${auth.token}` },
            body   : formData,
          },
        );

        if (!res.ok) {
          throw new Error((await res.text()) || 'Erreur lors de la justification');
        }

        this.sheet = (await res.json()) as PresenceSheet;
        notify.showNotification('Justification enregistrée', 'success');
      } catch (err: any) {
        this.error = err.message;
        notify.showNotification(this.error, 'error');
      } finally {
        this.loading = false;
      }
    },
  },
});
