// frontend/src/stores/journalStore.ts
import { defineStore } from 'pinia'

/* ──────────────── types ──────────────── */
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
  attachments: Array<{ id: number; filename: string; filepath: string }>
}

/* ──────────────── store ──────────────── */
export const useJournalStore = defineStore('journal', {
  state: () => ({
    childrenRefered : [] as Child[],
    academicYears   : [] as AcademicYear[],
    missions        : [] as Mission[],
    journals        : [] as Journal[],

    selectedYearId  : null as number | null,
    currentChildId  : null as number | null,

    childName       : ''  as string,
    educatorName    : ''  as string,

    loading         : false,
    error           : ''  as string,
  }),

  actions: {
    /* ────────── helpers ────────── */
    getAuthHeaders() {
      const token = localStorage.getItem('token')
      return token ? { Authorization: `Bearer ${token}` } : {}
    },

    /* ────────── enfants & années ────────── */
    async fetchReferentChildren() {
      this.loading = true; this.error = ''
      try {
        const res = await fetch('http://localhost:3000/children/referents', {
          headers: { ...this.getAuthHeaders(), 'Content-Type':'application/json' },
        })
        if (!res.ok) throw new Error((await res.json()).message ?? res.statusText)
        this.childrenRefered = await res.json()
      } catch (e: any) {
        this.error = e.message
      } finally { this.loading = false }
    },

    async fetchAcademicYears() {
      this.loading = true; this.error = ''
      try {
        const res = await fetch('http://localhost:3000/academic-year', {
          headers: { ...this.getAuthHeaders(), 'Content-Type':'application/json' },
        })
        if (!res.ok) throw new Error((await res.json()).message ?? res.statusText)
        this.academicYears = await res.json()
      } catch (e: any) {
        this.error = e.message
      } finally { this.loading = false }
    },

    /* ────────── missions ────────── */
    async fetchMissions(childId: number, yearId: number) {
      this.loading = true; this.error = ''
      try {
        const res = await fetch(
          `http://localhost:3000/mission/child/${childId}/year/${yearId}`,
          { headers: { ...this.getAuthHeaders(), 'Content-Type':'application/json' } }
        )
        if (!res.ok) throw new Error((await res.json()).message ?? res.statusText)
        this.missions = await res.json()
      } catch (e:any) {
        this.error = e.message
      } finally { this.loading = false }
    },

    /** Enregistre (supprime puis recrée) toutes les missions */
    async saveMissions(
      childId: number,
      yearId : number,
      payload: Array<{ id?: number; description: string }>
    ) {
      this.error = ''; this.loading = true
      const headers = { ...this.getAuthHeaders(), 'Content-Type':'application/json' }

      try {
        /* 1) suppression */
        for (const m of this.missions) {
          await fetch(`http://localhost:3000/mission/${m.id}`, { method:'DELETE', headers })
        }

        /* 2) création (URL **sans** slash final) */
        for (const { description } of payload) {
          const desc = description.trim()
          if (!desc) continue
          await fetch('http://localhost:3000/mission', {
            method:'POST',
            headers,
            body: JSON.stringify({ childId, academicYearId: yearId, description: desc }),
          })
        }

        /* 3) refresh local store */
        await this.fetchMissions(childId, yearId)

      } catch (e:any) {
        this.error = e.message
        throw e
      } finally { this.loading = false }
    },

    /* ────────── journaux (les méthodes suivantes sont inchangées) ────────── */
    async fetchJournals(childId: number, yearId: number) {
      this.loading = true; this.error=''
      try {
        const res = await fetch(
          `http://localhost:3000/journal/child/${childId}?yearId=${yearId}`,
          { headers:{ ...this.getAuthHeaders(),'Content-Type':'application/json'} }
        )
        if (!res.ok) throw new Error((await res.json()).message ?? res.statusText)
        this.journals = await res.json()
      } catch (e:any) { this.error = e.message }
      finally { this.loading = false }
    },

    async createJournal(payload: {
      childId:number; academicYearId:number; month:number;
      contenu?:string; progressionMissions?:Record<string,any>
    }) {
      this.error=''
      const res = await fetch('http://localhost:3000/journal',{
        method:'POST',
        headers:{ ...this.getAuthHeaders(),'Content-Type':'application/json'},
        body:JSON.stringify(payload),
      })
      if (!res.ok) throw new Error((await res.json()).message ?? res.statusText)
      return await res.json() as Journal
    },

    async updateJournal(journalId:number, payload:{ contenu:string; progressionMissions:Record<string,any> }) {
      this.error=''
      const res = await fetch(`http://localhost:3000/journal/${journalId}`,{
        method:'PATCH',
        headers:{ ...this.getAuthHeaders(),'Content-Type':'application/json'},
        body:JSON.stringify(payload),
      })
      if (!res.ok) throw new Error((await res.json()).message ?? res.statusText)
      return await res.json() as Journal
    },

    async submitJournal(journalId:number) {
      this.error=''
      const res = await fetch(`http://localhost:3000/journal/${journalId}/submit`,{
        method:'POST', headers:{ ...this.getAuthHeaders(),'Content-Type':'application/json'},
      })
      if (!res.ok) throw new Error((await res.json()).message ?? res.statusText)
      return await res.json() as Journal
    },

    async reopenJournal(journalId:number, reason:string) {
      this.error=''
      const res = await fetch(`http://localhost:3000/journal/${journalId}/reopen`,{
        method:'POST',
        headers:{ ...this.getAuthHeaders(),'Content-Type':'application/json'},
        body:JSON.stringify({ reason }),
      })
      if (!res.ok) throw new Error((await res.json()).message ?? res.statusText)
      return await res.json() as Journal
    },

    async uploadAttachment(journalId:number, file:File) {
      this.error=''
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`http://localhost:3000/journal/${journalId}/attachment`,{
        method:'POST',
        headers:this.getAuthHeaders(),
        body:formData,
      })
      if (!res.ok) throw new Error((await res.json()).message ?? res.statusText)
      return await res.json()
    },

    async deleteAttachment(attachmentId:number) {
      this.error=''
      const res = await fetch(`http://localhost:3000/journal/attachment/${attachmentId}`,{
        method:'DELETE', headers:this.getAuthHeaders(),
      })
      if (!res.ok) throw new Error((await res.json()).message ?? res.statusText)
      return true
    },
  },
})
