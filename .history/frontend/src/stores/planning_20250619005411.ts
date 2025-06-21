// src/stores/planning.ts
import { defineStore } from 'pinia'
import { useAuthStore } from './auth'

/** URL racine de l’API Nest */
const API = import.meta.env.VITE_NEST_API_URL ?? ''

export interface Child {
  id: number
  firstName: string
  lastName: string
}

export interface ScheduleEntry {
  id: string
  staffId: string
  semesterId: string
  dayOfWeek: number
  startTime: string  // ISO
  endTime: string    // ISO
  activity: string
  children: Child[]
}

export interface Semester {
  id: string
  name: string
  startDate: string  // ISO
  endDate: string    // ISO
}

export interface StaffMember {
  id: number
  firstName: string
  lastName: string
  userId: string
}

export const usePlanningStore = defineStore('planning', {
  state: () => ({
    semesters: [] as Semester[],
    staffList: [] as StaffMember[],
    selectedSemester: null as Semester | null,

    /** Aperçu des créneaux (preview global) */
    previewEntries: [] as ScheduleEntry[],

    /** URL blob pour télécharger l’Excel importé */
    downloadUrl: '' as string,

    loading: false,
    error: null as string | null,
  }),

  actions: {
    /** 1. Charger la liste des semestres */
    async fetchSemesters() {
      this.loading = true
      this.error = null
      const auth = useAuthStore()
      try {
        const res = await fetch(`${API}/planning/semesters`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        })
        if (!res.ok) throw new Error(await res.text())
        this.semesters = await res.json()
      } catch (err: any) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    /** 2. Charger la liste des éducateurs */
    async fetchStaffList() {
      this.loading = true
      this.error = null
      const auth = useAuthStore()
      try {
        const res = await fetch(`${API}/staff`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        })
        if (!res.ok) throw new Error(await res.text())
        const data = (await res.json()) as any[]
        this.staffList = data.map(s => ({
          id: s.id,
          firstName: s.firstName,
          lastName: s.lastName,
          userId: s.userId,
        }))
      } catch (err: any) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    /** 3. Sélectionner un semestre et réinitialiser l’état */
    selectSemester(id: string) {
      this.selectedSemester = this.semesters.find(s => s.id === id) || null
      this.previewEntries = []
      this.downloadUrl = ''
      // on ne vide plus staffList ici (on garde la liste chargée)
    },

  

    /**
     * 5. Import définitif global
     *    POST /planning/semesters/:id/import
     */
    async importAll(file: File) {
      if (!this.selectedSemester) {
        this.error = 'Aucun semestre sélectionné'
        return
      }
      this.loading = true
      this.error = null
      const auth = useAuthStore()
      try {
        const form = new FormData()
        form.append('file', file)
        const res = await fetch(
          `${API}/planning/semesters/${this.selectedSemester.id}/import`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${auth.token}` },
            body: form,
          }
        )
        if (!res.ok) throw new Error(await res.text())
        // recharge l’aperçu global après import
        await this.fetchOverview()
      } catch (err: any) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    /**
     * 6. Récupérer l’aperçu agrégé existant
     *    GET /planning/semesters/:id/overview
     */
    async fetchOverview() {
      if (!this.selectedSemester) {
        this.error = 'Aucun semestre sélectionné'
        return
      }
      this.loading = true
      this.error = null
      this.previewEntries = []
      const auth = useAuthStore()
      try {
        const res = await fetch(
          `${API}/planning/semesters/${this.selectedSemester.id}/overview`,
          {
            headers: { Authorization: `Bearer ${auth.token}` },
          }
        )
        if (!res.ok) throw new Error(await res.text())
        this.previewEntries = await res.json()
      } catch (err: any) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    /**
     * 7. Télécharger l’Excel importé global
     *    GET /planning/semesters/:id/download
     */
    async downloadAll() {
      if (!this.selectedSemester) {
        this.error = 'Aucun semestre sélectionné'
        return
      }
      this.loading = true
      this.error = null
      const auth = useAuthStore()
      try {
        const res = await fetch(
          `${API}/planning/semesters/${this.selectedSemester.id}/download`,
          {
            headers: { Authorization: `Bearer ${auth.token}` },
          }
        )
        if (res.status === 404) {
          // aucun fichier pour ce semestre
          this.downloadUrl = ''
          return
        }
        if (!res.ok) throw new Error(await res.text())
        const blob = await res.blob()
        this.downloadUrl = URL.createObjectURL(blob)
      } catch (err: any) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    /**
     * 8. Valider (soumettre) le planning final
     *    POST /planning/semesters/:id/submit
     */
    async submitPlanning() {
      if (!this.selectedSemester) {
        this.error = 'Aucun semestre sélectionné'
        return
      }
      this.loading = true
      this.error = null
      const auth = useAuthStore()
      try {
        const res = await fetch(
          `${API}/planning/semesters/${this.selectedSemester.id}/submit`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${auth.token}` },
          }
        )
        if (!res.ok) throw new Error(await res.text())
        // on vide l’aperçu et l’URL de téléchargement
        this.previewEntries = []
        this.downloadUrl = ''
        console.log('Overview size', this.previewEntries.length)
      } catch (err: any) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    /** 9. Remise à zéro des erreurs */
    clearError() {
      this.error = null
    },

    /** 10. Annuler / réactiver un créneau */
    async cancelEntry(entryId: string, cancel = true) {
      this.loading = true
      this.error = null
      const auth = useAuthStore()
      try {
        const res = await fetch(`${API}/planning/entries/${entryId}/cancel`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${auth.token}`,
          },
          body: JSON.stringify({ cancel }),
        })
        if (!res.ok) throw new Error(await res.text())
        // mettre à jour local previewEntries si présent
        const updated = await res.json()
        const idx = this.previewEntries.findIndex(e => e.id === entryId)
        if (idx !== -1) this.previewEntries[idx].activity = updated.activity
      } catch (err: any) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    /** 11. Réaffecter enfants d’un créneau vers un autre */
    async reassignChildren(sourceId: string, targetId: string) {
      this.loading = true
      this.error = null
      const auth = useAuthStore()
      try {
        const res = await fetch(`${API}/planning/entries/${sourceId}/reassign`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${auth.token}`,
          },
          body: JSON.stringify({ targetEntryId: targetId }),
        })
        if (!res.ok) throw new Error(await res.text())
        await res.json()
        // rafraîchit overview
        await this.fetchOverview()
      } catch (err: any) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },
  },
})
