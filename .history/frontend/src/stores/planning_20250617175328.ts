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

    /** Liste des userId déjà importés pour le semestre courant */
    importedStaffIds: [] as string[],

    /** Tous les créneaux agrégés pour le semestre courant */
    allEntries: [] as ScheduleEntry[],

    loading: false,
    error: null as string | null,
  }),

  actions: {
    /** 1. Charge la liste des semestres */
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

    /** 2. Charge la liste des membres du staff */
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

    /** Sélectionne un semestre et réinitialise l’aperçu */
    selectSemester(id: string) {
      this.selectedSemester = this.semesters.find(s => s.id === id) || null
      this.importedStaffIds = []
      this.allEntries = []
    },

    /**
     * 3. Importer l’Excel pour un éducateur (persist partiel)
     * @param file    Fichier Excel
     * @param staffId ID du staff sélectionné
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
        // marquer ce staff comme importé
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
     * 4. Prévisualiser l’ensemble des imports déjà effectués
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
     * 5. Valider (soumettre) le planning final pour le semestre
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
        // reset au besoin
        this.importedStaffIds = []
        this.allEntries = []
      } catch (err: any) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    /** Remise à zéro des erreurs */
    clearError() {
      this.error = null
    },
  },
})
