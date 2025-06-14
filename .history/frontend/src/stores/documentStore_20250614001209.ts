import { defineStore } from 'pinia';

export interface Consent {
  id: string;
  name: string;
  status: 'SECRETARY_PENDING' | 'PARENT_PENDING' | 'COMPLETED' | 'CANCELED';
  createdAt: string;
  signedPath?: string | null;
}

const API = import.meta.env.VITE_API_URL ?? '/api';

export const useDocumentStore = defineStore('document', {
  state: () => ({
    secretaryConsents: [] as Consent[],
    parentConsents: [] as Consent[],
    loading: false,
  }),
  getters: {
    isLoading: (s) => s.loading,
  },
  actions: {
    async fetchSecretary(page = 1) {
      this.loading = true;
      try {
        const res = await fetch(
          `${API}/documents/consents/secretary?page=${page}`,
        );
        if (!res.ok) throw new Error(await res.text());
        this.secretaryConsents = (await res.json()) as Consent[];
      } finally {
        this.loading = false;
      }
    },
    async fetchParent(page = 1) {
      this.loading = true;
      try {
        const res = await fetch(
          `${API}/documents/consents/parent?page=${page}`,
        );
        if (!res.ok) throw new Error(await res.text());
        this.parentConsents = (await res.json()) as Consent[];
      } finally {
        this.loading = false;
      }
    },
    async uploadConsent(formData: FormData) {
      const res = await fetch(`${API}/documents/consents`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error(await res.text());
      return (await res.json()) as { consentId: string; signUrl: string };
    },
    async getSignUrl(id: string) {
      const res = await fetch(`${API}/documents/consents/${id}/sign-url`);
      if (!res.ok) throw new Error(await res.text());
      return await res.text(); // backend renvoie directement l’URL
    },
  },
});
