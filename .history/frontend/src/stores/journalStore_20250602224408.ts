// frontend/src/stores/journalStore.ts
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
     * Lit directement le token dans localStorage au moment de chaque appel,
     * afin d’être sûr de prendre la valeur à jour.
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
     * Récupère toutes les années scolaires disponibles.
     * GET http://localhost:3000/academic-year
     */
    async fetchAcademicYears() {
      this.loading = true
      this.error = ''
      try {
        // On reconstruit les en-têtes à chaque appel, en lisant le JWT directement
        const headers = {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json',
        }
        console.log('[journalStore] fetchAcademicYears headers =', headers)

        const response = await fetch('http://localhost:3000/academic-year', {
          method: 'GET',
          headers,
        })
        console.log('[journalStore] fetchAcademicYears status =', response.status)

        if (!response.ok) {
          // On tente de lire le message d’erreur renvoyé par le back
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
        console.log('[journalStore] fetchMissions headers =', headers)

        const response = await fetch(
          `http://localhost:3000/mission/child/${childId}/year/${yearId}`,
          {
            method: 'GET',
            headers,
          }
        )
        console.log('[journalStore] fetchMissions status =', response.status)

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
        console.log('[journalStore] fetchJournals headers =', headers)

        const response = await fetch(
          `http://localhost:3000/journal/child/${childId}?yearId=${yearId}`,
          {
            method: 'GET',
            headers,
          }
        )
        console.log('[journalStore] fetchJournals status =', response.status)

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
        console.log('[journalStore] createJournal headers =', headers)

        const response = await fetch('http://localhost:3000/journal', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        })
        console.log('[journalStore] createJournal status =', response.status)

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
        console.log('[journalStore] updateJournal headers =', headers)

        const response = await fetch(`http://localhost:3000/journal/${journalId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(payload),
        })
        console.log('[journalStore] updateJournal status =', response.status)

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
     * POST http://localhost:3000/journal/:journalId/submit
     */
    async submitJournal(journalId: number) {
      this.error = ''
      try {
        const headers = {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json',
        }
        console.log('[journalStore] submitJournal headers =', headers)

        const response = await fetch(`http://localhost:3000/journal/${journalId}/submit`, {
          method: 'POST',
          headers,
        })
        console.log('[journalStore] submitJournal status =', response.status)

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
     * POST http://localhost:3000/journal/:journalId/reopen
     */
    async reopenJournal(journalId: number, reason: string) {
      this.error = ''
      try {
        const headers = {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json',
        }
        console.log('[journalStore] reopenJournal headers =', headers)

        const response = await fetch(`http://localhost:3000/journal/${journalId}/reopen`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ reason }),
        })
        console.log('[journalStore] reopenJournal status =', response.status)

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
     * POST http://localhost:3000/journal/:journalId/attachment
     */
    async uploadAttachment(journalId: number, file: File) {
      this.error = ''
      try {
        const headers = this.getAuthHeaders()
        console.log('[journalStore] uploadAttachment headers =', headers)

        const formData = new FormData()
        formData.append('file', file)
        const response = await fetch(`http://localhost:3000/journal/${journalId}/attachment`, {
          method: 'POST',
          headers,
          body: formData,
        })
        console.log('[journalStore] uploadAttachment status =', response.status)

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
        console.log('[journalStore] deleteAttachment headers =', headers)

        const response = await fetch(
          `http://localhost:3000/journal/attachment/${attachmentId}`,
          {
            method: 'DELETE',
            headers,
          }
        )
        console.log('[journalStore] deleteAttachment status =', response.status)

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
