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

    /** liste des userId dont l’Excel a déjà été importé */
    importedStaffIds: [] as string[],

    /** toutes les entrées agrégées pour preview global */
    allEntries: [] as ScheduleEntry[],

    /** URLs blob pour télécharger l’Excel importé par staffId */
    downloadUrls: {} as Record<string, string>,

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
      this.importedStaffIds = []
      this.allEntries = []
      this.downloadUrls = {}
    },

    /**
     * 4. Importer l’Excel pour un éducateur (persist partiel)
     */
    async importForStaff(file: File, staffId: string) {
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
          `${API}/planning/semesters/${this.selectedSemester.id}/generate/${staffId}`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${auth.token}` },
            body: form,
          }
        )
        if (!res.ok) throw new Error(await res.text())

        // on marque cet éducateur comme "déjà importé"
        if (!this.importedStaffIds.includes(staffId)) {
          this.importedStaffIds.push(staffId)
        }
      } catch (err: any) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    /**
     * 5. Télécharger l’Excel déjà importé pour un éducateur
     */
    async downloadForStaff(staffId: string) {
      if (!this.selectedSemester) {
        this.error = 'Aucun semestre sélectionné'
        return
      }
      this.loading = true
      this.error = null
      const auth = useAuthStore()
      try {
        const res = await fetch(
          `${API}/planning/semesters/${this.selectedSemester.id}/download/${staffId}`,
          {
            headers: { Authorization: `Bearer ${auth.token}` },
          }
        )
        if (!res.ok) throw new Error(await res.text())
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        this.downloadUrls = {
          ...this.downloadUrls,
          [staffId]: url,
        }
      } catch (err: any) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    /**
     * 6. Prévisualiser l’ensemble des imports déjà effectués
     */
    async fetchAggregated() {
      if (!this.selectedSemester) {
        this.error = 'Aucun semestre sélectionné'
        return
      }
      this.loading = true
      this.error = null
      this.allEntries = []
      const auth = useAuthStore()
      try {
        const res = await fetch(
          `${API}/planning/semesters/${this.selectedSemester.id}/overview`,
          {
            headers: { Authorization: `Bearer ${auth.token}` },
          }
        )
        if (!res.ok) throw new Error(await res.text())
        this.allEntries = await res.json()
      } catch (err: any) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    /**
     * 7. Valider (soumettre) le planning final
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
        // on réinitialise tout
        this.importedStaffIds = []
        this.allEntries = []
        this.downloadUrls = {}
      } catch (err: any) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    /** 8. Remise à zéro des erreurs */
    clearError() {
      this.error = null
    },
  },
})
