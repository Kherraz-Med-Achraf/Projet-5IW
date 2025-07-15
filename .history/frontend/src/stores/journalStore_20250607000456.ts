// frontend/src/stores/journalStore.ts
import { defineStore } from 'pinia'

interface Child {
  id: number
  firstName: string
  lastName: string
  birthDate: string
  parentProfileId: number
  userId: string | null
  createdAt: string
  updatedAt: string
}

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
    childrenRefered: [] as Child[],
    academicYears: [] as AcademicYear[],
    missions: [] as Mission[],
    journals: [] as Journal[],

    selectedYearId: null as number | null,
    currentChildId: null as number | null,

    childName: '' as string,
    educatorName: '' as string,

    loading: false,
    error: '',
  }),

  actions: {
    // ---------- Helpers ----------
    getAuthHeaders() {
      const token = localStorage.getItem('token')
      const headers: Record<string, string> = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      return headers
    },

    // ---------- Children ----------
    async fetchReferentChildren() {
      this.loading = true
      this.error = ''
      try {
        const headers = { ...this.getAuthHeaders(), 'Content-Type': 'application/json' }
        const res = await fetch('http://localhost:3000/children/referents', { headers })
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || res.statusText)
        this.childrenRefered = await res.json()
      } catch (e: any) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    },

    // ---------- Academic years ----------
    async fetchAcademicYears() {
      this.loading = true
      this.error = ''
      try {
        const headers = { ...this.getAuthHeaders(), 'Content-Type': 'application/json' }
        const res = await fetch('http://localhost:3000/academic-year', { headers })
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || res.statusText)
        this.academicYears = await res.json()
      } catch (e: any) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    },

    // ---------- Missions ----------
    async fetchMissions(childId: number, yearId: number) {
      this.loading = true
      this.error = ''
      try {
        const headers = { ...this.getAuthHeaders(), 'Content-Type': 'application/json' }
        const url = `http://localhost:3000/mission/child/${childId}/year/${yearId}`
        const res = await fetch(url, { headers })
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || res.statusText)
        this.missions = await res.json()
      } catch (e: any) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    },

    async saveMissions(
      childId: number,
      yearId: number,
      payload: Array<{ id?: number; description: string }>
    ) {
      this.error = ''
      this.loading = true
      try {
        const headers = { ...this.getAuthHeaders(), 'Content-Type': 'application/json' }

        /* 1) suppression des missions existantes */
        for (const m of this.missions) {
          await fetch(`http://localhost:3000/mission/${m.id}`, {
            method: 'DELETE',
            headers,
          })
        }

        /* 2) création des nouvelles missions */
        const createUrl = `http://localhost:3000/mission/child/${childId}/year/${yearId}`
        for (const m of payload) {
          const desc = m.description.trim()
          if (desc) {
            await fetch(createUrl, {
              method: 'POST',
              headers,
              body: JSON.stringify({ description: desc }),
            })
          }
        }

        /* 3) rafraîchissement local */
        await this.fetchMissions(childId, yearId)
      } catch (e: any) {
        this.error = e.message
        throw e
      } finally {
        this.loading = false
      }
    },

    // ---------- Journaux ----------
    async fetchJournals(childId: number, yearId: number) {
      this.loading = true
      this.error = ''
      try {
        const headers = { ...this.getAuthHeaders(), 'Content-Type': 'application/json' }
        const url = `http://localhost:3000/journal/child/${childId}?yearId=${yearId}`
        const res = await fetch(url, { headers })
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || res.statusText)
        this.journals = await res.json()
      } catch (e: any) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    },

    async createJournal(payload: {
      childId: number
      academicYearId: number
      month: number
      contenu?: string
      progressionMissions?: Record<string, any>
    }) {
      this.error = ''
      try {
        const headers = { ...this.getAuthHeaders(), 'Content-Type': 'application/json' }
        const res = await fetch('http://localhost:3000/journal', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || res.statusText)
        return (await res.json()) as Journal
      } catch (e: any) {
        this.error = e.message
        throw e
      }
    },

    async updateJournal(
      journalId: number,
      payload: { contenu: string; progressionMissions: Record<string, any> }
    ) {
      this.error = ''
      try {
        const headers = { ...this.getAuthHeaders(), 'Content-Type': 'application/json' }
        const res = await fetch(`http://localhost:3000/journal/${journalId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || res.statusText)
        return (await res.json()) as Journal
      } catch (e: any) {
        this.error = e.message
        throw e
      }
    },

    async submitJournal(journalId: number) {
      this.error = ''
      try {
        const headers = { ...this.getAuthHeaders(), 'Content-Type': 'application/json' }
        const res = await fetch(`http://localhost:3000/journal/${journalId}/submit`, {
          method: 'POST',
          headers,
        })
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || res.statusText)
        return (await res.json()) as Journal
      } catch (e: any) {
        this.error = e.message
        throw e
      }
    },

    async reopenJournal(journalId: number, reason: string) {
      this.error = ''
      try {
        const headers = { ...this.getAuthHeaders(), 'Content-Type': 'application/json' }
        const res = await fetch(`http://localhost:3000/journal/${journalId}/reopen`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ reason }),
        })
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || res.statusText)
        return (await res.json()) as Journal
      } catch (e: any) {
        this.error = e.message
        throw e
      }
    },

    // ---------- Pièces jointes ----------
    async uploadAttachment(journalId: number, file: File) {
      this.error = ''
      try {
        const headers = this.getAuthHeaders()
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch(`http://localhost:3000/journal/${journalId}/attachment`, {
          method: 'POST',
          headers,
          body: formData,
        })
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || res.statusText)
        return await res.json()
      } catch (e: any) {
        this.error = e.message
        throw e
      }
    },

    async deleteAttachment(attachmentId: number) {
      this.error = ''
      try {
        const headers = this.getAuthHeaders()
        const res = await fetch(`http://localhost:3000/journal/attachment/${attachmentId}`, {
          method: 'DELETE',
          headers,
        })
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || res.statusText)
        return true
      } catch (e: any) {
        this.error = e.message
        throw e
      }
    },
  },
})
