// frontend/src/stores/jjournalStore.ts
import { defineStore } from 'pinia'

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
     * Lit directement le token dans localStorage pour constituer l’en‐tête Authorization.
     */
    getAuthHeaders() {
      const token = localStorage.getItem('token')
      const headers: Record<string, string> = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      return headers
    },

    /**
     * Récupère toutes les années scolaires.
     * GET http://localhost:3000/academic-year
     */
    async fetchAcademicYears() {
      this.loading = true
      this.error = ''
      try {
        const headers = {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json',
        }
        const response = await fetch('http://localhost:3000/academic-year', {
          method: 'GET',
          headers,
        })
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData.message || response.statusText)
        }
        this.academicYears = await response.json()
      } catch (err: any) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    /**
     * Récupère toutes les missions pour un enfant et une année spécifiés.
     * GET http://localhost:3000/mission/child/:childId/year/:yearId
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
          `http://localhost:3000/mission/child/${childId}/year/${yearId}`,
          {
            method: 'GET',
            headers,
          }
        )
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData.message || response.statusText)
        }
        this.missions = await response.json()
      } catch (err: any) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    /**
     * Récupère tous les journaux pour un enfant et une année donnés.
     * GET http://localhost:3000/journal/child/:childId?yearId=:yearId
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
          `http://localhost:3000/journal/child/${childId}?yearId=${yearId}`,
          {
            method: 'GET',
            headers,
          }
        )
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData.message || response.statusText)
        }
        this.journals = await response.json()
      } catch (err: any) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    /**
     * Crée un nouveau journal (brouillon).
     * POST http://localhost:3000/journal
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
        const response = await fetch('http://localhost:3000/journal', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        })
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData.message || response.statusText)
        }
        return (await response.json()) as Journal
      } catch (err: any) {
        this.error = err.message
        throw err
      }
    },

    /**
     * Met à jour un brouillon de journal existant.
     * PATCH http://localhost:3000/journal/:journalId
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
        const response = await fetch(`http://localhost:3000/journal/${journalId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(payload),
        })
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData.message || response.statusText)
        }
        return (await response.json()) as Journal
      } catch (err: any) {
        this.error = err.message
        throw err
      }
    },

    /**
     * Soumet définitivement un journal (mark isSubmitted = true).
     * POST http://localhost:3000/journal/:journalId/submit
     */
    async submitJournal(journalId: number) {
      this.error = ''
      try {
        const headers = {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json',
        }
        const response = await fetch(`http://localhost:3000/journal/${journalId}/submit`, {
          method: 'POST',
          headers,
        })
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData.message || response.statusText)
        }
        return (await response.json()) as Journal
      } catch (err: any) {
        this.error = err.message
        throw err
      }
    },

    /**
     * Réouvre un journal soumis (ADMIN seulement).
     * POST http://localhost:3000/journal/:journalId/reopen
     */
    async reopenJournal(journalId: number, reason: string) {
      this.error = ''
      try {
        const headers = {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json',
        }
        const response = await fetch(`http://localhost:3000/journal/${journalId}/reopen`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ reason }),
        })
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData.message || response.statusText)
        }
        return (await response.json()) as Journal
      } catch (err: any) {
        this.error = err.message
        throw err
      }
    },

    /**
     * Upload d’une pièce jointe pour un journal existant.
     * POST http://localhost:3000/journal/:journalId/attachment
     */
    async uploadAttachment(journalId: number, file: File) {
      this.error = ''
      try {
        const headers = this.getAuthHeaders()
        const formData = new FormData()
        formData.append('file', file)
        const response = await fetch(`http://localhost:3000/journal/${journalId}/attachment`, {
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
     * DELETE http://localhost:3000/journal/attachment/:attachmentId
     */
    async deleteAttachment(attachmentId: number) {
      this.error = ''
      try {
        const headers = this.getAuthHeaders()
        const response = await fetch(
          `http://localhost:3000/journal/attachment/${attachmentId}`,
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
