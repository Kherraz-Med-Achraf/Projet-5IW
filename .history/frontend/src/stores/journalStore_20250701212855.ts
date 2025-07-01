import { defineStore } from 'pinia'

/* --------------------------------------------------------------------------- */
/*                               Type definitions                              */
/* --------------------------------------------------------------------------- */
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

/* --------------------------------------------------------------------------- */
/*                                    Store                                    */
/* --------------------------------------------------------------------------- */
export const useJournalStore = defineStore('journal', {
  state: () => ({
    childrenRefered: [] as Child[],
    academicYears  : [] as AcademicYear[],
    missions       : [] as Mission[],
    journals       : [] as Journal[],
    entries        : [] as Journal[], // ajout pour Home.vue

    selectedYearId : null as number | null,
    currentChildId : null as number | null,

    childName      : '' as string,
    educatorName   : '' as string,

    loading: false,
    error  : '' as string,
  }),

  actions: {
    /* --------------------------------------------------------------------- */
    /*                               Helpers                                 */
    /* --------------------------------------------------------------------- */
    getAuthHeaders() {
      const token = localStorage.getItem('token')
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      return headers
    },

    /* --------------------------------------------------------------------- */
    /*            ✨ IA – suggestion d'amélioration de mission ✨              */
    /* --------------------------------------------------------------------- */
    async proposeMissionImprovement(prompt: string, type: 'mission' | 'observation' | 'progression' | 'blog' = 'mission'): Promise<string> {
      const headers = {
        ...this.getAuthHeaders(),
        'Content-Type': 'application/json',
      }

      const res = await fetch('http://localhost:3000/ai/mission-improve', {
        method: 'POST',
        headers,
        body  : JSON.stringify({ prompt, type }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || res.statusText)
      }

      const data = await res.json()
      return (data.suggestion ?? data.content ?? '').toString()
    },

    /* --------------------------------------------------------------------- */
    /*                               Children                                */
    /* --------------------------------------------------------------------- */
    async fetchReferentChildren() {
      this.loading = true
      this.error   = ''
      try {
        const authStore = useAuthStore()
        const userRole = authStore.user?.role
        
        const headers = { ...this.getAuthHeaders(), 'Content-Type': 'application/json' }
        
        let url = 'http://localhost:3000/children'
        
        // SÉCURITÉ CRITIQUE: Différentes routes selon le rôle
        if (userRole === 'CHILD') {
          // Les enfants ne peuvent voir que leurs propres données
          url = 'http://localhost:3000/children/me'
        } else if (userRole === 'PARENT') {
          // Les parents voient leurs enfants
          url = 'http://localhost:3000/children'
        } else if (['STAFF', 'TEACHER', 'SERVICE_MANAGER', 'SECRETARY', 'DIRECTOR', 'ADMIN'].includes(userRole || '')) {
          // Le personnel voit les enfants référents
          url = 'http://localhost:3000/children/referents'
        } else {
          // Rôle non autorisé
          throw new Error('Accès non autorisé : rôle inconnu ou non autorisé')
        }

        const res = await fetch(url, { headers })
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || res.statusText)
        
        const data = await res.json()
        
        // Pour les enfants, la route /children/me retourne un objet, pas un tableau
        if (userRole === 'CHILD') {
          this.childrenRefered = [data] // Transformer en tableau avec un seul élément
        } else {
          this.childrenRefered = data
        }
        
      } catch (e: any) {
        this.error = e.message
        // En cas d'erreur, vider la liste pour éviter l'affichage de données non autorisées
        this.childrenRefered = []
      } finally {
        this.loading = false
      }
    },

    /* --------------------------------------------------------------------- */
    /*                             Academic years                            */
    /* --------------------------------------------------------------------- */
    async fetchAcademicYears() {
      this.loading = true
      this.error   = ''
      try {
        const headers = { ...this.getAuthHeaders(), 'Content-Type': 'application/json' }
        const res     = await fetch('http://localhost:3000/academic-year', { headers })
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || res.statusText)
        this.academicYears = await res.json()
      } catch (e: any) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    },

    /* --------------------------------------------------------------------- */
    /*                                 Missions                              */
    /* --------------------------------------------------------------------- */
    async fetchMissions(childId: number, yearId: number) {
      this.loading = true
      this.error   = ''
      try {
        const headers = { ...this.getAuthHeaders(), 'Content-Type': 'application/json' }
        const url     = `http://localhost:3000/mission/child/${childId}/year/${yearId}`
        const res     = await fetch(url, { headers })
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
      yearId : number,
      payload: Array<{ id?: number; description: string }>
    ) {
      this.error   = ''
      this.loading = true
      try {
        const headers = { ...this.getAuthHeaders(), 'Content-Type': 'application/json' }

        /* 1) Delete existantes */
        for (const m of this.missions) {
          await fetch(`http://localhost:3000/mission/${m.id}`, {
            method: 'DELETE',
            headers,
          })
        }

        /* 2) Create */
        const createUrl = `http://localhost:3000/mission/child/${childId}/year/${yearId}`
        for (const m of payload) {
          const desc = m.description.trim()
          if (desc) {
            await fetch(createUrl, {
              method: 'POST',
              headers,
              body  : JSON.stringify({ description: desc }),
            })
          }
        }

        /* 3) Refresh local */
        await this.fetchMissions(childId, yearId)
      } catch (e: any) {
        this.error = e.message
        throw e
      } finally {
        this.loading = false
      }
    },

    /* --------------------------------------------------------------------- */
    /*                                 Journaux                              */
    /* --------------------------------------------------------------------- */
    /**
     * Récupère les journaux d'un enfant pour une année scolaire
     */
    async fetchJournals(childId: number, yearId: number) {
      this.loading = true
      this.error   = ''
      try {
        const headers = { ...this.getAuthHeaders(), 'Content-Type': 'application/json' }
        const url     = `http://localhost:3000/journal/child/${childId}?yearId=${yearId}`
        const res     = await fetch(url, { headers })
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || res.statusText)
        this.journals = await res.json()
      } catch (e: any) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    },

    /**
     * Récupère toutes les entrées de journal pour le mois donné (format 'YYYY-MM').
     */
    async fetchEntries(month: string) {
      this.loading = true
      this.error   = ''
      try {
        const headers = { ...this.getAuthHeaders(), 'Content-Type': 'application/json' }
        const url     = `http://localhost:3000/journal?month=${encodeURIComponent(month)}`
        const res     = await fetch(url, { headers })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.message || res.statusText)
        }
        this.entries = await res.json()
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
        const res     = await fetch('http://localhost:3000/journal', {
          method: 'POST',
          headers,
          body  : JSON.stringify(payload),
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
      payload  : { contenu: string; progressionMissions: Record<string, any> }
    ) {
      this.error = ''
      try {
        const headers = { ...this.getAuthHeaders(), 'Content-Type': 'application/json' }
        const res     = await fetch(`http://localhost:3000/journal/${journalId}`, {
          method: 'PATCH',
          headers,
          body  : JSON.stringify(payload),
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
        // On n'envoie pas de Content-Type pour accepter un corps vide
        const headers = this.getAuthHeaders()
        const res     = await fetch(
          `http://localhost:3000/journal/${journalId}/submit`,
          { method: 'POST', headers }
        )
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.message || res.statusText)
        }
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
        const res     = await fetch(`http://localhost:3000/journal/${journalId}/reopen`, {
          method: 'POST',
          headers,
          body  : JSON.stringify({ reason }),
        })
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || res.statusText)
        return (await res.json()) as Journal
      } catch (e: any) {
        this.error = e.message
        throw e
      }
    },

    /* --------------------------------------------------------------------- */
    /*                             Pièces jointes                            */
    /* --------------------------------------------------------------------- */
    async uploadAttachment(journalId: number, file: File) {
      this.error = ''
      try {
        const headers = this.getAuthHeaders()
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch(`http://localhost:3000/journal/${journalId}/attachment`, {
          method: 'POST',
          headers,
          body  : formData,
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
        const res     = await fetch(`http://localhost:3000/journal/attachment/${attachmentId}`, {
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
