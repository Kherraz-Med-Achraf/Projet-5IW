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
    entries        : [] as Journal[], // ajout pour Home.vue

    selectedYearId : null as number | null,
    currentChildId : null as number | null,

    childName      : '' as string,
    educatorName   : '' as string,

    loading: false,
    error  : '' as string,
    
    // Suivre l'utilisateur connecté pour détecter les changements
    currentUserId: null as string | null,
  }),

  actions: {
    /* --------------------------------------------------------------------- */
    /*                           Reset & Cache Management                    */
    /* --------------------------------------------------------------------- */
    resetStore() {
      // Vider toutes les données du store lors de la déconnexion
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
      // Vérifier si l'utilisateur a changé et vider le cache si nécessaire
      const authStore = useAuthStore()
      const newUserId = authStore.user?.id || null
      
      if (this.currentUserId !== newUserId) {
        // L'utilisateur a changé (connexion/déconnexion/changement de compte)
        this.resetStore()
        this.currentUserId = newUserId
        
        // Si un nouvel utilisateur est connecté, forcer le rechargement des données
        if (newUserId) {
          // Reset effectué, les données seront rechargées au prochain fetchReferentChildren
          console.log('👥 Changement d\'utilisateur détecté, cache vidé')
        }
      }
    },

    /* --------------------------------------------------------------------- */
    /*            ✨ IA – suggestion d'amélioration de mission ✨              */
    /* --------------------------------------------------------------------- */
    async proposeMissionImprovement(prompt: string, type: 'mission' | 'observation' | 'progression' | 'blog' = 'mission'): Promise<string> {
      const data = await secureJsonCall(`${API_BASE_URL}/ai/mission-improve`, {
        method: 'POST',
        body: JSON.stringify({ prompt, type }),
      })
      return (data.suggestion ?? data.content ?? '').toString()
    },

    /* --------------------------------------------------------------------- */
    /*                               Children                                */
    /* --------------------------------------------------------------------- */
    async fetchReferentChildren() {
      // Vérifier si l'utilisateur a changé et vider le cache si nécessaire
      this.checkUserChange()
      
      this.loading = true
      this.error   = ''
      try {
        const authStore = useAuthStore()
        const userRole = authStore.user?.role
        
        let url = `${API_BASE_URL}/children`
        
        // SÉCURITÉ CRITIQUE: Différentes routes selon le rôle
        if (userRole === 'CHILD') {
          // Les enfants ne peuvent voir que leurs propres données
          url = `${API_BASE_URL}/children/me`
        } else if (userRole === 'PARENT') {
          // Les parents voient leurs enfants
          url = `${API_BASE_URL}/children`
        } else if (['STAFF', 'TEACHER', 'SERVICE_MANAGER', 'SECRETARY', 'DIRECTOR', 'ADMIN'].includes(userRole || '')) {
          // Le personnel voit les enfants référents
          url = `${API_BASE_URL}/children/referents`
        } else {
          // Rôle non autorisé
          throw new Error('Accès non autorisé : rôle inconnu ou non autorisé')
        }

        const data = await secureJsonCall(url)
        
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
        this.academicYears = await secureJsonCall(`${API_BASE_URL}/academic-year`)
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
        const url = `${API_BASE_URL}/journal/child/${childId}?yearId=${yearId}`
        this.journals = await secureJsonCall(url)
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

    /* --------------------------------------------------------------------- */
    /*                             Pièces jointes                            */
    /* --------------------------------------------------------------------- */
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
