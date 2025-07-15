// frontend/src/stores/journalStore.ts
import { defineStore } from 'pinia'
import { useAuthStore } from '@/stores/auth'

interface AcademicYear {
  id: number
  label: string
  startDate: string
  endDate: string
}

interface Mission {
  id: number
  description: string
  childId: number
  academicYearId: number
}

interface Journal {
  id: number
  childId: number
  educatorId: string
  academicYearId: number
  month: number
  isDraft: boolean
  isSubmitted: boolean
  submittedAt: string | null
  contenu: string | null
  progressionMissions: Record<string, any> | null
  attachments: Array<{
    id: number
    filename: string
    filepath: string
  }>
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
     * Prépare les headers avec JWT si disponible.
     */
    getAuthHeaders() {
      const authStore = useAuthStore()
      const headers: Record<string, string> = {}
      if (authStore.token) {
        headers['Authorization'] = `Bearer ${authStore.token}`
      }
      return headers
    },

    /**
     * Récupère toutes les années scolaires disponibles.
     * GET /api/academic-year
     */
    async fetchAcademicYears() {
      this.loading = true
      this.error = ''
      try {
        const headers = {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json',
        }
        const response = await fetch('/api/academic-year', {
          method: 'GET',
          headers,
        })
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData.message || response.statusText)
        }
        const data: AcademicYear[] = await response.json()
        this.academicYears = data
      } catch (err: any) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    /**
     * Récupère toutes les missions pour un enfant et une année donnés.
     * GET /api/mission/child/:childId/year/:yearId
     */
    async fetchMissions(childId: number, yearId: number) {
      this.loading = true
      this.error = ''
      try {
        const headers = {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json',
        }
        const response = await fetch(
          `/api/mission/child/${childId}/year/${yearId}`,
          {
            method: 'GET',
            headers,
          }
        )
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData.message || response.statusText)
        }
        const data: Mission[] = await response.json()
        this.missions = data
      } catch (err: any) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    /**
     * Récupère tous les journaux pour un enfant et une année donnés.
     * GET /api/journal/child/:childId?yearId=:yearId
     */
    async fetchJournals(childId: number, yearId: number) {
      this.loading = true
      this.error = ''
      try {
        const headers = {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json',
        }
        const response = await fetch(
          `/api/journal/child/${childId}?yearId=${yearId}`,
          {
            method: 'GET',
            headers,
          }
        )
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData.message || response.statusText)
        }
        const data: Journal[] = await response.json()
        this.journals = data
      } catch (err: any) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    /**
     * Crée un nouveau journal (brouillon) pour le mois courant.
     * POST /api/journal
     */
    async createJournal(payload: {
      childId: number
      academicYearId: number
      month: number
      contenu?: string
      progressionMissions?: Record<string, any>
    }) {
      this.error = ''
      try {
        const headers = {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json',
        }
        const response = await fetch('/api/journal', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        })
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData.message || response.statusText)
        }
        const data: Journal = await response.json()
        return data
      } catch (err: any) {
        this.error = err.message
        throw err
      }
    },

    /**
     * Met à jour un brouillon existant.
     * PATCH /api/journal/:journalId
     */
    async updateJournal(
      journalId: number,
      payload: { contenu: string; progressionMissions: Record<string, any> }
    ) {
      this.error = ''
      try {
        const headers = {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json',
        }
        const response = await fetch(`/api/journal/${journalId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(payload),
        })
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData.message || response.statusText)
        }
        const data: Journal = await response.json()
        return data
      } catch (err: any) {
        this.error = err.message
        throw err
      }
    },

    /**
     * Soumet définitivement un journal (passe isSubmitted à true).
     * POST /api/journal/:journalId/submit
     */
    async submitJournal(journalId: number) {
      this.error = ''
      try {
        const headers = {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json',
        }
        const response = await fetch(`/api/journal/${journalId}/submit`, {
          method: 'POST',
          headers,
        })
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData.message || response.statusText)
        }
        const data: Journal = await response.json()
        return data
      } catch (err: any) {
        this.error = err.message
        throw err
      }
    },

    /**
     * Réouvre un journal soumis (ADMIN seulement).
     * POST /api/journal/:journalId/reopen
     */
    async reopenJournal(journalId: number, reason: string) {
      this.error = ''
      try {
        const headers = {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json',
        }
        const response = await fetch(`/api/journal/${journalId}/reopen`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ reason }),
        })
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData.message || response.statusText)
        }
        const data: Journal = await response.json()
        return data
      } catch (err: any) {
        this.error = err.message
        throw err
      }
    },

    /**
     * Upload une pièce jointe pour un journal existant.
     * POST /api/journal/:journalId/attachment
     */
    async uploadAttachment(journalId: number, file: File) {
      this.error = ''
      try {
        const headers = this.getAuthHeaders()
        const formData = new FormData()
        formData.append('file', file)
        const response = await fetch(`/api/journal/${journalId}/attachment`, {
          method: 'POST',
          headers,
          body: formData,
        })
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData.message || response.statusText)
        }
        return await response.json()
      } catch (err: any) {
        this.error = err.message
        throw err
      }
    },

    /**
     * Supprime une pièce jointe.
     * DELETE /api/journal/attachment/:attachmentId
     */
    async deleteAttachment(attachmentId: number) {
      this.error = ''
      try {
        const headers = this.getAuthHeaders()
        const response = await fetch(
          `/api/journal/attachment/${attachmentId}`,
          {
            method: 'DELETE',
            headers,
          }
        )
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData.message || response.statusText)
        }
        return true
      } catch (err: any) {
        this.error = err.message
        throw err
      }
    },
  },
})
