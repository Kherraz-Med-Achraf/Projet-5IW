// frontend/src/stores/journalStore.ts
import { defineStore } from 'pinia';
import axios from 'axios';

interface AcademicYear {
  id: number;
  label: string;
  startDate: string;
  endDate: string;
}

interface Mission {
  id: number;
  description: string;
  childId: number;
  academicYearId: number;
}

interface Journal {
  id: number;
  childId: number;
  educatorId: string;
  academicYearId: number;
  month: number;
  isDraft: boolean;
  isSubmitted: boolean;
  submittedAt: string | null;
  contenu: string | null;
  progressionMissions: Record<string, any> | null;
  attachments: Array<{
    id: number;
    filename: string;
    filepath: string;
  }>;
}

export const useJournalStore = defineStore('journal', {
  state: () => ({
    academicYears: [] as AcademicYear[],
    missions: [] as Mission[],
    journals: [] as Journal[],
    selectedYearId: null as number | null,
    currentChildId: null as number | null,
    childName: '' as string,
    educatorName: '' as string,
    loading: false as boolean,
    error: '' as string,
  }),
  actions: {
    /**
     * Récupère toutes les années scolaires disponibles.
     * GET /api/academic-year
     */
    async fetchAcademicYears() {
      this.loading = true;
      try {
        const { data } = await axios.get<AcademicYear[]>('/api/academic-year');
        this.academicYears = data;
      } catch (err: any) {
        this.error = err.response?.data?.message || err.message;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Récupère toutes les missions pour un enfant et une année donnés.
     * GET /api/mission/child/:childId/year/:yearId
     */
    async fetchMissions(childId: number, yearId: number) {
      this.loading = true;
      try {
        const { data } = await axios.get<Mission[]>(`/api/mission/child/${childId}/year/${yearId}`);
        this.missions = data;
      } catch (err: any) {
        this.error = err.response?.data?.message || err.message;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Récupère tous les journaux pour un enfant et une année donnés.
     * GET /api/journal/child/:childId?yearId=:yearId
     */
    async fetchJournals(childId: number, yearId: number) {
      this.loading = true;
      try {
        const { data } = await axios.get<Journal[]>(`/api/journal/child/${childId}?yearId=${yearId}`);
        this.journals = data;
      } catch (err: any) {
        this.error = err.response?.data?.message || err.message;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Crée un nouveau journal (brouillon) pour le mois courant.
     * POST /api/journal
     */
    async createJournal(payload: {
      childId: number;
      academicYearId: number;
      month: number;
      contenu?: string;
      progressionMissions?: Record<string, any>;
    }) {
      const { data } = await axios.post<Journal>(`/api/journal`, payload);
      return data;
    },

    /**
     * Met à jour un brouillon existant.
     * PATCH /api/journal/:journalId
     */
    async updateJournal(journalId: number, payload: { contenu: string; progressionMissions: Record<string, any> }) {
      const { data } = await axios.patch<Journal>(`/api/journal/${journalId}`, payload);
      return data;
    },

    /**
     * Soumet définitivement un journal (passe isSubmitted à true).
     * POST /api/journal/:journalId/submit
     */
    async submitJournal(journalId: number) {
      const { data } = await axios.post<Journal>(`/api/journal/${journalId}/submit`);
      return data;
    },

    /**
     * Réouvre un journal soumis (ADMIN seulement).
     * POST /api/journal/:journalId/reopen
     */
    async reopenJournal(journalId: number, reason: string) {
      const { data } = await axios.post<Journal>(`/api/journal/${journalId}/reopen`, { journalId, reason });
      return data;
    },

    /**
     * Upload une pièce jointe pour un journal existant.
     * POST /api/journal/:journalId/attachment
     */
    async uploadAttachment(journalId: number, file: File) {
      const formData = new FormData();
      formData.append('file', file);
      return axios.post(`/api/journal/${journalId}/attachment`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },

    /**
     * Supprime une pièce jointe.
     * DELETE /api/journal/attachment/:attachmentId
     */
    async deleteAttachment(attachmentId: number) {
      return axios.delete(`/api/journal/attachment/${attachmentId}`);
    },
  },
});
