/* src/stores/documentStore.ts */
import { defineStore } from 'pinia'
import { useAuthStore } from '@/stores/auth'

/* URL backend : .env => VITE_API_URL (dev : http://localhost:3000) */
const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export interface Consent {
  id: string
  name: string
  status: 'SECRETARY_PENDING' | 'PARENT_PENDING' | 'COMPLETED' | 'CANCELED'
  createdAt: string
  signedPath?: string | null
}

export const useDocumentStore = defineStore('document', {
  state: () => ({
    secretaryConsents: [] as Consent[],
    parentConsents:    [] as Consent[],
    loading: false,
  }),
  getters: { isLoading: (s) => s.loading },
  actions: {
    /* ---------- listes ---------- */
    async fetchSecretary(page = 1) {
      this.loading = true
      try {
        const token = useAuthStore().token
        const r = await fetch(`${API}/documents/consents/secretary?page=${page}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: 'include',
        })
        if (!r.ok) throw new Error(await r.text())
        this.secretaryConsents = await r.json()
      } finally { this.loading = false }
    },

    async fetchParent(page = 1) {
      this.loading = true
      try {
        const token = useAuthStore().token
        const r = await fetch(`${API}/documents/consents/parent?page=${page}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: 'include',
        })
        if (!r.ok) throw new Error(await r.text())
        this.parentConsents = await r.json()
      } finally { this.loading = false }
    },

    /* ---------- upload & création ---------- */
    async uploadConsent(fd: FormData) {
      const token = useAuthStore().token
      const r = await fetch(`${API}/documents/consents`, {
        method: 'POST',
        body: fd,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      })
      if (!r.ok) {
        console.error('Upload consent:', r.status, await r.text())
        throw new Error('Échec upload consent')
      }
      return r.json() as Promise<{ consentId: string; signUrl: string }>
    },

    /* ---------- URL de signature ---------- */
    async getSignUrl(id: string) {
      const token = useAuthStore().token
      const r = await fetch(`${API}/documents/consents/${id}/sign-url`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      })
      if (!r.ok) throw new Error(await r.text())
      return r.text()
    },
  },
})
