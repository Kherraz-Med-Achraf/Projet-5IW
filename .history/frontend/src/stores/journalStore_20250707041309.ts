import { defineStore } from 'pinia'
import { useAuthStore } from './auth'
import { secureApiCall, secureJsonCall, API_BASE_URL } from '@/utils/api'
import { AuthService } from '@/utils/auth'

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
    entries        : [] as Journal[],

    selectedYearId : null as number | null,
    currentChildId : null as number | null,

    childName      : '' as string,
    educatorName   : '' as string,

    loading: false,
    error  : '' as string,
    
    currentUserId: null as string | null,
  }),

  actions: {
    resetStore() {
      this.childrenRefered = []
      this.academicYears = []
      this.missions = []
      this.journals = []
      this.entries = []
      this.selectedYearId = null
      this.currentChildId = null
      this.childName = ''
      this.educatorName = ''
      this.loading = false
      this.error = ''
      this.currentUserId = null
    },

    checkUserChange() {
      const authStore = useAuthStore()
      const newUserId = authStore.user?.id || null
      
      if (this.currentUserId !== newUserId) {
        this.resetStore()
        this.currentUserId = newUserId
      }
    },

    async proposeMissionImprovement(prompt: string, type: 'mission' | 'observation' | 'progression' | 'blog' = 'mission'): Promise<string> {
      const data = await secureJsonCall(`${API_BASE_URL}/ai/mission-improve`, {
        method: 'POST',
        body: JSON.stringify({ prompt, type }),
      })
      return (data.suggestion ?? data.content ?? '').toString()
    },

    async fetchReferentChildren() {
      this.checkUserChange()
      
      this.loading = true
      this.error   = ''
      try {
        const authStore = useAuthStore()
        const userRole = authStore.user?.role
        
        let url = `${API_BASE_URL}/children`
        
        if (userRole === 'CHILD') {
          url = `${API_BASE_URL}/children/me`
        } else if (userRole === 'PARENT') {
          url = `${API_BASE_URL}/children`
        } else if (['STAFF', 'TEACHER', 'SERVICE_MANAGER', 'SECRETARY', 'DIRECTOR', 'ADMIN'].includes(userRole || '')) {
          url = `${API_BASE_URL}/children/referents`
        } else {
          throw new Error('Accès non autorisé : rôle inconnu ou non autorisé')
        }

        const data = await secureJsonCall(url)
        
        if (userRole === 'CHILD') {
          this.childrenRefered = [data]
        } else {
          this.childrenRefered = data
        }
        
      } catch (e: any) {
        this.error = e.message
        this.childrenRefered = []
      } finally {
        this.loading = false
      }
    },

    async fetchAcademicYears() {
      this.loading = true
      this.error   = ''
      try {
        this.academicYears = await secureJsonCall(`${API_BASE_URL}/academic-year`)
      } catch (e: any) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    },

    async fetchMissions(childId: number, yearId: number) {
      this.loading = true
      this.error   = ''
      try {
        const url = `${API_BASE_URL}/mission/child/${childId}/year/${yearId}`
        this.missions = await secureJsonCall(url)
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
        /* 1) Delete existantes */
        for (const m of this.missions) {
          await secureApiCall(`${API_BASE_URL}/mission/${m.id}`, {
            method: 'DELETE',
          })
        }

        /* 2) Create */
        const createUrl = `${API_BASE_URL}/mission/child/${childId}/year/${yearId}`
        for (const m of payload) {
          const desc = m.description.trim()
          if (desc) {
            await secureJsonCall(createUrl, {
              method: 'POST',
              body: JSON.stringify({ description: desc }),
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

    async fetchJournals(childId: number, yearId: number) {
      this.loading = true
      this.error   = ''
      try {
        const url = `${API_BASE_URL}/journal/child/${childId}?yearId=${yearId}`
        this.journals = await secureJsonCall(url)
      } catch (e: any) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    },

    async fetchEntries(month: string) {
      this.loading = true
      this.error   = ''
      try {
        const url = `${API_BASE_URL}/journal?month=${encodeURIComponent(month)}`
        this.entries = await secureJsonCall(url)
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
        return await secureJsonCall(`${API_BASE_URL}/journal`, {
          method: 'POST',
          body: JSON.stringify(payload),
        }) as Journal
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
        return await secureJsonCall(`${API_BASE_URL}/journal/${journalId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        }) as Journal
      } catch (e: any) {
        this.error = e.message
        throw e
      }
    },

    async submitJournal(journalId: number) {
      this.error = ''
      try {
        return await secureJsonCall(`${API_BASE_URL}/journal/${journalId}/submit`, {
          method: 'POST',
        }) as Journal
      } catch (e: any) {
        this.error = e.message
        throw e
      }
    },

    async reopenJournal(journalId: number, reason: string) {
      this.error = ''
      try {
        return await secureJsonCall(`${API_BASE_URL}/journal/${journalId}/reopen`, {
          method: 'POST',
          body: JSON.stringify({ reason }),
        }) as Journal
      } catch (e: any) {
        this.error = e.message
        throw e
      }
    },

    async uploadAttachment(journalId: number, file: File) {
      this.error = ''
      try {
        const formData = new FormData()
        formData.append('file', file)
        
        const res = await secureApiCall(`${API_BASE_URL}/journal/${journalId}/attachment`, {
          method: 'POST',
          body: formData,
        })
        
        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.message || res.statusText)
        }
        
        return await res.json()
      } catch (e: any) {
        this.error = e.message
        throw e
      }
    },

    async deleteAttachment(attachmentId: number) {
      this.error = ''
      try {
        await secureApiCall(`${API_BASE_URL}/journal/attachment/${attachmentId}`, {
          method: 'DELETE',
        })
      } catch (e: any) {
        this.error = e.message
        throw e
      }
    },
  },
})
