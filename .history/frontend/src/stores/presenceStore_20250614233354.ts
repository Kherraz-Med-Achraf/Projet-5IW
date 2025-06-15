import { defineStore } from 'pinia';
import { useAuthStore } from './authStore';
import { useNotificationStore } from './notificationStore';

interface PresenceRecord {
  id: number;
  childId: number;
  present: boolean;
  child: { firstName: string; lastName: string };
  justification?: { justificationDate: string; motif: string; filePath?: string };
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

export const usePresenceStore = defineStore('presence', {
  state: () => ({
    date: new Date().toISOString().substr(0, 10),
    sheet: null as PresenceSheet | null,
    presentChildIds: [] as number[],
    loading: false,
    error: null as string | null,
  }),
  getters: {
    isStaffPhase: (state) => state.sheet?.status === 'PENDING_STAFF',
    isSecretaryPhase: (state) => state.sheet?.status === 'PENDING_SECRETARY',
    isValidated: (state) => state.sheet?.status === 'VALIDATED',
  },
  actions: {
    setDate(date: string) {
      this.date = date;
    },

    async fetchSheet() {
      this.loading = true;
      this.error = null;
      const auth = useAuthStore();
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/presences?date=${this.date}`,
          {
            headers: {
              Authorization: `Bearer ${auth.token}`,
            },
          }
        );
        if (!res.ok) throw new Error('Erreur récupération de la feuille');
        const data: PresenceSheet = await res.json();
        this.sheet = data;
        // init presentChildIds for staff
        this.presentChildIds = data.records
          .filter((r) => r.present)
          .map((r) => r.childId);
      } catch (err: any) {
        this.error = err.message;
        useNotificationStore().showNotification(this.error, 'error');
      } finally {
        this.loading = false;
      }
    },

    async validateSheet() {
      if (!this.sheet) return;
      this.loading = true;
      this.error = null;
      const auth = useAuthStore();
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/presences/${this.sheet.id}/validate`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${auth.token}`,
            },
            body: JSON.stringify({
              presentChildIds: this.presentChildIds,
              staffId: auth.user?.id,
            }),
          }
        );
        if (!res.ok) throw new Error('Erreur lors de la validation');
        const updated: PresenceSheet = await res.json();
        this.sheet = updated;
        useNotificationStore().showNotification('Appel validé', 'success');
      } catch (err: any) {
        this.error = err.message;
        useNotificationStore().showNotification(this.error, 'error');
      } finally {
        this.loading = false;
      }
    },

    async justifyRecord(
      recordId: number,
      justificationDate: string,
      motif: string,
      file?: File
    ) {
      if (!this.sheet) return;
      this.loading = true;
      this.error = null;
      const auth = useAuthStore();
      try {
        const formData = new FormData();
        formData.append('justificationDate', justificationDate);
        formData.append('motif', motif);
        if (file) formData.append('file', file);

        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/presences/records/${recordId}/justify`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${auth.token}`,
            },
            body: formData,
          }
        );
        if (!res.ok) throw new Error('Erreur lors de la justification');
        const updatedSheet: PresenceSheet = await res.json();
        this.sheet = updatedSheet;
        useNotificationStore().showNotification(
          'Justification enregistrée',
          'success'
        );
      } catch (err: any) {
        this.error = err.message;
        useNotificationStore().showNotification(this.error, 'error');
      } finally {
        this.loading = false;
      }
    },
  },
});
