/* src/stores/documentStore.ts */
import { defineStore } from 'pinia'
import { useAuthStore } from '@/stores/auth'

/* ───────── Types ───────── */
export interface Consent {
  id: string
  name: string
  status: 'SECRETARY_PENDING' | 'PARENT_PENDING' | 'COMPLETED' | 'CANCELED'
  createdAt: string
  signedPath?: string | null
}

/* ───────── Store ───────── */
export const useDocumentStore = defineStore('document', {
  state: () => ({
    secretaryConsents: [] as Consent[],
    parentConsents:    [] as Consent[],
    loading: false,
  }),

  getters: {
    isLoading: (s) => s.loading,
  },

  actions: {
    /* ───── Liste côté secrétaire ───── */
    async fetchSecretary(page = 1) {
      this.loading = true
      try {
        const token = useAuthStore().token
        const r = await fetch(`/documents/consents/secretary?page=${page}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: 'include',
        })
        if (!r.ok) throw new Error(await r.text())
        this.secretaryConsents = await r.json()
      } finally { this.loading = false }
    },

    /* ───── Liste côté parent ───── */
    async fetchParent(page = 1) {
      this.loading = true
      try {
        const token = useAuthStore().token
        const r = await fetch(`/documents/consents/parent?page=${page}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: 'include',
        })
        if (!r.ok) throw new Error(await r.text())
        this.parentConsents = await r.json()
      } finally { this.loading = false }
    },

    /* ───── Création + upload ───── */
    async uploadConsent(fd: FormData) {
      const token = useAuthStore().token
      const r = await fetch('/documents/consents', {
        method: 'POST',
        body: fd,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      })
      if (!r.ok) throw new Error(await r.text())
      return r.json() as Promise<{ consentId: string; signUrl: string }>
    },

    /* ───── URL de signature (secrétaire / parent) ───── */
    async getSignUrl(id: string) {
      const token = useAuthStore().token
      const r = await fetch(`/documents/consents/${id}/sign-url`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      })
      if (!r.ok) throw new Error(await r.text())
      return r.text()            // backend renvoie l’URL brute
    },
  },
})
